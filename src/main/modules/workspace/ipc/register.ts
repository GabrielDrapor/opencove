import { execFile } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { promisify } from 'node:util'
import { clipboard, dialog, ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../../../shared/constants/ipc'
import type {
  CopyWorkspacePathInput,
  EnsureDirectoryInput,
  ListWorkspacePathOpenersResult,
  OpenWorkspacePathInput,
  WorkspaceDirectory,
  WorkspacePathOpener,
  WorkspacePathOpenerId,
} from '../../../../shared/types/api'
import type { IpcRegistrationDisposable } from '../../../ipc/types'
import type { ApprovedWorkspaceStore } from '../ApprovedWorkspaceStore'
import {
  normalizeCopyWorkspacePathPayload,
  normalizeEnsureDirectoryPayload,
  normalizeOpenWorkspacePathPayload,
} from './validate'

const execFileAsync = promisify(execFile)

type MacWorkspacePathOpener = WorkspacePathOpener & {
  applications?: readonly string[]
}

const MAC_PATH_OPENERS: readonly MacWorkspacePathOpener[] = [
  { id: 'vscode', label: 'VS Code', applications: ['Visual Studio Code'] },
  { id: 'cursor', label: 'Cursor', applications: ['Cursor'] },
  { id: 'windsurf', label: 'Windsurf', applications: ['Windsurf'] },
  { id: 'zed', label: 'Zed', applications: ['Zed'] },
  { id: 'antigravity', label: 'Antigravity', applications: ['Antigravity'] },
  {
    id: 'vscode-insiders',
    label: 'VS Code Insiders',
    applications: ['Visual Studio Code - Insiders'],
  },
  { id: 'vscodium', label: 'VSCodium', applications: ['VSCodium'] },
  {
    id: 'intellij-idea',
    label: 'IntelliJ IDEA',
    applications: ['IntelliJ IDEA', 'IntelliJ IDEA CE'],
  },
  { id: 'fleet', label: 'Fleet', applications: ['Fleet'] },
  { id: 'android-studio', label: 'Android Studio', applications: ['Android Studio'] },
  { id: 'xcode', label: 'Xcode', applications: ['Xcode'] },
  { id: 'pycharm', label: 'PyCharm', applications: ['PyCharm', 'PyCharm CE'] },
  { id: 'webstorm', label: 'WebStorm', applications: ['WebStorm'] },
  { id: 'goland', label: 'GoLand', applications: ['GoLand'] },
  { id: 'clion', label: 'CLion', applications: ['CLion'] },
  { id: 'phpstorm', label: 'PhpStorm', applications: ['PhpStorm'] },
  { id: 'rubymine', label: 'RubyMine', applications: ['RubyMine'] },
  { id: 'datagrip', label: 'DataGrip', applications: ['DataGrip'] },
  { id: 'rider', label: 'Rider', applications: ['Rider'] },
  { id: 'sublime-text', label: 'Sublime Text', applications: ['Sublime Text'] },
  { id: 'nova', label: 'Nova', applications: ['Nova'] },
  { id: 'bbedit', label: 'BBEdit', applications: ['BBEdit'] },
  { id: 'textmate', label: 'TextMate', applications: ['TextMate'] },
  { id: 'coteditor', label: 'CotEditor', applications: ['CotEditor'] },
  { id: 'finder', label: 'Finder' },
  { id: 'terminal', label: 'Terminal', applications: ['Terminal'] },
  { id: 'iterm', label: 'iTerm', applications: ['iTerm'] },
  { id: 'warp', label: 'Warp', applications: ['Warp'] },
  { id: 'ghostty', label: 'Ghostty', applications: ['Ghostty'] },
]

async function isMacApplicationAvailable(application: string): Promise<boolean> {
  try {
    await execFileAsync('open', ['-Ra', application])
    return true
  } catch {
    return false
  }
}

async function resolveMacApplication(candidate: MacWorkspacePathOpener): Promise<string | null> {
  if (!candidate.applications || candidate.applications.length === 0) {
    return null
  }

  const availability = await Promise.all(
    candidate.applications.map(async application => ({
      application,
      available: await isMacApplicationAvailable(application),
    })),
  )

  return availability.find(result => result.available)?.application ?? null
}

async function listAvailableWorkspacePathOpeners(): Promise<WorkspacePathOpener[]> {
  if (process.platform !== 'darwin') {
    return []
  }

  const openerResults = await Promise.all(
    MAC_PATH_OPENERS.map(async candidate => {
      if (!candidate.applications) {
        return { id: candidate.id, label: candidate.label }
      }

      return (await resolveMacApplication(candidate))
        ? { id: candidate.id, label: candidate.label }
        : null
    }),
  )

  return openerResults.filter((candidate): candidate is WorkspacePathOpener => candidate !== null)
}

async function openWorkspacePath(path: string, openerId: WorkspacePathOpenerId): Promise<void> {
  if (openerId === 'finder') {
    const error = await shell.openPath(path)
    if (error.trim().length > 0) {
      throw new Error(error)
    }

    return
  }

  if (process.platform !== 'darwin') {
    throw new Error('Opening paths in external apps is only supported on macOS right now')
  }

  const opener = MAC_PATH_OPENERS.find(candidate => candidate.id === openerId) ?? null
  if (!opener?.applications) {
    throw new Error('Unsupported path opener')
  }

  const application = await resolveMacApplication(opener)
  if (!application) {
    throw new Error('Unsupported path opener')
  }

  await execFileAsync('open', ['-a', application, path])
}

export function registerWorkspaceIpcHandlers(
  approvedWorkspaces: ApprovedWorkspaceStore,
): IpcRegistrationDisposable {
  ipcMain.handle(
    IPC_CHANNELS.workspaceSelectDirectory,
    async (): Promise<WorkspaceDirectory | null> => {
      if (process.env.NODE_ENV === 'test' && process.env.COVE_TEST_WORKSPACE) {
        const testWorkspacePath = resolve(process.env.COVE_TEST_WORKSPACE)
        await approvedWorkspaces.registerRoot(testWorkspacePath)
        return {
          id: crypto.randomUUID(),
          name: basename(testWorkspacePath),
          path: testWorkspacePath,
        }
      }

      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const workspacePath = result.filePaths[0]
      const pathChunks = workspacePath.split(/[\\/]/)
      const workspaceName = pathChunks[pathChunks.length - 1] || workspacePath

      await approvedWorkspaces.registerRoot(workspacePath)

      return {
        id: crypto.randomUUID(),
        name: workspaceName,
        path: workspacePath,
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.workspaceEnsureDirectory,
    async (_event, payload: EnsureDirectoryInput) => {
      const normalized = normalizeEnsureDirectoryPayload(payload)

      const isApproved = await approvedWorkspaces.isPathApproved(normalized.path)
      if (!isApproved) {
        throw new Error('workspace:ensure-directory path is outside approved workspaces')
      }

      await mkdir(normalized.path, { recursive: true })
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.workspaceCopyPath,
    async (_event, payload: CopyWorkspacePathInput) => {
      const normalized = normalizeCopyWorkspacePathPayload(payload)

      const isApproved = await approvedWorkspaces.isPathApproved(normalized.path)
      if (!isApproved) {
        throw new Error('workspace:copy-path path is outside approved workspaces')
      }

      clipboard.writeText(normalized.path)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.workspaceListPathOpeners,
    async (): Promise<ListWorkspacePathOpenersResult> => ({
      openers: await listAvailableWorkspacePathOpeners(),
    }),
  )

  ipcMain.handle(
    IPC_CHANNELS.workspaceOpenPath,
    async (_event, payload: OpenWorkspacePathInput) => {
      const normalized = normalizeOpenWorkspacePathPayload(payload)

      const isApproved = await approvedWorkspaces.isPathApproved(normalized.path)
      if (!isApproved) {
        throw new Error('workspace:open-path path is outside approved workspaces')
      }

      await openWorkspacePath(normalized.path, normalized.openerId)
    },
  )

  return {
    dispose: () => {
      ipcMain.removeHandler(IPC_CHANNELS.workspaceSelectDirectory)
      ipcMain.removeHandler(IPC_CHANNELS.workspaceEnsureDirectory)
      ipcMain.removeHandler(IPC_CHANNELS.workspaceCopyPath)
      ipcMain.removeHandler(IPC_CHANNELS.workspaceListPathOpeners)
      ipcMain.removeHandler(IPC_CHANNELS.workspaceOpenPath)
    },
  }
}
