#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const MAX_LINES = 500
const CHECKED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.css',
  '.scss',
  '.less',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.html',
])

const files = process.argv.slice(2)

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

function countLines(content) {
  if (content.length === 0) {
    return 0
  }

  return content.split(/\r\n|\r|\n/).length
}

const violations = []

for (const file of files) {
  if (!shouldCheck(file)) {
    continue
  }

  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  const lineCount = countLines(content)
  if (lineCount > MAX_LINES) {
    violations.push({ file, lineCount })
  }
}

if (violations.length === 0) {
  process.exit(0)
}

process.stderr.write(`Found files that exceed ${MAX_LINES} lines:\n`)
for (const violation of violations) {
  process.stderr.write(`- ${violation.file}: ${violation.lineCount} lines\n`)
}
process.stderr.write('Split these files before committing.\n')
process.exit(1)
