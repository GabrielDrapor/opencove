import React from 'react'

export interface SpaceWorktreeGuardState {
  spaceName: string
  agentCount: number
  terminalCount: number
  pendingLabel: string
  allowMarkMismatch: boolean
  isBusy: boolean
  error: string | null
}

export function SpaceWorktreeGuardWindow({
  guard,
  onCancel,
  onMarkMismatchAndContinue,
  onCloseAllAndContinue,
}: {
  guard: SpaceWorktreeGuardState | null
  onCancel: () => void
  onMarkMismatchAndContinue: () => void
  onCloseAllAndContinue: () => void
}): React.JSX.Element | null {
  if (!guard) {
    return null
  }

  return (
    <div
      className="cove-window-backdrop workspace-space-worktree-guard-backdrop"
      data-testid="space-worktree-guard"
      onClick={() => {
        if (guard.isBusy) {
          return
        }

        onCancel()
      }}
    >
      <section
        className="cove-window workspace-space-worktree-guard"
        onClick={event => {
          event.stopPropagation()
        }}
      >
        <h3>{guard.pendingLabel}</h3>
        <p>
          Space <strong>{guard.spaceName}</strong> has active windows bound to its current
          directory.
        </p>
        {guard.allowMarkMismatch ? (
          <p>
            You can continue by marking current windows as <strong>DIR MISMATCH</strong>, or close
            all windows first.
          </p>
        ) : (
          <p>
            This action removes worktree metadata. You must close all windows in this space first.
          </p>
        )}

        <ul className="workspace-space-worktree-guard__counts">
          <li>
            Agents: <strong>{guard.agentCount}</strong>
          </li>
          <li>
            Terminals: <strong>{guard.terminalCount}</strong>
          </li>
        </ul>

        {guard.error ? (
          <p className="cove-window__error workspace-space-worktree-guard__error">{guard.error}</p>
        ) : null}

        <div className="cove-window__actions workspace-space-worktree-guard__actions">
          <button
            type="button"
            className="cove-window__action cove-window__action--ghost"
            data-testid="space-worktree-guard-cancel"
            disabled={guard.isBusy}
            onClick={() => {
              onCancel()
            }}
          >
            Cancel
          </button>

          {guard.allowMarkMismatch ? (
            <button
              type="button"
              className="cove-window__action cove-window__action--secondary"
              data-testid="space-worktree-guard-mark-mismatch"
              disabled={guard.isBusy}
              onClick={() => {
                onMarkMismatchAndContinue()
              }}
            >
              Mark Mismatch & Continue
            </button>
          ) : null}

          <button
            type="button"
            className="cove-window__action cove-window__action--danger"
            data-testid="space-worktree-guard-close-all"
            disabled={guard.isBusy}
            onClick={() => {
              onCloseAllAndContinue()
            }}
          >
            Close All & Continue
          </button>
        </div>
      </section>
    </div>
  )
}
