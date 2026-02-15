#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const CHECKED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.env',
  '.sh',
  '.txt',
])

function shouldCheck(filePath) {
  if (
    filePath.includes('node_modules/') ||
    filePath.includes('dist/') ||
    filePath.includes('out/')
  ) {
    return false
  }

  const dotIndex = filePath.lastIndexOf('.')
  if (dotIndex === -1) {
    return false
  }

  const extension = filePath.slice(dotIndex).toLowerCase()
  return CHECKED_EXTENSIONS.has(extension)
}

function isLikelyBinary(content) {
  return content.includes('\u0000')
}

const files = process.argv.slice(2).filter(shouldCheck)

let hasErrors = false

for (const file of files) {
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  if (isLikelyBinary(content)) {
    continue
  }

  const result = spawnSync('pnpm', ['exec', 'secretlint', '--stdinFileName', file], {
    input: content,
    encoding: 'utf8',
  })

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (result.stderr) {
    process.stderr.write(result.stderr)
  }

  if (result.status !== 0) {
    hasErrors = true
  }
}

process.exit(hasErrors ? 1 : 0)
