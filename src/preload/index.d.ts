import type {
  AttachTerminalInput,
  CreateGitWorktreeInput,
  CreateGitWorktreeResult,
  DetachTerminalInput,
  EnsureDirectoryInput,
  KillTerminalInput,
  LaunchAgentInput,
  LaunchAgentResult,
  ListGitBranchesInput,
  ListGitBranchesResult,
  ListGitWorktreesInput,
  ListGitWorktreesResult,
  ListAgentModelsInput,
  ListAgentModelsResult,
  ResizeTerminalInput,
  RemoveGitWorktreeInput,
  SnapshotTerminalInput,
  SnapshotTerminalResult,
  SpawnTerminalInput,
  SuggestTaskTitleInput,
  SuggestTaskTitleResult,
  SuggestWorktreeNamesInput,
  SuggestWorktreeNamesResult,
  TerminalDataEvent,
  TerminalDoneEvent,
  TerminalExitEvent,
  WorkspaceDirectory,
  WriteTerminalInput,
} from '../shared/types/api'

type UnsubscribeFn = () => void

export interface CoveApi {
  meta: {
    isTest: boolean
  }
  workspace: {
    selectDirectory: () => Promise<WorkspaceDirectory | null>
    ensureDirectory: (payload: EnsureDirectoryInput) => Promise<void>
  }
  worktree: {
    listBranches: (payload: ListGitBranchesInput) => Promise<ListGitBranchesResult>
    listWorktrees: (payload: ListGitWorktreesInput) => Promise<ListGitWorktreesResult>
    create: (payload: CreateGitWorktreeInput) => Promise<CreateGitWorktreeResult>
    remove: (payload: RemoveGitWorktreeInput) => Promise<void>
    suggestNames: (payload: SuggestWorktreeNamesInput) => Promise<SuggestWorktreeNamesResult>
  }
  pty: {
    spawn: (payload: SpawnTerminalInput) => Promise<{ sessionId: string }>
    write: (payload: WriteTerminalInput) => Promise<void>
    resize: (payload: ResizeTerminalInput) => Promise<void>
    kill: (payload: KillTerminalInput) => Promise<void>
    attach: (payload: AttachTerminalInput) => Promise<void>
    detach: (payload: DetachTerminalInput) => Promise<void>
    snapshot: (payload: SnapshotTerminalInput) => Promise<SnapshotTerminalResult>
    onData: (listener: (event: TerminalDataEvent) => void) => UnsubscribeFn
    onExit: (listener: (event: TerminalExitEvent) => void) => UnsubscribeFn
    onDone: (listener: (event: TerminalDoneEvent) => void) => UnsubscribeFn
  }
  agent: {
    listModels: (payload: ListAgentModelsInput) => Promise<ListAgentModelsResult>
    launch: (payload: LaunchAgentInput) => Promise<LaunchAgentResult>
  }
  task: {
    suggestTitle: (payload: SuggestTaskTitleInput) => Promise<SuggestTaskTitleResult>
  }
}

declare global {
  interface Window {
    coveApi: CoveApi
  }
}
