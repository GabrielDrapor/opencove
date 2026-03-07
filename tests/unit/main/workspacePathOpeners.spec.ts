import { afterEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc'

function createIpcMainMock() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const ipcMain = {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel)
    }),
  }

  return { handlers, ipcMain }
}

describe('workspace path openers IPC', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('node:child_process')
    vi.doUnmock('electron')
    vi.resetModules()
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
  })

  it('lists installed macOS openers and opens paths with resolved aliases', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    })

    const installedApplications = new Set(['Visual Studio Code', 'Cursor', 'PyCharm CE'])
    const execFile = vi.fn(
      (
        file: string,
        args: string[],
        callback: (error: Error | null, stdout?: string, stderr?: string) => void,
      ) => {
        if (file !== 'open') {
          callback(new Error(`Unexpected command: ${file}`))
          return
        }

        if (args[0] === '-Ra') {
          const application = args[1]
          if (installedApplications.has(application)) {
            callback(null, '', '')
            return
          }

          callback(new Error(`Application not found: ${application}`))
          return
        }

        callback(null, '', '')
      },
    )

    const { handlers, ipcMain } = createIpcMainMock()
    const shellOpenPath = vi.fn(async () => '')

    vi.doMock('node:child_process', () => ({ execFile, default: { execFile } }))
    vi.doMock('electron', () => ({
      ipcMain,
      clipboard: { writeText: vi.fn() },
      dialog: { showOpenDialog: vi.fn() },
      shell: { openPath: shellOpenPath },
    }))

    const store = {
      registerRoot: vi.fn(async () => undefined),
      isPathApproved: vi.fn(async () => true),
    }

    const { registerWorkspaceIpcHandlers } =
      await import('../../../src/main/modules/workspace/ipc/register')

    registerWorkspaceIpcHandlers(store)

    const listHandler = handlers.get(IPC_CHANNELS.workspaceListPathOpeners)
    const openHandler = handlers.get(IPC_CHANNELS.workspaceOpenPath)
    expect(listHandler).toBeTypeOf('function')
    expect(openHandler).toBeTypeOf('function')

    await expect(listHandler?.()).resolves.toEqual({
      openers: [
        { id: 'vscode', label: 'VS Code' },
        { id: 'cursor', label: 'Cursor' },
        { id: 'pycharm', label: 'PyCharm' },
        { id: 'finder', label: 'Finder' },
      ],
    })

    const targetPath = '/tmp/cove-approved-workspace/project'
    await expect(
      openHandler?.(null, { path: targetPath, openerId: 'pycharm' }),
    ).resolves.toBeUndefined()

    expect(store.isPathApproved).toHaveBeenCalledWith(targetPath)
    expect(shellOpenPath).not.toHaveBeenCalled()
    expect(
      execFile.mock.calls.some(
        ([file, args]) =>
          file === 'open' &&
          Array.isArray(args) &&
          args[0] === '-a' &&
          args[1] === 'PyCharm CE' &&
          args[2] === targetPath,
      ),
    ).toBe(true)
  })

  it('accepts the newly supported opener ids during validation', async () => {
    const { normalizeOpenWorkspacePathPayload } =
      await import('../../../src/main/modules/workspace/ipc/validate')

    expect(
      normalizeOpenWorkspacePathPayload({
        path: '/tmp/cove-approved-workspace/project',
        openerId: 'android-studio',
      }),
    ).toEqual({
      path: '/tmp/cove-approved-workspace/project',
      openerId: 'android-studio',
    })

    expect(
      normalizeOpenWorkspacePathPayload({
        path: '/tmp/cove-approved-workspace/project',
        openerId: 'terminal',
      }),
    ).toEqual({
      path: '/tmp/cove-approved-workspace/project',
      openerId: 'terminal',
    })

    expect(() =>
      normalizeOpenWorkspacePathPayload({
        path: '/tmp/cove-approved-workspace/project',
        openerId: 'unknown-app',
      }),
    ).toThrow(/Invalid openerId/)
  })
})
