import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { RunConfig, RunStatus } from '../types'

const CONFIG_PATH = '.claude/run.json'
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const config = atom({ plugin: 'run-bar', key: 'config' } as const, null as RunConfig | null, {
  shape: 'config-1',
})
const status = atom({ plugin: 'run-bar', key: 'status' } as const, 'idle' as RunStatus, {
  shape: 'status-1',
})
const target = atom({ plugin: 'run-bar', key: 'target' } as const, '', { shape: 'target-1' })
const detail = atom({ plugin: 'run-bar', key: 'detail' } as const, '', { shape: 'detail-1' })
const frame = atom({ plugin: 'run-bar', key: 'frame' } as const, 0, { shape: 'frame-1' })

const LABELS: Record<RunStatus, string> = {
  idle: 'Not running',
  compiling: 'Compiling',
  running: 'Running',
  exited: 'Exited',
  failed: 'Failed',
}

let active: ReturnType<EngineInterface['process']['spawn']> | undefined
let isStopped = false

const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

const loadConfig = async ($: EngineInterface) => {
  try {
    const loaded = (await $.fs.exists(CONFIG_PATH))
      ? (JSON.parse(await $.fs.read(CONFIG_PATH)) as RunConfig)
      : null
    await update($, config, () => loaded)
  } catch (error) {
    await update($, config, () => null)
    $.ui.toast(`run-bar: cannot read ${CONFIG_PATH}: ${String(error)}`)
  }
}

const resolveExecutable = async ($: EngineInterface, argv: readonly string[]) => {
  const [executable = '', ...args] = argv
  const isRelativePath = /[\\/]/.test(executable) && !/^([a-zA-Z]:)?[\\/]/.test(executable)
  return isRelativePath ? [`${await $.session.cwd()}/${executable}`, ...args] : [executable, ...args]
}

const follow = async ($: EngineInterface, argv: readonly string[]) => {
  const child = $.process.spawn({ argv: await resolveExecutable($, argv) })
  active = child
  let lastLine = ''
  for await (const { text } of child) {
    const lines = text.trim().split('\n')
    lastLine = lines[lines.length - 1] ?? lastLine
  }
  active = undefined
  const { code } = await child.result
  return { code, lastLine }
}

const finish = async ($: EngineInterface, code: number | null, lastLine: string) => {
  await update($, status, () => (isStopped ? 'idle' : code === 0 ? 'exited' : 'failed'))
  await update($, detail, () => (isStopped || code === 0 ? '' : `exit code ${code}: ${lastLine}`))
}

const run = async ($: EngineInterface, name: string) => {
  const current = await read($, status)
  const chosen = (await read($, config))?.[name]
  if (current === 'compiling' || current === 'running' || chosen === undefined) return
  isStopped = false
  await update($, target, () => name)
  await update($, detail, () => '')
  try {
    if (chosen.build !== undefined) {
      await update($, status, () => 'compiling')
      const spinner = $.clock.every(100, () => void update($, frame, n => (n + 1) % SPINNER.length))
      const built = await follow($, chosen.build).finally(() => spinner.cancel())
      if (isStopped || built.code !== 0) {
        await finish($, built.code, built.lastLine)
        return
      }
    }
    await update($, status, () => 'running')
    const ran = await follow($, chosen.run)
    await finish($, ran.code, ran.lastLine)
  } catch (error) {
    await update($, status, () => 'failed')
    await update($, detail, () => String(error))
  }
}

const stop = async () => {
  isStopped = true
  await active?.return({ code: null, signal: null })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await loadConfig($)
    return started
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if ((e.tool === 'Write' || e.tool === 'Edit') && e.file_path.replaceAll('\\', '/').endsWith(CONFIG_PATH)) {
      await loadConfig($)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const targets = await read($, config)
    if (e.props.hasSurvey || targets === null) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await read($, status)
    const name = await read($, target)
    const note = await read($, detail)
    const spin = current === 'compiling' ? `${SPINNER[await read($, frame)]} ` : ''
    const isBusy = current === 'compiling' || current === 'running'
    const subject = name === '' ? '' : `${capitalize(name)}: `

    return (
      <Box width="100%" justifyContent="flex-end" gap={1}>
        {note !== '' && <Text color="error">{note}</Text>}
        <Text dimColor>
          {spin}
          {subject}
          {LABELS[current]}
        </Text>
        {isBusy ? (
          <Button key="stop" plain label="■ Stop" onPress={() => void stop()} />
        ) : (
          <Box gap={1}>
            {Object.keys(targets).map(key => (
              <Button key={key} plain label={`▶ ${capitalize(key)}`} onPress={() => void run($, key)} />
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
