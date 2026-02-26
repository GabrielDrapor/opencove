import type { IpcRegistrationDisposable } from './types'
import { registerAgentIpcHandlers } from '../modules/agent/ipc/register'
import { registerPtyIpcHandlers } from '../modules/pty/ipc/register'
import { createPtyRuntime } from '../modules/pty/ipc/runtime'
import { registerTaskIpcHandlers } from '../modules/task/ipc/register'
import { registerWorkspaceIpcHandlers } from '../modules/workspace/ipc/register'
import { createApprovedWorkspaceStore } from '../modules/workspace/ApprovedWorkspaceStore'
import { resolve } from 'node:path'
import { registerWorktreeIpcHandlers } from '../modules/worktree/ipc/register'

export type { IpcRegistrationDisposable } from './types'

export function registerIpcHandlers(): IpcRegistrationDisposable {
  const ptyRuntime = createPtyRuntime()
  const approvedWorkspaces = createApprovedWorkspaceStore()

  if (process.env.NODE_ENV === 'test' && process.env.COVE_TEST_WORKSPACE) {
    void approvedWorkspaces.registerRoot(resolve(process.env.COVE_TEST_WORKSPACE))
  }

  const disposables: IpcRegistrationDisposable[] = [
    registerWorkspaceIpcHandlers(approvedWorkspaces),
    registerWorktreeIpcHandlers(approvedWorkspaces),
    registerPtyIpcHandlers(ptyRuntime, approvedWorkspaces),
    registerAgentIpcHandlers(ptyRuntime, approvedWorkspaces),
    registerTaskIpcHandlers(approvedWorkspaces),
  ]

  return {
    dispose: () => {
      for (let index = disposables.length - 1; index >= 0; index -= 1) {
        disposables[index]?.dispose()
      }
    },
  }
}
