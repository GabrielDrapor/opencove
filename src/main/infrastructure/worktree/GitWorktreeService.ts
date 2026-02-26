import { spawn } from 'node:child_process'
import { mkdir, readdir, realpath, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve } from 'node:path'

const DEFAULT_GIT_TIMEOUT_MS = 30_000

interface GitCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function runGit(
  args: string[],
  cwd: string,
  options: { timeoutMs?: number } = {},
): Promise<GitCommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_GIT_TIMEOUT_MS

  return await new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })

    child.on('error', error => {
      clearTimeout(timeoutHandle)
      reject(error)
    })

    child.on('close', exitCode => {
      clearTimeout(timeoutHandle)

      if (timedOut) {
        reject(new Error('git command timed out'))
        return
      }

      resolvePromise({
        exitCode: typeof exitCode === 'number' ? exitCode : 1,
        stdout,
        stderr,
      })
    })
  })
}

async function ensureGitRepo(repoPath: string): Promise<void> {
  const result = await runGit(['rev-parse', '--is-inside-work-tree'], repoPath)
  const isRepo = result.exitCode === 0 && result.stdout.trim() === 'true'

  if (!isRepo) {
    const message = normalizeOptionalText(result.stderr) ?? 'Not a git repository'
    throw new Error(message)
  }
}

async function toCanonicalPath(pathValue: string): Promise<string> {
  const normalized = resolve(pathValue)

  try {
    return await realpath(normalized)
  } catch {
    return normalized
  }
}

async function toCanonicalPathEvenIfMissing(pathValue: string): Promise<string> {
  const normalized = resolve(pathValue)

  try {
    return await realpath(normalized)
  } catch {
    try {
      const parent = await realpath(dirname(normalized))
      return resolve(parent, basename(normalized))
    } catch {
      return normalized
    }
  }
}

export interface GitWorktreeEntry {
  path: string
  head: string | null
  branch: string | null
}

export async function listGitBranches({
  repoPath,
}: {
  repoPath: string
}): Promise<{ branches: string[]; current: string | null }> {
  const normalizedRepoPath = repoPath.trim()
  if (normalizedRepoPath.length === 0) {
    throw new Error('listGitBranches requires repoPath')
  }

  if (!isAbsolute(normalizedRepoPath)) {
    throw new Error('listGitBranches requires an absolute repoPath')
  }

  await ensureGitRepo(normalizedRepoPath)

  const currentResult = await runGit(['branch', '--show-current'], normalizedRepoPath)
  const current = currentResult.exitCode === 0 ? normalizeOptionalText(currentResult.stdout) : null

  const result = await runGit(['branch', '--format=%(refname:short)'], normalizedRepoPath)
  if (result.exitCode !== 0) {
    throw new Error(normalizeOptionalText(result.stderr) ?? 'git branch list failed')
  }

  const branches = result.stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)

  return {
    branches: [...new Set(branches)],
    current,
  }
}

export async function listGitWorktrees({
  repoPath,
}: {
  repoPath: string
}): Promise<{ worktrees: GitWorktreeEntry[] }> {
  const normalizedRepoPath = repoPath.trim()
  if (normalizedRepoPath.length === 0) {
    throw new Error('listGitWorktrees requires repoPath')
  }

  if (!isAbsolute(normalizedRepoPath)) {
    throw new Error('listGitWorktrees requires an absolute repoPath')
  }

  await ensureGitRepo(normalizedRepoPath)

  const result = await runGit(['worktree', 'list', '--porcelain'], normalizedRepoPath)
  if (result.exitCode !== 0) {
    throw new Error(normalizeOptionalText(result.stderr) ?? 'git worktree list failed')
  }

  const worktrees: GitWorktreeEntry[] = []
  let current: GitWorktreeEntry | null = null

  const flush = () => {
    if (!current) {
      return
    }

    if (current.path.trim().length === 0) {
      current = null
      return
    }

    worktrees.push(current)
    current = null
  }

  result.stdout.split(/\r?\n/).forEach(line => {
    if (line.trim().length === 0) {
      flush()
      return
    }

    if (line.startsWith('worktree ')) {
      flush()
      current = {
        path: line.slice('worktree '.length).trim(),
        head: null,
        branch: null,
      }
      return
    }

    if (!current) {
      return
    }

    if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim()
      return
    }

    if (line.startsWith('branch ')) {
      const ref = line.slice('branch '.length).trim()
      current.branch = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref
      return
    }

    if (line.trim() === 'detached') {
      current.branch = null
    }
  })

  flush()

  const normalizedWorktrees = await Promise.all(
    worktrees.map(async entry => ({
      ...entry,
      path: await toCanonicalPath(entry.path),
    })),
  )

  return {
    worktrees: normalizedWorktrees,
  }
}

async function isDirectoryEmpty(path: string): Promise<boolean> {
  try {
    const stats = await stat(path)
    if (!stats.isDirectory()) {
      return false
    }

    const entries = await readdir(path)
    return entries.length === 0
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const record = error as { code?: unknown }
      if (record.code === 'ENOENT') {
        return true
      }
    }

    throw error
  }
}

export type CreateGitWorktreeBranchMode =
  | { kind: 'new'; name: string; startPoint: string }
  | { kind: 'existing'; name: string }

export interface CreateGitWorktreeInput {
  repoPath: string
  worktreePath: string
  branchMode: CreateGitWorktreeBranchMode
}

export interface RemoveGitWorktreeInput {
  repoPath: string
  worktreePath: string
  force?: boolean
}

export async function createGitWorktree(input: CreateGitWorktreeInput): Promise<GitWorktreeEntry> {
  const normalizedRepoPath = input.repoPath.trim()
  const normalizedWorktreePath = input.worktreePath.trim()

  if (normalizedRepoPath.length === 0) {
    throw new Error('createGitWorktree requires repoPath')
  }

  if (!isAbsolute(normalizedRepoPath)) {
    throw new Error('createGitWorktree requires an absolute repoPath')
  }

  if (normalizedWorktreePath.length === 0) {
    throw new Error('createGitWorktree requires worktreePath')
  }

  if (!isAbsolute(normalizedWorktreePath)) {
    throw new Error('createGitWorktree requires an absolute worktreePath')
  }

  await ensureGitRepo(normalizedRepoPath)

  const resolvedWorktreePath = resolve(normalizedWorktreePath)

  const worktreesSnapshot = await listGitWorktrees({ repoPath: normalizedRepoPath })

  await mkdir(dirname(resolvedWorktreePath), { recursive: true })
  const comparableWorktreePath = await toCanonicalPathEvenIfMissing(resolvedWorktreePath)

  const alreadyUsedPath = worktreesSnapshot.worktrees.some(
    entry => entry.path === comparableWorktreePath,
  )
  if (alreadyUsedPath) {
    throw new Error('Worktree path is already registered in git worktrees')
  }

  const branchName = input.branchMode.name.trim()
  if (branchName.length === 0) {
    throw new Error('Branch name cannot be empty')
  }

  const branchesSnapshot = await listGitBranches({ repoPath: normalizedRepoPath })
  const branchExists = branchesSnapshot.branches.includes(branchName)
  if (input.branchMode.kind === 'new' && branchExists) {
    throw new Error(`Branch "${branchName}" already exists`)
  }

  if (input.branchMode.kind === 'existing' && !branchExists) {
    throw new Error(`Branch "${branchName}" does not exist`)
  }

  const alreadyCheckedOut = worktreesSnapshot.worktrees.find(entry => entry.branch === branchName)
  if (alreadyCheckedOut) {
    throw new Error(`Branch "${branchName}" is already checked out at ${alreadyCheckedOut.path}`)
  }

  const empty = await isDirectoryEmpty(comparableWorktreePath)
  if (!empty) {
    throw new Error('Worktree directory already exists and is not empty')
  }

  const args =
    input.branchMode.kind === 'new'
      ? ['worktree', 'add', '-b', branchName, comparableWorktreePath, input.branchMode.startPoint]
      : ['worktree', 'add', comparableWorktreePath, branchName]

  const result = await runGit(args, normalizedRepoPath)
  if (result.exitCode !== 0) {
    throw new Error(normalizeOptionalText(result.stderr) ?? 'git worktree add failed')
  }

  return {
    path: comparableWorktreePath,
    head: null,
    branch: branchName,
  }
}

export async function removeGitWorktree(input: RemoveGitWorktreeInput): Promise<void> {
  const normalizedRepoPath = input.repoPath.trim()
  const normalizedWorktreePath = input.worktreePath.trim()

  if (normalizedRepoPath.length === 0) {
    throw new Error('removeGitWorktree requires repoPath')
  }

  if (!isAbsolute(normalizedRepoPath)) {
    throw new Error('removeGitWorktree requires an absolute repoPath')
  }

  if (normalizedWorktreePath.length === 0) {
    throw new Error('removeGitWorktree requires worktreePath')
  }

  if (!isAbsolute(normalizedWorktreePath)) {
    throw new Error('removeGitWorktree requires an absolute worktreePath')
  }

  await ensureGitRepo(normalizedRepoPath)

  const comparableRepoPath = await toCanonicalPath(normalizedRepoPath)
  const comparableWorktreePath = await toCanonicalPathEvenIfMissing(normalizedWorktreePath)

  if (comparableWorktreePath === comparableRepoPath) {
    throw new Error('Cannot remove the main worktree')
  }

  const worktreesSnapshot = await listGitWorktrees({ repoPath: normalizedRepoPath })
  const targetWorktree =
    worktreesSnapshot.worktrees.find(entry => entry.path === comparableWorktreePath) ?? null

  if (!targetWorktree) {
    throw new Error('Worktree path is not registered in git worktrees')
  }

  const args = ['worktree', 'remove']
  if (input.force) {
    args.push('--force')
  }
  args.push(targetWorktree.path)

  const result = await runGit(args, normalizedRepoPath)
  if (result.exitCode !== 0) {
    throw new Error(normalizeOptionalText(result.stderr) ?? 'git worktree remove failed')
  }
}
