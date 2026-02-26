import { expect, test } from '@playwright/test'
import {
  clearAndSeedWorkspace,
  launchApp,
  storageKey,
  testWorkspacePath,
} from './workspace-canvas.helpers'

test.describe('Workspace Canvas - Agent Launcher', () => {
  test('runs agent from launcher v2 and creates node', async () => {
    const { electronApp, window } = await launchApp()

    try {
      await clearAndSeedWorkspace(window, [], {
        settings: {
          defaultProvider: 'codex',
          customModelEnabledByProvider: {
            'claude-code': false,
            codex: true,
          },
          customModelByProvider: {
            'claude-code': '',
            codex: 'gpt-5.2-codex',
          },
          customModelOptionsByProvider: {
            'claude-code': [],
            codex: ['gpt-5.2-codex'],
          },
        },
      })

      const pane = window.locator('.workspace-canvas .react-flow__pane')
      await expect(pane).toBeVisible()

      await pane.click({
        button: 'right',
        position: { x: 320, y: 220 },
      })

      const runButton = window.locator('[data-testid="workspace-context-run-default-agent"]')
      await expect(runButton).toBeVisible()
      await runButton.click()

      const launcher = window.locator('[data-testid="workspace-agent-launcher"]')
      await expect(launcher).toBeVisible()

      await window.locator('[data-testid="workspace-agent-launch-provider"]').selectOption('codex')
      await window.locator('[data-testid="workspace-agent-launch-model"]').fill('gpt-5.2-codex')

      const promptInput = window.locator('[data-testid="workspace-agent-launch-prompt"]')
      await promptInput.fill('Generate implementation plan for API error handling')

      const submitButton = window.locator('[data-testid="workspace-agent-launch-submit"]')
      await submitButton.click()

      await expect(window.locator('.terminal-node')).toHaveCount(1)
      await expect(window.locator('.terminal-node__title').first()).toContainText('gpt-5.2-codex')
      await expect(window.locator('.terminal-node').first().locator('.xterm')).toBeVisible()
      await expect(window.locator('.terminal-node').first()).toContainText(
        '[cove-test-agent] codex new',
      )
      await expect(window.locator('.workspace-sidebar .workspace-agent-item')).toHaveCount(1)
    } finally {
      await electronApp.close()
    }
  })

  test('blocks moving selected agent to workspace with different directory', async () => {
    const { electronApp, window } = await launchApp()

    try {
      await clearAndSeedWorkspace(
        window,
        [
          {
            id: 'space-agent-node',
            title: 'codex · gpt-5.2-codex',
            position: { x: 260, y: 180 },
            width: 500,
            height: 320,
            kind: 'agent',
            status: 'running',
            startedAt: new Date().toISOString(),
            endedAt: null,
            exitCode: null,
            lastError: null,
            scrollback: '[cove-test-agent] codex new gpt-5.2-codex\\n',
            agent: {
              provider: 'codex',
              prompt: 'Implement API retries',
              model: 'gpt-5.2-codex',
              effectiveModel: 'gpt-5.2-codex',
              launchMode: 'new',
              resumeSessionId: null,
              executionDirectory: testWorkspacePath,
              directoryMode: 'workspace',
              customDirectory: null,
              shouldCreateDirectory: false,
            },
            task: null,
          },
          {
            id: 'space-anchor-node',
            title: 'terminal-space-anchor',
            position: { x: 980, y: 240 },
            width: 460,
            height: 300,
          },
        ],
        {
          spaces: [
            {
              id: 'space-diff',
              name: 'Worktree Scope',
              directoryPath: `${testWorkspacePath}/.cove/worktrees/demo`,
              nodeIds: ['space-anchor-node'],
              rect: {
                x: 900,
                y: 220,
                width: 240,
                height: 180,
              },
            },
          ],
        },
      )

      const agentNode = window.locator('.terminal-node').first()
      await expect(agentNode).toBeVisible()
      await agentNode.click()
      await agentNode.click({ button: 'right' })

      const moveButton = window.locator('[data-testid="workspace-selection-move-space-space-diff"]')
      await expect(moveButton).toBeVisible()

      const alertPromise = window.waitForEvent('dialog').then(async dialog => {
        expect(dialog.type()).toBe('alert')
        const message = dialog.message()
        await dialog.accept()
        return message
      })

      await moveButton.click()
      const alertMessage = await alertPromise
      expect(alertMessage).toContain('directory')

      const movedToDifferentSpace = await window.evaluate(
        ({ key, nodeId, targetSpaceId }) => {
          const raw = window.localStorage.getItem(key)
          if (!raw) {
            return false
          }

          const parsed = JSON.parse(raw) as {
            workspaces?: Array<{
              spaces?: Array<{
                id?: string
                nodeIds?: string[]
              }>
            }>
          }
          const spaces = parsed.workspaces?.[0]?.spaces ?? []
          const targetSpace = spaces.find(space => space.id === targetSpaceId)
          return Array.isArray(targetSpace?.nodeIds) ? targetSpace.nodeIds.includes(nodeId) : false
        },
        {
          key: storageKey,
          nodeId: 'space-agent-node',
          targetSpaceId: 'space-diff',
        },
      )

      expect(movedToDifferentSpace).toBe(false)
    } finally {
      await electronApp.close()
    }
  })
})
