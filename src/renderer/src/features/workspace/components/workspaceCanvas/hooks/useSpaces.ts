import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Node, ReactFlowInstance } from '@xyflow/react'
import type { TerminalNodeData, WorkspaceSpaceRect, WorkspaceSpaceState } from '../../../types'
import type { ContextMenuState, EmptySelectionPromptState, SpaceVisual } from '../types'
import { isAgentWorking, sanitizeSpaces } from '../helpers'

interface UseWorkspaceCanvasSpacesParams {
  workspaceId: string
  workspacePath: string
  reactFlow: ReactFlowInstance<Node<TerminalNodeData>>
  nodes: Node<TerminalNodeData>[]
  nodesRef: React.MutableRefObject<Node<TerminalNodeData>[]>
  spaces: WorkspaceSpaceState[]
  spacesRef: React.MutableRefObject<WorkspaceSpaceState[]>
  activeSpaceId: string | null
  selectedNodeIds: string[]
  selectedNodeIdsRef: React.MutableRefObject<string[]>
  onSpacesChange: (spaces: WorkspaceSpaceState[]) => void
  onActiveSpaceChange: (spaceId: string | null) => void
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>
  setEmptySelectionPrompt: React.Dispatch<React.SetStateAction<EmptySelectionPromptState | null>>
}

export function useWorkspaceCanvasSpaces({
  workspaceId,
  workspacePath,
  reactFlow,
  nodes,
  nodesRef,
  spaces,
  spacesRef,
  activeSpaceId,
  selectedNodeIds,
  selectedNodeIdsRef,
  onSpacesChange,
  onActiveSpaceChange,
  setContextMenu,
  setEmptySelectionPrompt,
}: UseWorkspaceCanvasSpacesParams): {
  editingSpaceId: string | null
  spaceRenameDraft: string
  setSpaceRenameDraft: React.Dispatch<React.SetStateAction<string>>
  spaceRenameInputRef: React.RefObject<HTMLInputElement>
  startSpaceRename: (spaceId: string) => void
  cancelSpaceRename: () => void
  commitSpaceRename: (spaceId: string) => void
  createSpaceFromSelectedNodes: () => void
  moveSelectionToSpace: (spaceId: string) => void
  removeSelectionFromSpaces: () => void
  spaceVisuals: SpaceVisual[]
  focusSpaceInViewport: (spaceId: string) => void
  focusAllInViewport: () => void
} {
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [spaceRenameDraft, setSpaceRenameDraft] = useState('')
  const spaceRenameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    spacesRef.current = spaces
  }, [spaces, spacesRef])

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds
  }, [selectedNodeIds, selectedNodeIdsRef])

  useEffect(() => {
    setEditingSpaceId(null)
    setSpaceRenameDraft('')
  }, [workspaceId])

  useEffect(() => {
    if (!editingSpaceId) {
      return
    }

    if (!spaces.some(space => space.id === editingSpaceId)) {
      setEditingSpaceId(null)
      setSpaceRenameDraft('')
    }
  }, [editingSpaceId, spaces])

  useEffect(() => {
    if (!editingSpaceId) {
      return
    }

    window.requestAnimationFrame(() => {
      const input = spaceRenameInputRef.current
      if (!input) {
        return
      }

      input.focus()
      input.select()
    })
  }, [editingSpaceId])

  const cancelSpaceRename = useCallback(() => {
    setEditingSpaceId(null)
    setSpaceRenameDraft('')
  }, [])

  const resolveNodeDirectoryPath = useCallback(
    (nodeId: string): string => {
      const node = nodesRef.current.find(item => item.id === nodeId)
      if (!node) {
        return workspacePath
      }

      if (node.data.kind === 'agent') {
        return node.data.agent?.executionDirectory ?? workspacePath
      }

      if (node.data.kind === 'task' && node.data.task?.linkedAgentNodeId) {
        const linkedAgent = nodesRef.current.find(
          candidate =>
            candidate.id === node.data.task?.linkedAgentNodeId && candidate.data.kind === 'agent',
        )
        if (linkedAgent?.data.agent?.executionDirectory) {
          return linkedAgent.data.agent.executionDirectory
        }
      }

      return workspacePath
    },
    [nodesRef, workspacePath],
  )

  const expandSelectionWithLinkedAgents = useCallback(
    (selectedIds: string[]): string[] => {
      const expanded = new Set(selectedIds)

      for (const nodeId of selectedIds) {
        const node = nodesRef.current.find(item => item.id === nodeId)
        if (!node || node.data.kind !== 'task' || !node.data.task?.linkedAgentNodeId) {
          continue
        }

        expanded.add(node.data.task.linkedAgentNodeId)
      }

      return [...expanded]
    },
    [nodesRef],
  )

  const validateSelectionForTargetDirectory = useCallback(
    (selectedIds: string[], targetDirectoryPath: string): string | null => {
      for (const nodeId of selectedIds) {
        const node = nodesRef.current.find(item => item.id === nodeId)
        if (!node) {
          continue
        }

        if (node.data.kind === 'agent') {
          const nodeDirectory = resolveNodeDirectoryPath(node.id)
          if (nodeDirectory !== targetDirectoryPath) {
            return isAgentWorking(node.data.status)
              ? 'Running agents can only move to spaces with the same directory.'
              : 'Agents cannot be moved to a space with a different directory.'
          }
          continue
        }

        if (node.data.kind !== 'task' || !node.data.task) {
          continue
        }

        const linkedAgentNodeId = node.data.task.linkedAgentNodeId
        if (linkedAgentNodeId) {
          const linkedAgent = nodesRef.current.find(
            candidate => candidate.id === linkedAgentNodeId && candidate.data.kind === 'agent',
          )
          if (linkedAgent) {
            const linkedDirectory = resolveNodeDirectoryPath(linkedAgent.id)
            if (linkedDirectory !== targetDirectoryPath) {
              return isAgentWorking(linkedAgent.data.status)
                ? 'Tasks linked to running agents can only move to spaces with the same directory.'
                : 'Tasks linked to agents in another directory cannot be moved to this space.'
            }
          }
        }

        if (node.data.task.status === 'doing' && targetDirectoryPath !== workspacePath) {
          return 'Running tasks can only move to spaces with the same directory.'
        }
      }

      return null
    },
    [nodesRef, resolveNodeDirectoryPath, workspacePath],
  )

  const createSpace = useCallback(
    (payload: { nodeIds: string[]; rect: WorkspaceSpaceRect | null }) => {
      const normalizedNodeIds = expandSelectionWithLinkedAgents(payload.nodeIds).filter(nodeId =>
        nodesRef.current.some(node => node.id === nodeId),
      )
      if (normalizedNodeIds.length === 0) {
        window.alert('Space must include at least one task or agent.')
        setContextMenu(null)
        setEmptySelectionPrompt(null)
        return
      }

      const targetDirectoryPath = workspacePath
      const validationError = validateSelectionForTargetDirectory(
        normalizedNodeIds,
        targetDirectoryPath,
      )
      if (validationError) {
        window.alert(validationError)
        return
      }

      const usedNames = new Set(spacesRef.current.map(space => space.name.toLowerCase()))
      let nextNumber = spacesRef.current.length + 1
      let normalizedName = `Space ${nextNumber}`
      while (usedNames.has(normalizedName.toLowerCase())) {
        nextNumber += 1
        normalizedName = `Space ${nextNumber}`
      }

      const assignedNodeSet = new Set(normalizedNodeIds)
      const normalizedSpaces = sanitizeSpaces(
        spacesRef.current.map(space => ({
          ...space,
          nodeIds: space.nodeIds.filter(nodeId => !assignedNodeSet.has(nodeId)),
        })),
      )

      const nextSpace: WorkspaceSpaceState = {
        id: crypto.randomUUID(),
        name: normalizedName,
        directoryPath: targetDirectoryPath,
        nodeIds: normalizedNodeIds,
        rect: payload.rect,
      }

      const nextSpaces = sanitizeSpaces([...normalizedSpaces, nextSpace])
      const hasCreatedSpace = nextSpaces.some(space => space.id === nextSpace.id)
      onSpacesChange(nextSpaces)
      onActiveSpaceChange(hasCreatedSpace ? nextSpace.id : null)
      setContextMenu(null)
      setEmptySelectionPrompt(null)
      cancelSpaceRename()
    },
    [
      cancelSpaceRename,
      expandSelectionWithLinkedAgents,
      nodesRef,
      onActiveSpaceChange,
      onSpacesChange,
      setContextMenu,
      setEmptySelectionPrompt,
      spacesRef,
      validateSelectionForTargetDirectory,
      workspacePath,
    ],
  )

  const createSpaceFromSelectedNodes = useCallback(() => {
    const selectedIds = selectedNodeIdsRef.current
    if (selectedIds.length === 0) {
      setContextMenu(null)
      return
    }

    createSpace({
      nodeIds: selectedIds,
      rect: null,
    })
  }, [createSpace, selectedNodeIdsRef, setContextMenu])

  const moveSelectionToSpace = useCallback(
    (spaceId: string) => {
      const targetSpace = spacesRef.current.find(space => space.id === spaceId)
      if (!targetSpace) {
        return
      }

      const selectedIds = selectedNodeIdsRef.current
      if (selectedIds.length === 0) {
        return
      }

      const expandedNodeIds = expandSelectionWithLinkedAgents(selectedIds)
      const validationError = validateSelectionForTargetDirectory(
        expandedNodeIds,
        targetSpace.directoryPath,
      )
      if (validationError) {
        window.alert(validationError)
        return
      }

      const movedNodeSet = new Set(expandedNodeIds)
      const nextSpaces = sanitizeSpaces(
        spacesRef.current.map(space => {
          const withoutMovedNodes = space.nodeIds.filter(nodeId => !movedNodeSet.has(nodeId))

          if (space.id !== targetSpace.id) {
            return {
              ...space,
              nodeIds: withoutMovedNodes,
            }
          }

          return {
            ...space,
            nodeIds: [...new Set([...withoutMovedNodes, ...expandedNodeIds])],
          }
        }),
      )

      const hasTargetSpace = nextSpaces.some(space => space.id === targetSpace.id)
      onSpacesChange(nextSpaces)
      onActiveSpaceChange(hasTargetSpace ? targetSpace.id : null)
      setContextMenu(null)
      cancelSpaceRename()
    },
    [
      cancelSpaceRename,
      expandSelectionWithLinkedAgents,
      onActiveSpaceChange,
      onSpacesChange,
      setContextMenu,
      spacesRef,
      selectedNodeIdsRef,
      validateSelectionForTargetDirectory,
    ],
  )

  const removeSelectionFromSpaces = useCallback(() => {
    const selectedIds = selectedNodeIdsRef.current
    if (selectedIds.length === 0) {
      return
    }

    const expandedNodeIds = new Set(expandSelectionWithLinkedAgents(selectedIds))
    const nextSpaces = sanitizeSpaces(
      spacesRef.current.map(space => ({
        ...space,
        nodeIds: space.nodeIds.filter(nodeId => !expandedNodeIds.has(nodeId)),
      })),
    )
    const nextActiveSpaceId =
      activeSpaceId && nextSpaces.some(space => space.id === activeSpaceId) ? activeSpaceId : null

    onSpacesChange(nextSpaces)
    onActiveSpaceChange(nextActiveSpaceId)
    setContextMenu(null)
    cancelSpaceRename()
  }, [
    activeSpaceId,
    cancelSpaceRename,
    expandSelectionWithLinkedAgents,
    onActiveSpaceChange,
    onSpacesChange,
    setContextMenu,
    selectedNodeIdsRef,
    spacesRef,
  ])

  const startSpaceRename = useCallback(
    (spaceId: string) => {
      const space = spacesRef.current.find(item => item.id === spaceId)
      if (!space) {
        return
      }

      onActiveSpaceChange(space.id)
      setEditingSpaceId(space.id)
      setSpaceRenameDraft(space.name)
      setContextMenu(null)
      setEmptySelectionPrompt(null)
    },
    [onActiveSpaceChange, setContextMenu, setEmptySelectionPrompt, spacesRef],
  )

  const commitSpaceRename = useCallback(
    (spaceId: string) => {
      const normalizedName = spaceRenameDraft.trim()
      if (normalizedName.length === 0) {
        cancelSpaceRename()
        return
      }

      const nextSpaces = spacesRef.current.map(space =>
        space.id === spaceId
          ? {
              ...space,
              name: normalizedName,
            }
          : space,
      )

      onSpacesChange(nextSpaces)
      cancelSpaceRename()
    },
    [cancelSpaceRename, onSpacesChange, spaceRenameDraft, spacesRef],
  )

  const spaceVisuals = useMemo<SpaceVisual[]>(() => {
    const nodeById = new Map(nodes.map(node => [node.id, node]))

    return spaces
      .map(space => {
        const hasExplicitRect = Boolean(space.rect)
        let rect = space.rect

        if (!rect) {
          const ownedNodes = space.nodeIds
            .map(nodeId => nodeById.get(nodeId))
            .filter((node): node is Node<TerminalNodeData> => Boolean(node))

          if (ownedNodes.length === 0) {
            return null
          }

          const minX = Math.min(...ownedNodes.map(node => node.position.x))
          const minY = Math.min(...ownedNodes.map(node => node.position.y))
          const maxX = Math.max(...ownedNodes.map(node => node.position.x + node.data.width))
          const maxY = Math.max(...ownedNodes.map(node => node.position.y + node.data.height))

          rect = {
            x: minX - 24,
            y: minY - 24,
            width: Math.max(120, maxX - minX + 48),
            height: Math.max(100, maxY - minY + 48),
          }
        }

        return {
          id: space.id,
          name: space.name,
          directoryPath: space.directoryPath,
          rect,
          hasExplicitRect,
        }
      })
      .filter((item): item is SpaceVisual => item !== null)
  }, [nodes, spaces])

  const focusSpaceInViewport = useCallback(
    (spaceId: string): void => {
      const targetSpace = spaceVisuals.find(space => space.id === spaceId)
      if (!targetSpace) {
        return
      }

      void reactFlow.fitBounds(targetSpace.rect, {
        padding: 0.16,
        duration: 220,
        minZoom: 0.1,
        maxZoom: 2,
      })
    },
    [reactFlow, spaceVisuals],
  )

  const focusAllInViewport = useCallback((): void => {
    if (nodesRef.current.length === 0) {
      return
    }

    void reactFlow.fitView({
      padding: 0.16,
      duration: 220,
      minZoom: 0.1,
      maxZoom: 2,
    })
  }, [nodesRef, reactFlow])

  return {
    editingSpaceId,
    spaceRenameDraft,
    setSpaceRenameDraft,
    spaceRenameInputRef,
    startSpaceRename,
    cancelSpaceRename,
    commitSpaceRename,
    createSpaceFromSelectedNodes,
    moveSelectionToSpace,
    removeSelectionFromSpaces,
    spaceVisuals,
    focusSpaceInViewport,
    focusAllInViewport,
  }
}
