import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('git', args, {
    cwd,
    env: process.env,
    maxBuffer: 1024 * 1024,
  })

  return {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
  }
}

async function createTempRepo(): Promise<string> {
  const repoDir = await mkdtemp(join(tmpdir(), 'cove-worktree-'))

  await runGit(['init'], repoDir)
  await runGit(['config', 'user.email', 'test@example.com'], repoDir)
  await runGit(['config', 'user.name', 'Cove Test'], repoDir)

  await writeFile(join(repoDir, 'README.md'), '# temp\n', 'utf8')
  await runGit(['add', '.'], repoDir)
  await runGit(['commit', '-m', 'init'], repoDir)

  return repoDir
}

describe('GitWorktreeService', () => {
  let repoDir = ''

  afterEach(async () => {
    if (!repoDir) {
      return
    }

    await rm(repoDir, { recursive: true, force: true })
    repoDir = ''
  })

  it('lists worktrees and creates a new worktree under .cove/worktrees', async () => {
    repoDir = await createTempRepo()
    const canonicalRepoDir = await realpath(repoDir)

    const { listGitWorktrees, createGitWorktree } =
      await import('../../../src/main/infrastructure/worktree/GitWorktreeService')

    const initial = await listGitWorktrees({ repoPath: canonicalRepoDir })
    expect(initial.worktrees.some(entry => entry.path === canonicalRepoDir)).toBe(true)

    const worktreesRoot = join(repoDir, '.cove', 'worktrees')
    await mkdir(worktreesRoot, { recursive: true })

    const createdPath = join(worktreesRoot, 'space-a')

    const created = await createGitWorktree({
      repoPath: canonicalRepoDir,
      worktreePath: createdPath,
      branchMode: { kind: 'new', name: 'space-a', startPoint: 'HEAD' },
    })

    expect(created.path).toBe(await realpath(createdPath))
    expect(created.branch).toBe('space-a')

    const after = await listGitWorktrees({ repoPath: canonicalRepoDir })
    expect(after.worktrees.some(entry => entry.path === created.path)).toBe(true)
  })

  it('removes a created worktree from git worktree list', async () => {
    repoDir = await createTempRepo()
    const canonicalRepoDir = await realpath(repoDir)

    const { createGitWorktree, listGitWorktrees, removeGitWorktree } =
      await import('../../../src/main/infrastructure/worktree/GitWorktreeService')

    const worktreesRoot = join(repoDir, '.cove', 'worktrees')
    await mkdir(worktreesRoot, { recursive: true })

    const createdPath = join(worktreesRoot, 'space-remove')
    const created = await createGitWorktree({
      repoPath: canonicalRepoDir,
      worktreePath: createdPath,
      branchMode: { kind: 'new', name: 'space-remove', startPoint: 'HEAD' },
    })

    await removeGitWorktree({
      repoPath: canonicalRepoDir,
      worktreePath: created.path,
      force: false,
    })

    const after = await listGitWorktrees({ repoPath: canonicalRepoDir })
    expect(after.worktrees.some(entry => entry.path === created.path)).toBe(false)
  })

  it('rejects adding a worktree for a branch already checked out elsewhere', async () => {
    repoDir = await createTempRepo()
    const canonicalRepoDir = await realpath(repoDir)

    const { createGitWorktree } =
      await import('../../../src/main/infrastructure/worktree/GitWorktreeService')

    const worktreesRoot = join(repoDir, '.cove', 'worktrees')
    await mkdir(worktreesRoot, { recursive: true })

    await createGitWorktree({
      repoPath: canonicalRepoDir,
      worktreePath: join(worktreesRoot, 'space-b'),
      branchMode: { kind: 'new', name: 'space-b', startPoint: 'HEAD' },
    })

    await expect(
      createGitWorktree({
        repoPath: canonicalRepoDir,
        worktreePath: join(worktreesRoot, 'space-b-2'),
        branchMode: { kind: 'existing', name: 'space-b' },
      }),
    ).rejects.toThrow(/already checked out/i)
  })
})
