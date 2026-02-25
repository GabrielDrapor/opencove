import React, { useMemo, useState } from 'react'
import {
  AGENT_PROVIDER_LABEL,
  MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
  MAX_TERMINAL_FONT_SIZE,
  MAX_UI_FONT_SIZE,
  MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
  MIN_TERMINAL_FONT_SIZE,
  MIN_UI_FONT_SIZE,
  resolveAgentModel,
  resolveTaskTitleProvider,
  type AgentProvider,
  type AgentSettings,
  type CanvasInputMode,
  type TaskTitleProvider,
} from '../agentConfig'
import { CanvasSection } from './settingsPanel/CanvasSection'
import { GeneralSection } from './settingsPanel/GeneralSection'
import { ModelOverrideSection } from './settingsPanel/ModelOverrideSection'
import { SettingsPanelNav } from './settingsPanel/SettingsPanelNav'
import { TaskTagsSection } from './settingsPanel/TaskTagsSection'
import { TaskTitleSection } from './settingsPanel/TaskTitleSection'

interface ProviderModelCatalogEntry {
  models: string[]
  source: string | null
  fetchedAt: string | null
  isLoading: boolean
  error: string | null
}

interface SettingsPanelProps {
  settings: AgentSettings
  modelCatalogByProvider: Record<AgentProvider, ProviderModelCatalogEntry>
  onRefreshProviderModels: (provider: AgentProvider) => void
  onChange: (settings: AgentSettings) => void
  onClose: () => void
}

type SettingsSectionId = 'general' | 'canvas' | 'task-title' | 'task-tags' | 'model-override'

interface SettingsSection {
  id: SettingsSectionId
  title: string
  anchorId: string
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'general',
    title: 'General',
    anchorId: 'settings-section-general',
  },
  {
    id: 'canvas',
    title: 'Canvas',
    anchorId: 'settings-section-canvas',
  },
  {
    id: 'task-title',
    title: 'Task Title',
    anchorId: 'settings-section-task-title',
  },
  {
    id: 'task-tags',
    title: 'Task Tags',
    anchorId: 'settings-section-task-tags',
  },
  {
    id: 'model-override',
    title: 'Model Override',
    anchorId: 'settings-section-model-override',
  },
]

function createInitialInputState(): Record<AgentProvider, string> {
  return {
    'claude-code': '',
    codex: '',
  }
}

export function SettingsPanel({
  settings,
  modelCatalogByProvider,
  onRefreshProviderModels,
  onChange,
  onClose,
}: SettingsPanelProps): React.JSX.Element {
  const [addModelInputByProvider, setAddModelInputByProvider] = useState<
    Record<AgentProvider, string>
  >(() => createInitialInputState())
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>('general')
  const [addTaskTagInput, setAddTaskTagInput] = useState('')

  const updateDefaultProvider = (provider: AgentProvider): void => {
    onChange({
      ...settings,
      defaultProvider: provider,
    })
  }

  const updateTaskTitleProvider = (provider: TaskTitleProvider): void => {
    onChange({
      ...settings,
      taskTitleProvider: provider,
    })
  }

  const updateTaskTitleModel = (model: string): void => {
    onChange({
      ...settings,
      taskTitleModel: model,
    })
  }

  const updateNormalizeZoomOnTerminalClick = (enabled: boolean): void => {
    onChange({
      ...settings,
      normalizeZoomOnTerminalClick: enabled,
    })
  }

  const updateCanvasInputMode = (mode: CanvasInputMode): void => {
    onChange({
      ...settings,
      canvasInputMode: mode,
    })
  }

  const updateDefaultTerminalWindowScalePercent = (percent: number): void => {
    if (!Number.isFinite(percent)) {
      return
    }

    const next = Math.max(
      MIN_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT,
      Math.min(MAX_DEFAULT_TERMINAL_WINDOW_SCALE_PERCENT, Math.round(percent)),
    )

    onChange({
      ...settings,
      defaultTerminalWindowScalePercent: next,
    })
  }

  const updateTerminalFontSize = (fontSize: number): void => {
    if (!Number.isFinite(fontSize)) {
      return
    }

    const next = Math.max(MIN_TERMINAL_FONT_SIZE, Math.min(MAX_TERMINAL_FONT_SIZE, fontSize))

    onChange({
      ...settings,
      terminalFontSize: Math.round(next),
    })
  }

  const updateUiFontSize = (fontSize: number): void => {
    if (!Number.isFinite(fontSize)) {
      return
    }

    const next = Math.max(MIN_UI_FONT_SIZE, Math.min(MAX_UI_FONT_SIZE, Math.round(fontSize)))

    onChange({
      ...settings,
      uiFontSize: next,
    })
  }

  const updateTaskTagOptions = (nextTags: string[]): void => {
    onChange({
      ...settings,
      taskTagOptions: nextTags,
    })
  }

  const removeTaskTagOption = (tag: string): void => {
    if (!settings.taskTagOptions.includes(tag)) {
      return
    }

    const nextTags = settings.taskTagOptions.filter(option => option !== tag)
    if (nextTags.length === 0) {
      return
    }

    updateTaskTagOptions(nextTags)
  }

  const addTaskTagOption = (): void => {
    const candidate = addTaskTagInput.trim()
    if (candidate.length === 0) {
      return
    }

    const nextTags = settings.taskTagOptions.includes(candidate)
      ? settings.taskTagOptions
      : [...settings.taskTagOptions, candidate]

    updateTaskTagOptions(nextTags)
    setAddTaskTagInput('')
  }

  const updateProviderCustomModelEnabled = (provider: AgentProvider, enabled: boolean): void => {
    onChange({
      ...settings,
      customModelEnabledByProvider: {
        ...settings.customModelEnabledByProvider,
        [provider]: enabled,
      },
    })
  }

  const selectProviderModel = (provider: AgentProvider, model: string): void => {
    onChange({
      ...settings,
      customModelEnabledByProvider: {
        ...settings.customModelEnabledByProvider,
        [provider]: true,
      },
      customModelByProvider: {
        ...settings.customModelByProvider,
        [provider]: model,
      },
    })
  }

  const removeCustomModelOption = (provider: AgentProvider, model: string): void => {
    const currentOptions = settings.customModelOptionsByProvider[provider]
    if (!currentOptions.includes(model)) {
      return
    }

    const nextOptions = currentOptions.filter(option => option !== model)
    const currentSelected = settings.customModelByProvider[provider]

    onChange({
      ...settings,
      customModelByProvider: {
        ...settings.customModelByProvider,
        [provider]: currentSelected === model ? '' : currentSelected,
      },
      customModelOptionsByProvider: {
        ...settings.customModelOptionsByProvider,
        [provider]: nextOptions,
      },
    })
  }

  const updateAddModelInput = (provider: AgentProvider, value: string): void => {
    setAddModelInputByProvider(prev => ({
      ...prev,
      [provider]: value,
    }))
  }

  const addCustomModelOption = (provider: AgentProvider): void => {
    const candidate = addModelInputByProvider[provider].trim()
    if (candidate.length === 0) {
      return
    }

    const existingOptions = settings.customModelOptionsByProvider[provider]
    const nextOptions = existingOptions.includes(candidate)
      ? existingOptions
      : [...existingOptions, candidate]

    onChange({
      ...settings,
      customModelEnabledByProvider: {
        ...settings.customModelEnabledByProvider,
        [provider]: true,
      },
      customModelByProvider: {
        ...settings.customModelByProvider,
        [provider]: candidate,
      },
      customModelOptionsByProvider: {
        ...settings.customModelOptionsByProvider,
        [provider]: nextOptions,
      },
    })

    setAddModelInputByProvider(prev => ({
      ...prev,
      [provider]: '',
    }))
  }

  const selectedModel =
    resolveAgentModel(settings, settings.defaultProvider) ?? 'Default (Follow CLI)'

  const effectiveTaskTitleProvider = useMemo(() => {
    return resolveTaskTitleProvider(settings)
  }, [settings])

  const scrollToSection = (section: SettingsSection): void => {
    setActiveSectionId(section.id)
    const element = document.getElementById(section.anchorId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="settings-backdrop"
      onClick={() => {
        onClose()
      }}
    >
      <section
        className="settings-panel"
        onClick={event => {
          event.stopPropagation()
        }}
      >
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <button
            type="button"
            className="settings-panel__close"
            onClick={() => {
              onClose()
            }}
          >
            ×
          </button>
        </div>

        <div className="settings-panel__layout">
          <SettingsPanelNav
            sections={SETTINGS_SECTIONS}
            activeSectionId={activeSectionId}
            onSelect={section => {
              scrollToSection(section)
            }}
          />

          <div className="settings-panel__content">
            <GeneralSection
              defaultProvider={settings.defaultProvider}
              onChangeDefaultProvider={provider => {
                updateDefaultProvider(provider)
              }}
            />

            <CanvasSection
              canvasInputMode={settings.canvasInputMode}
              normalizeZoomOnTerminalClick={settings.normalizeZoomOnTerminalClick}
              defaultTerminalWindowScalePercent={settings.defaultTerminalWindowScalePercent}
              terminalFontSize={settings.terminalFontSize}
              uiFontSize={settings.uiFontSize}
              onChangeCanvasInputMode={mode => {
                updateCanvasInputMode(mode)
              }}
              onChangeNormalizeZoomOnTerminalClick={enabled => {
                updateNormalizeZoomOnTerminalClick(enabled)
              }}
              onChangeDefaultTerminalWindowScalePercent={percent => {
                updateDefaultTerminalWindowScalePercent(percent)
              }}
              onChangeTerminalFontSize={size => {
                updateTerminalFontSize(size)
              }}
              onChangeUiFontSize={size => {
                updateUiFontSize(size)
              }}
            />

            <TaskTitleSection
              defaultProvider={settings.defaultProvider}
              taskTitleProvider={settings.taskTitleProvider}
              taskTitleModel={settings.taskTitleModel}
              effectiveTaskTitleProvider={effectiveTaskTitleProvider}
              onChangeTaskTitleProvider={provider => {
                updateTaskTitleProvider(provider)
              }}
              onChangeTaskTitleModel={model => {
                updateTaskTitleModel(model)
              }}
            />

            <TaskTagsSection
              tags={settings.taskTagOptions}
              addTaskTagInput={addTaskTagInput}
              onChangeAddTaskTagInput={value => {
                setAddTaskTagInput(value)
              }}
              onAddTag={() => {
                addTaskTagOption()
              }}
              onRemoveTag={tag => {
                removeTaskTagOption(tag)
              }}
            />

            <ModelOverrideSection
              settings={settings}
              modelCatalogByProvider={modelCatalogByProvider}
              addModelInputByProvider={addModelInputByProvider}
              onRefreshProviderModels={provider => {
                onRefreshProviderModels(provider)
              }}
              onToggleCustomModelEnabled={(provider, enabled) => {
                updateProviderCustomModelEnabled(provider, enabled)
              }}
              onSelectProviderModel={(provider, model) => {
                selectProviderModel(provider, model)
              }}
              onRemoveCustomModelOption={(provider, model) => {
                removeCustomModelOption(provider, model)
              }}
              onChangeAddModelInput={(provider, value) => {
                updateAddModelInput(provider, value)
              }}
              onAddCustomModelOption={provider => {
                addCustomModelOption(provider)
              }}
            />

            <p className="settings-panel__hint">
              Current default: {AGENT_PROVIDER_LABEL[settings.defaultProvider]} · {selectedModel}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
