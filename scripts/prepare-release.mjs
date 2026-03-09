#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')
const packageJsonPath = resolve(rootDir, 'package.json')
const changelogPath = resolve(rootDir, 'CHANGELOG.md')

const [, , rawTarget, ...rawFlags] = process.argv
const dryRun = rawFlags.includes('--dry-run')

function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value)
  if (!match) {
    return null
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

function bumpVersion(currentVersion, releaseType) {
  if (releaseType === 'patch') {
    return {
      major: currentVersion.major,
      minor: currentVersion.minor,
      patch: currentVersion.patch + 1,
    }
  }

  if (releaseType === 'minor') {
    return {
      major: currentVersion.major,
      minor: currentVersion.minor + 1,
      patch: 0,
    }
  }

  if (releaseType === 'major') {
    return {
      major: currentVersion.major + 1,
      minor: 0,
      patch: 0,
    }
  }

  return parseVersion(releaseType)
}

function buildReleaseSection(nextVersion, releaseDate) {
  return [
    `## [${nextVersion}] - ${releaseDate}`,
    '',
    '### Added',
    '- TBD',
    '',
    '### Changed',
    '- TBD',
    '',
    '### Fixed',
    '- TBD',
    '',
  ].join('\n')
}

function updateChangelog(changelog, nextVersion, releaseDate) {
  const versionHeading = `## [${nextVersion}] - ${releaseDate}`
  if (changelog.includes(versionHeading)) {
    return changelog
  }

  const separator = '\n---\n\n'
  const insertAt = changelog.indexOf(separator)
  if (insertAt === -1) {
    throw new Error('CHANGELOG.md is missing the expected header separator.')
  }

  const before = changelog.slice(0, insertAt + separator.length)
  const after = changelog.slice(insertAt + separator.length)
  return `${before}${buildReleaseSection(nextVersion, releaseDate)}${after}`
}

function printUsage() {
  console.error('Usage: node scripts/prepare-release.mjs <patch|minor|major|x.y.z> [--dry-run]')
}

if (!rawTarget) {
  printUsage()
  process.exitCode = 1
} else {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  const currentVersion = parseVersion(packageJson.version)

  if (!currentVersion) {
    throw new Error(`Unsupported current version: ${packageJson.version}`)
  }

  const nextVersionParts = bumpVersion(currentVersion, rawTarget)
  if (!nextVersionParts) {
    printUsage()
    process.exitCode = 1
  } else {
    const nextVersion = formatVersion(nextVersionParts)
    const currentVersionString = formatVersion(currentVersion)

    if (nextVersion === currentVersionString) {
      throw new Error(`Target version ${nextVersion} matches the current version.`)
    }

    const releaseDate = new Date().toISOString().slice(0, 10)
    const nextPackageJson = {
      ...packageJson,
      version: nextVersion,
    }
    const currentChangelog = await readFile(changelogPath, 'utf8')
    const nextChangelog = updateChangelog(currentChangelog, nextVersion, releaseDate)

    if (!dryRun) {
      await writeFile(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`)
      await writeFile(changelogPath, nextChangelog)
    }

    const actionLabel = dryRun ? 'Dry run' : 'Prepared'
    console.log(`${actionLabel} release ${currentVersionString} -> ${nextVersion}`)
    console.log(`- package.json version: ${nextVersion}`)
    console.log(`- changelog section: ## [${nextVersion}] - ${releaseDate}`)
    console.log('')
    console.log('Next steps:')
    console.log('1. Fill in the new CHANGELOG section.')
    console.log('2. Run `pnpm pre-commit`.')
    console.log(`3. Commit the release prep, then tag with \`git tag v${nextVersion}\`.`)
    console.log('4. Push `main` and the new tag to trigger the GitHub Release workflow.')
  }
}
