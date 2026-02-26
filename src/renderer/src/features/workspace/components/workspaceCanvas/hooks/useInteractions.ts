import { useCallback } from 'react'
import type { Edge, Node, ReactFlowInstance } from '@xyflow/react'
import type { TerminalNodeData, WorkspaceSpaceState } from '../../../types'
import type {
  ContextMenuState,
  CreateNodeInput,
  EmptySelectionPromptState,
  SelectionDraftState,
} from '../types'
import { useWorkspaceCanvasSelectionDraft } from './useSelectionDraft'

type SetNodes = (
  updater: (prevNodes: Node<TerminalNodeData>[]) => Node<TerminalNodeData>[],
  options?: { syncLayout?: boolean },
) => void

interface UseWorkspaceCanvasInteractionsParams {
  isTrackpadCanvasMode: boolean
  isShiftPressedRef: React.MutableRefObject<boolean>
  selectionDraftRef: React.MutableRefObject<SelectionDraftState | null>
  reactFlow: ReactFlowInstance<Node<TerminalNodeData>, Edge>
  setNodes: SetNodes
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>
  setEmptySelectionPrompt: React.Dispatch<React.SetStateAction<EmptySelectionPromptState | null>>
  cancelSpaceRename: () => void
  selectedNodeIdsRef: React.MutableRefObject<string[]>
  contextMenu: ContextMenuState | null
  workspacePath: string
  activeSpaceId: string | null
  spacesRef: React.MutableRefObject<WorkspaceSpaceState[]>
  onSpacesChange: (spaces: WorkspaceSpaceState[]) => void
  nodesRef: React.MutableRefObject<Node<TerminalNodeData>[]>
  createNodeForSession: (input: CreateNodeInput) => Promise<Node<TerminalNodeData> | null>
}

export function useWorkspaceCanvasInteractions({
  isTrackpadCanvasMode,
  isShiftPressedRef,
  selectionDraftRef,
  reactFlow,
  setNodes,
  setSelectedNodeIds,
  setContextMenu,
  setEmptySelectionPrompt,
  cancelSpaceRename,
  selectedNodeIdsRef,
  contextMenu,
  workspacePath,
  activeSpaceId,
  spacesRef,
  onSpacesChange,
  nodesRef,
  createNodeForSession,
}: UseWorkspaceCanvasInteractionsParams): {
  clearNodeSelection: () => void
  handleSelectionContextMenu: (
    event: React.MouseEvent,
    selectedNodes: Node<TerminalNodeData>[],
  ) => void
  handleNodeContextMenu: (event: React.MouseEvent, node: Node<TerminalNodeData>) => void
  handlePaneContextMenu: (event: React.MouseEvent | MouseEvent) => void
  handleSelectionChange: (params: { nodes: Node<TerminalNodeData>[] }) => void
  handleCanvasPointerDownCapture: React.PointerEventHandler<HTMLDivElement>
  handleCanvasPointerMoveCapture: React.PointerEventHandler<HTMLDivElement>
  handleCanvasPointerUpCapture: React.PointerEventHandler<HTMLDivElement>
  handlePaneClick: (_event: React.MouseEvent | MouseEvent) => void
  createTerminalNode: () => Promise<void>
} {
  const clearNodeSelection = useCallback(() => {
    setNodes(
      prevNodes => {
        let hasSelection = false
        const nextNodes = prevNodes.map(node => {
          if (!node.selected) {
            return node
          }

          hasSelection = true
          return {
            ...node,
            selected: false,
          }
        })

        return hasSelection ? nextNodes : prevNodes
      },
      { syncLayout: false },
    )
    setSelectedNodeIds([])
  }, [setNodes, setSelectedNodeIds])

  const openSelectionContextMenu = useCallback(
    (x: number, y: number) => {
      setContextMenu({
        kind: 'selection',
        x,
        y,
      })
      setEmptySelectionPrompt(null)
    },
    [setContextMenu, setEmptySelectionPrompt],
  )

  const handleSelectionContextMenu = useCallback(
    (event: React.MouseEvent, selectedNodes: Node<TerminalNodeData>[]) => {
      event.preventDefault()
      if (selectedNodes.length === 0) {
        return
      }

      openSelectionContextMenu(event.clientX, event.clientY)
    },
    [openSelectionContextMenu],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<TerminalNodeData>) => {
      if (!selectedNodeIdsRef.current.includes(node.id)) {
        return
      }

      event.preventDefault()
      openSelectionContextMenu(event.clientX, event.clientY)
    },
    [openSelectionContextMenu, selectedNodeIdsRef],
  )

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault()
      if (!('clientX' in event)) {
        return
      }

      const flowPosition = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      setContextMenu({
        kind: 'pane',
        x: event.clientX,
        y: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      })
      setEmptySelectionPrompt(null)
      cancelSpaceRename()
    },
    [cancelSpaceRename, reactFlow, setContextMenu, setEmptySelectionPrompt],
  )

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node<TerminalNodeData>[] }) => {
      const selectedIds = selected.map(node => node.id)
      setSelectedNodeIds(selectedIds)
      if (selectedIds.length > 0) {
        setEmptySelectionPrompt(null)
      }
    },
    [setEmptySelectionPrompt, setSelectedNodeIds],
  )

  const {
    handleCanvasPointerDownCapture,
    handleCanvasPointerMoveCapture,
    handleCanvasPointerUpCapture,
  } = useWorkspaceCanvasSelectionDraft({
    isTrackpadCanvasMode,
    isShiftPressedRef,
    selectionDraftRef,
    reactFlow,
    setNodes,
    setSelectedNodeIds,
    setContextMenu,
    setEmptySelectionPrompt,
  })

  const handlePaneClick = useCallback(
    (_event: React.MouseEvent | MouseEvent) => {
      clearNodeSelection()
      setContextMenu(null)
      setEmptySelectionPrompt(null)
      cancelSpaceRename()
    },
    [cancelSpaceRename, clearNodeSelection, setContextMenu, setEmptySelectionPrompt],
  )

  const createTerminalNode = useCallback(async () => {
    if (!contextMenu || contextMenu.kind !== 'pane') {
      return
    }

    const anchor = {
      x: contextMenu.flowX,
      y: contextMenu.flowY,
    }

    setContextMenu(null)

    const activeSpace = activeSpaceId
      ? (spacesRef.current.find(space => space.id === activeSpaceId) ?? null)
      : null

    const resolvedCwd =
      activeSpace && activeSpace.directoryPath.trim().length > 0
        ? activeSpace.directoryPath
        : workspacePath

    const spawned = await window.coveApi.pty.spawn({
      cwd: resolvedCwd,
      cols: 80,
      rows: 24,
    })

    const created = await createNodeForSession({
      sessionId: spawned.sessionId,
      title: `terminal-${nodesRef.current.length + 1}`,
      anchor,
      kind: 'terminal',
      executionDirectory: resolvedCwd,
      expectedDirectory: resolvedCwd,
    })

    if (!created || !activeSpace) {
      return
    }

    const nextSpaces = spacesRef.current.map(space => {
      const filtered = space.nodeIds.filter(nodeId => nodeId !== created.id)

      if (space.id !== activeSpace.id) {
        return { ...space, nodeIds: filtered }
      }

      return { ...space, nodeIds: [...new Set([...filtered, created.id])] }
    })

    onSpacesChange(nextSpaces)
  }, [
    activeSpaceId,
    contextMenu,
    createNodeForSession,
    nodesRef,
    onSpacesChange,
    setContextMenu,
    spacesRef,
    workspacePath,
  ])

  return {
    clearNodeSelection,
    handleSelectionContextMenu,
    handleNodeContextMenu,
    handlePaneContextMenu,
    handleSelectionChange,
    handleCanvasPointerDownCapture,
    handleCanvasPointerMoveCapture,
    handleCanvasPointerUpCapture,
    handlePaneClick,
    createTerminalNode,
  }
}
