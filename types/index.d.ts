export type RunStatus = 'idle' | 'compiling' | 'running' | 'exited' | 'failed'

export type RunTarget = { build?: string[]; run: string[] }

export type RunConfig = Record<string, RunTarget>

declare module 'claude-code' {
  interface PluginState {
    'run-bar': {
      config: Shaped<RunConfig | null>
      status: Shaped<RunStatus>
      target: Shaped<string>
      detail: Shaped<string>
      frame: Shaped<number>
    }
  }
}
