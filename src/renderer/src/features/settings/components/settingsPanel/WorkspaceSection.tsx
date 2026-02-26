import React, { useMemo } from 'react'

function resolveWorktreesRoot(workspacePath: string, worktreesRoot: string): string {
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

export function WorkspaceSection({
  workspaceName,
  workspacePath,
  worktreesRoot,
  onChangeWorktreesRoot,
}: {
  workspaceName: string | null
  workspacePath: string | null
  worktreesRoot: string
  onChangeWorktreesRoot: (worktreesRoot: string) => void
}): React.JSX.Element {
  const resolvedRoot = useMemo(() => {
    if (!workspacePath) {
      return ''
    }

    return resolveWorktreesRoot(workspacePath, worktreesRoot)
  }, [workspacePath, worktreesRoot])

  return (
    <div className="settings-panel__section" id="settings-section-workspace">
      <h3>Workspace Worktree</h3>

      {workspacePath ? (
        <>
          <p className="settings-panel__hint">
            Project: <strong>{workspaceName ?? 'Unnamed Project'}</strong>
          </p>
          <p className="settings-panel__path-preview">{workspacePath}</p>

          <div className="settings-panel__row">
            <span>Worktree Root Directory</span>
            <input
              id="settings-worktree-root"
              data-testid="settings-worktree-root"
              value={worktreesRoot}
              placeholder=".cove/worktrees"
              onChange={event => {
                onChangeWorktreesRoot(event.target.value)
              }}
            />
          </div>

          <div className="settings-panel__row">
            <span>Resolved Path</span>
            <p className="settings-panel__path-preview settings-panel__path-preview--inline">
              {resolvedRoot}
            </p>
          </div>

          <div className="settings-panel__row settings-panel__row--actions">
            <span />
            <button
              type="button"
              className="cove-window__action cove-window__action--secondary"
              data-testid="settings-worktree-root-reset"
              disabled={worktreesRoot.trim().length === 0}
              onClick={() => {
                onChangeWorktreesRoot('')
              }}
            >
              Use Default (`.cove/worktrees`)
            </button>
          </div>

          <p className="settings-panel__hint">
            Used when creating a new worktree from a Space. Relative path is based on project root;
            absolute path starts with `/` (or `C:\...` on Windows).
          </p>
        </>
      ) : (
        <p className="settings-panel__hint">
          Select a project first. Worktree root is configured per project.
        </p>
      )}
    </div>
  )
}
