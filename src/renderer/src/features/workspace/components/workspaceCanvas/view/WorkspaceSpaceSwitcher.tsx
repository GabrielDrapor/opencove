import React from 'react'
import type { WorkspaceSpaceState } from '../../../types'

interface WorkspaceSpaceSwitcherProps {
  spaces: WorkspaceSpaceState[]
  activeSpaceId: string | null
  onActiveSpaceChange: (spaceId: string | null) => void
  focusSpaceInViewport: (spaceId: string) => void
  focusAllInViewport: () => void
  cancelSpaceRename: () => void
}

export function WorkspaceSpaceSwitcher({
  spaces,
  activeSpaceId,
  onActiveSpaceChange,
  focusSpaceInViewport,
  focusAllInViewport,
  cancelSpaceRename,
}: WorkspaceSpaceSwitcherProps): React.JSX.Element | null {
  if (spaces.length === 0) {
    return null
  }

  return (
    <div
      className="workspace-space-switcher"
      onClick={event => {
        event.stopPropagation()
      }}
    >
      <button
        type="button"
        className={`workspace-space-switcher__item${activeSpaceId === null ? ' workspace-space-switcher__item--active' : ''}`}
        data-testid="workspace-space-switch-all"
        onClick={() => {
          onActiveSpaceChange(null)
          focusAllInViewport()
          cancelSpaceRename()
        }}
      >
        All
      </button>
      {spaces.map(space => (
        <button
          type="button"
          key={space.id}
          className={`workspace-space-switcher__item${space.id === activeSpaceId ? ' workspace-space-switcher__item--active' : ''}`}
          data-testid={`workspace-space-switch-${space.id}`}
          onClick={() => {
            onActiveSpaceChange(space.id)
            focusSpaceInViewport(space.id)
            cancelSpaceRename()
          }}
        >
          <span className="workspace-space-switcher__item-label">{space.name}</span>
        </button>
      ))}
    </div>
  )
}
