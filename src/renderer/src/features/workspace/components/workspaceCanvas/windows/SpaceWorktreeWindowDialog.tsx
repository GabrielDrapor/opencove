import React from 'react'
import type { GitWorktreeInfo } from '@shared/types/api'
import type { WorkspaceSpaceState } from '../../../types'
import { SpaceWorktreePanels } from './SpaceWorktreePanels'
import type { BranchMode, SpaceWorktreeViewMode } from './spaceWorktree.shared'

export function SpaceWorktreeWindowDialog({
  space,
  currentDirectoryLabel,
  isSpaceOnWorkspaceRoot,
  currentWorktree,
  viewMode,
  isBusy,
  isMutating,
  isSuggesting,
  branches,
  currentBranch,
  worktrees,
  selectedWorktreePath,
  branchMode,
  newBranchName,
  startPoint,
  existingBranchName,
  worktreeName,
  worktreePathPreview,
  spaceNotes,
  removeWorktreeOnDetach,
  removeConfirmText,
  resolvedWorktreesRoot,
  workspacePath,
  error,
  guardIsBusy,
  onBackdropClose,
  onClose,
  onOpenSwitch,
  onOpenCreate,
  onOpenDetach,
  onBackHome,
  onBackDetach,
  onSelectWorktreePath,
  onRefresh,
  onBind,
  onBranchModeChange,
  onNewBranchNameChange,
  onStartPointChange,
  onExistingBranchNameChange,
  onWorktreeNameChange,
  onSpaceNotesChange,
  onSuggestNames,
  onCreate,
  onRemoveWorktreeOnDetachChange,
  onDetachContinue,
  onRemoveConfirmTextChange,
  onDetachRemoveConfirm,
}: {
  space: WorkspaceSpaceState
  currentDirectoryLabel: string
  isSpaceOnWorkspaceRoot: boolean
  currentWorktree: GitWorktreeInfo | null
  viewMode: SpaceWorktreeViewMode
  isBusy: boolean
  isMutating: boolean
  isSuggesting: boolean
  branches: string[]
  currentBranch: string | null
  worktrees: GitWorktreeInfo[]
  selectedWorktreePath: string
  branchMode: BranchMode
  newBranchName: string
  startPoint: string
  existingBranchName: string
  worktreeName: string
  worktreePathPreview: string
  spaceNotes: string
  removeWorktreeOnDetach: boolean
  removeConfirmText: string
  resolvedWorktreesRoot: string
  workspacePath: string
  error: string | null
  guardIsBusy: boolean
  onBackdropClose: () => void
  onClose: () => void
  onOpenSwitch: () => void
  onOpenCreate: () => void
  onOpenDetach: () => void
  onBackHome: () => void
  onBackDetach: () => void
  onSelectWorktreePath: (path: string) => void
  onRefresh: () => void
  onBind: () => void
  onBranchModeChange: (mode: BranchMode) => void
  onNewBranchNameChange: (value: string) => void
  onStartPointChange: (value: string) => void
  onExistingBranchNameChange: (value: string) => void
  onWorktreeNameChange: (value: string) => void
  onSpaceNotesChange: (value: string) => void
  onSuggestNames: () => void
  onCreate: () => void
  onRemoveWorktreeOnDetachChange: (checked: boolean) => void
  onDetachContinue: () => void
  onRemoveConfirmTextChange: (value: string) => void
  onDetachRemoveConfirm: () => void
}): React.JSX.Element {
  return (
    <div
      className="cove-window-backdrop workspace-space-worktree-backdrop"
      onClick={() => {
        if (isBusy || guardIsBusy) {
          return
        }

        onBackdropClose()
      }}
    >
      <section
        className="cove-window workspace-space-worktree"
        data-testid="space-worktree-window"
        onClick={event => {
          event.stopPropagation()
        }}
      >
        <header className="workspace-space-worktree__header">
          <h3>Worktree · {space.name}</h3>
          <p className="workspace-space-worktree__meta">
            Current directory: <strong>{currentDirectoryLabel}</strong>
          </p>
          <div className="workspace-space-worktree__status-row">
            <span className="workspace-space-worktree__status-chip">
              {isSpaceOnWorkspaceRoot ? 'Workspace root' : 'Bound to worktree'}
            </span>
            {currentWorktree?.branch ? (
              <span className="workspace-space-worktree__status-chip workspace-space-worktree__status-chip--branch">
                Branch: {currentWorktree.branch}
              </span>
            ) : null}
          </div>
        </header>

        <SpaceWorktreePanels
          space={space}
          viewMode={viewMode}
          isBusy={isBusy}
          isMutating={isMutating}
          isSuggesting={isSuggesting}
          isSpaceOnWorkspaceRoot={isSpaceOnWorkspaceRoot}
          branches={branches}
          currentBranch={currentBranch}
          worktrees={worktrees}
          selectedWorktreePath={selectedWorktreePath}
          branchMode={branchMode}
          newBranchName={newBranchName}
          startPoint={startPoint}
          existingBranchName={existingBranchName}
          worktreeName={worktreeName}
          worktreePathPreview={worktreePathPreview}
          spaceNotes={spaceNotes}
          removeWorktreeOnDetach={removeWorktreeOnDetach}
          removeConfirmText={removeConfirmText}
          resolvedWorktreesRoot={resolvedWorktreesRoot}
          workspacePath={workspacePath}
          onOpenSwitch={onOpenSwitch}
          onOpenCreate={onOpenCreate}
          onOpenDetach={onOpenDetach}
          onBackHome={onBackHome}
          onBackDetach={onBackDetach}
          onSelectWorktreePath={onSelectWorktreePath}
          onRefresh={onRefresh}
          onBind={onBind}
          onBranchModeChange={onBranchModeChange}
          onNewBranchNameChange={onNewBranchNameChange}
          onStartPointChange={onStartPointChange}
          onExistingBranchNameChange={onExistingBranchNameChange}
          onWorktreeNameChange={onWorktreeNameChange}
          onSpaceNotesChange={onSpaceNotesChange}
          onSuggestNames={onSuggestNames}
          onCreate={onCreate}
          onRemoveWorktreeOnDetachChange={onRemoveWorktreeOnDetachChange}
          onDetachContinue={onDetachContinue}
          onRemoveConfirmTextChange={onRemoveConfirmTextChange}
          onDetachRemoveConfirm={onDetachRemoveConfirm}
        />

        {error ? (
          <p className="cove-window__error workspace-space-worktree__error">{error}</p>
        ) : null}

        <div className="cove-window__actions workspace-space-worktree__actions">
          <button
            type="button"
            className="cove-window__action cove-window__action--ghost"
            data-testid="space-worktree-close"
            disabled={isBusy || guardIsBusy}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  )
}
