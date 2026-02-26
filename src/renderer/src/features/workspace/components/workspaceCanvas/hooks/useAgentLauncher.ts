import { useCallback, useMemo, useState } from 'react'
import type { Node } from '@xyflow/react'
import { resolveAgentModel, type AgentSettings } from '../../../../settings/agentConfig'
import type { AgentNodeData, Point, TerminalNodeData, WorkspaceSpaceState } from '../../../types'
import { normalizeDirectoryPath, toErrorMessage, toSuggestedWorktreePath } from '../helpers'
import type { AgentLauncherState, ContextMenuState, CreateNodeInput } from '../types'

interface UseAgentLauncherParams {
  agentSettings: AgentSettings
  workspacePath: string
  activeSpaceId: string | null
  spacesRef: React.MutableRefObject<WorkspaceSpaceState[]>
  onSpacesChange: (spaces: WorkspaceSpaceState[]) => void
  contextMenu: ContextMenuState | null
  setContextMenu: (next: ContextMenuState | null) => void
  createNodeForSession: (input: CreateNodeInput) => Promise<Node<TerminalNodeData> | null>
  buildAgentNodeTitle: (
    provider: AgentNodeData['provider'],
    effectiveModel: string | null,
  ) => string
}

export function useWorkspaceCanvasAgentLauncher({
  agentSettings,
  workspacePath,
  activeSpaceId,
  spacesRef,
  onSpacesChange,
  contextMenu,
  setContextMenu,
  createNodeForSession,
  buildAgentNodeTitle,
}: UseAgentLauncherParams): {
  agentLauncher: AgentLauncherState | null
  setAgentLauncher: React.Dispatch<React.SetStateAction<AgentLauncherState | null>>
  openAgentLauncher: () => void
  closeAgentLauncher: () => void
  launchAgentNode: () => Promise<void>
  launcherModelOptions: string[]
} {
  const [agentLauncher, setAgentLauncher] = useState<AgentLauncherState | null>(null)

  const openAgentLauncher = useCallback(() => {
    if (!contextMenu || contextMenu.kind !== 'pane') {
      return
    }

    const anchor: Point = {
      x: contextMenu.flowX,
      y: contextMenu.flowY,
    }

    const initialProvider = agentSettings.defaultProvider
    const defaultModel = resolveAgentModel(agentSettings, initialProvider) ?? ''

    setContextMenu(null)
    setAgentLauncher({
      anchor,
      provider: initialProvider,
      prompt: '',
      model: defaultModel,
      directoryMode: 'workspace',
      customDirectory: toSuggestedWorktreePath(workspacePath, initialProvider),
      shouldCreateDirectory: true,
      isLaunching: false,
      error: null,
    })
  }, [agentSettings, contextMenu, setContextMenu, workspacePath])

  const closeAgentLauncher = useCallback(() => {
    setAgentLauncher(prev => {
      if (!prev || prev.isLaunching) {
        return prev
      }

      return null
    })
  }, [])

  const launchAgentNode = useCallback(async () => {
    if (!agentLauncher) {
      return
    }

    const normalizedPrompt = agentLauncher.prompt.trim()
    if (normalizedPrompt.length === 0) {
      setAgentLauncher(prev =>
        prev
          ? {
              ...prev,
              error: '任务提示词不能为空。',
            }
          : prev,
      )
      return
    }

    const normalizedModel = agentLauncher.model.trim()

    const activeSpace = activeSpaceId
      ? (spacesRef.current.find(space => space.id === activeSpaceId) ?? null)
      : null

    const activeSpaceDirectory =
      activeSpace && activeSpace.directoryPath.trim().length > 0
        ? activeSpace.directoryPath
        : workspacePath

    const executionDirectory =
      agentLauncher.directoryMode === 'workspace'
        ? activeSpaceDirectory
        : normalizeDirectoryPath(workspacePath, agentLauncher.customDirectory)

    if (executionDirectory.trim().length === 0) {
      setAgentLauncher(prev =>
        prev
          ? {
              ...prev,
              error: '请填写有效的执行目录。',
            }
          : prev,
      )
      return
    }

    setAgentLauncher(prev =>
      prev
        ? {
            ...prev,
            isLaunching: true,
            error: null,
          }
        : prev,
    )

    try {
      if (agentLauncher.directoryMode === 'custom' && agentLauncher.shouldCreateDirectory) {
        await window.coveApi.workspace.ensureDirectory({ path: executionDirectory })
      }

      const launched = await window.coveApi.agent.launch({
        provider: agentLauncher.provider,
        cwd: executionDirectory,
        prompt: normalizedPrompt,
        mode: 'new',
        model: normalizedModel.length > 0 ? normalizedModel : null,
        cols: 80,
        rows: 24,
      })

      const modelLabel =
        launched.effectiveModel ?? (normalizedModel.length > 0 ? normalizedModel : null)
      const agentData: AgentNodeData = {
        provider: agentLauncher.provider,
        prompt: normalizedPrompt,
        model: normalizedModel.length > 0 ? normalizedModel : null,
        effectiveModel: launched.effectiveModel,
        launchMode: launched.launchMode,
        resumeSessionId: launched.resumeSessionId,
        executionDirectory,
        expectedDirectory: executionDirectory,
        directoryMode: agentLauncher.directoryMode,
        customDirectory:
          agentLauncher.directoryMode === 'custom' ? agentLauncher.customDirectory.trim() : null,
        shouldCreateDirectory: agentLauncher.shouldCreateDirectory,
        taskId: null,
      }

      const created = await createNodeForSession({
        sessionId: launched.sessionId,
        title: buildAgentNodeTitle(agentLauncher.provider, modelLabel),
        anchor: agentLauncher.anchor,
        kind: 'agent',
        agent: agentData,
      })

      if (!created) {
        setAgentLauncher(prev =>
          prev
            ? {
                ...prev,
                isLaunching: false,
                error: '终端窗口无法放置，请先整理画布后重试。',
              }
            : prev,
        )
        return
      }

      if (activeSpace) {
        const targetSpace = activeSpace
        const nextSpaces = spacesRef.current.map(space => {
          const filtered = space.nodeIds.filter(nodeId => nodeId !== created.id)

          if (space.id !== targetSpace.id) {
            return {
              ...space,
              nodeIds: filtered,
            }
          }

          return {
            ...space,
            nodeIds: [...new Set([...filtered, created.id])],
          }
        })

        onSpacesChange(nextSpaces)
      }

      setAgentLauncher(null)
    } catch (error) {
      setAgentLauncher(prev =>
        prev
          ? {
              ...prev,
              isLaunching: false,
              error: `Agent 启动失败：${toErrorMessage(error)}`,
            }
          : prev,
      )
    }
  }, [
    activeSpaceId,
    agentLauncher,
    buildAgentNodeTitle,
    createNodeForSession,
    onSpacesChange,
    spacesRef,
    workspacePath,
  ])

  const launcherModelOptions = useMemo(() => {
    if (!agentLauncher) {
      return []
    }

    const provider = agentLauncher.provider
    const providerOptions = agentSettings.customModelOptionsByProvider[provider] ?? []
    const defaultModel = resolveAgentModel(agentSettings, provider)

    return [
      ...new Set([...providerOptions, defaultModel ?? '', agentLauncher.model].filter(Boolean)),
    ]
  }, [agentLauncher, agentSettings])

  return {
    agentLauncher,
    setAgentLauncher,
    openAgentLauncher,
    closeAgentLauncher,
    launchAgentNode,
    launcherModelOptions,
  }
}
