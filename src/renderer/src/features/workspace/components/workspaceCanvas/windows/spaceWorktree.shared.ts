import type { CreateGitWorktreeBranchMode, GitWorktreeInfo } from '@shared/types/api'

export type BranchMode = 'new' | 'existing'
export type SpaceWorktreeViewMode = 'home' | 'switch' | 'create' | 'detach' | 'detach-confirm'

export interface BlockingNodesSnapshot {
  agentNodeIds: string[]
  terminalNodeIds: string[]
}

export interface UpdateSpaceDirectoryOptions {
  markNodeDirectoryMismatch?: boolean
}

export type PendingOperation =
  | { kind: 'unbind' }
  | { kind: 'bind'; worktree: GitWorktreeInfo }
  | {
      kind: 'create'
      worktreePath: string
      branchMode: CreateGitWorktreeBranchMode
    }
  | {
      kind: 'detach-remove'
      worktreePath: string
      force: boolean
    }

const WORKTREE_API_UNAVAILABLE_ERROR =
  'Worktree API is unavailable. Please restart Cove and try again.'

type WorktreeApiClient = Window['coveApi']['worktree']

export function getWorktreeApiMethod<K extends keyof WorktreeApiClient>(
  method: K,
): WorktreeApiClient[K] {
  const worktreeApi = (
    window as Window & {
      coveApi?: { worktree?: Partial<WorktreeApiClient> }
    }
  ).coveApi?.worktree

  const candidate = worktreeApi?.[method]
  if (typeof candidate !== 'function') {
    throw new Error(WORKTREE_API_UNAVAILABLE_ERROR)
  }

  return candidate as WorktreeApiClient[K]
}

export function normalizeComparablePath(pathValue: string): string {
  return pathValue.trim().replace(/[\\/]+$/, '')
}

export function resolveWorktreesRoot(workspacePath: string, worktreesRoot: string): string {
  const trimmed = worktreesRoot.trim()
  if (trimmed.length === 0) {
    return `${workspacePath.replace(/[\\/]+$/, '')}/.cove/worktrees`
  }

  if (/^([a-zA-Z]:[\\/]|\/)/.test(trimmed)) {
    return trimmed.replace(/[\\/]+$/, '')
  }

  const base = workspacePath.replace(/[\\/]+$/, '')
  const normalizedCustom = trimmed
    .replace(/^[.][\\/]+/, '')
    .replace(/^[\\/]+/, '')
    .replace(/[\\/]+$/, '')

  return `${base}/${normalizedCustom}`
}

export function resolveWorktreePath(worktreesRoot: string, worktreeName: string): string {
  const base = worktreesRoot.replace(/[\\/]+$/, '')
  const normalizedName = worktreeName.trim().replace(/^[./\\]+/, '')
  return `${base}/${normalizedName}`
}

export function isSafeWorktreeName(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return false
  }

  if (trimmed.includes('..')) {
    return false
  }

  return !/[\\/]/.test(trimmed)
}
