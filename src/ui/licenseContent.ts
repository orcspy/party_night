import licenseScreenText from '../../GAME_LICENSE_SCREEN_TEXT.md?raw'
import thirdPartyNotices from '../../THIRD_PARTY_NOTICES.md?raw'
import thirdPartyNoticesUrl from '../../THIRD_PARTY_NOTICES.md?url&no-inline'

export interface LicenseScreenContent {
  basicText: string
  thirdPartyText: string
  runtimeLicenseTexts: string
  noticesUrl: string
}

export type LicenseContentResult =
  | { ok: true; content: LicenseScreenContent }
  | { ok: false; content: null }

const RUNTIME_COMPONENTS = [
  ['React', '19.0.0', 'MIT'],
  ['React DOM', '19.0.0', 'MIT'],
  ['Scheduler', '0.25.0', 'MIT'],
  ['Phaser', '3.90.0', 'MIT'],
  ['EventEmitter3', '5.0.4', 'MIT'],
  ['Matter.js', '0.20.0', 'MIT'],
  ['poly-decomp.js', '0.3.0', 'MIT'],
  ['Earcut', '2.2.4', 'ISC'],
] as const

const REQUIRED_COPYRIGHTS = [
  'Meta Platforms, Inc. and affiliates.',
  '2024 Richard Davey, Phaser Studio Inc.',
  '2014 Arnout Kazemier',
  'Liam Brummitt and contributors.',
  '2013 Stefan Hedman',
  '2016, Mapbox',
] as const

function normalize(source: string): string {
  return source.replaceAll('\r\n', '\n')
}

function occurrences(source: string, value: string): number {
  return source.split(value).length - 1
}

function extractSingleTextFence(source: string, heading: string): string | null {
  const normalized = normalize(source)
  const marker = `${heading}\n`
  if (occurrences(normalized, marker) !== 1) return null
  const start = normalized.indexOf(marker) + marker.length
  const nextHeading = normalized.indexOf('\n## ', start)
  const section = normalized.slice(start, nextHeading === -1 ? normalized.length : nextHeading)
  const fences = [...section.matchAll(/```text\n([\s\S]*?)\n```/g)]
  if (fences.length !== 1) return null
  return fences[0][1].replace(/^\n+|\n+$/g, '')
}

export function parseLicenseScreenText(source: string): Pick<LicenseScreenContent, 'basicText' | 'thirdPartyText'> | null {
  const basicText = extractSingleTextFence(source, '## 기본 화면')
  const thirdPartyText = extractSingleTextFence(source, '## Third-Party Software')
  if (!basicText || !thirdPartyText) return null

  const requiredBasic = ['Copyright © 2026 orcspy.', 'All Rights Reserved.', 'orcspy에게 있습니다.']
  const forbidden = ['GAME_LICENSE_SCREEN_CONTENT.md', '[COPYRIGHT HOLDER]', '송현도 (orcspy)', 'TypeScript', 'Vite', 'Vitest', '@types/', 'Disclaimer']
  if (requiredBasic.some((text) => !basicText.includes(text))) return null
  if (RUNTIME_COMPONENTS.some(([name, version, license]) => !thirdPartyText.includes(`${name} ${version} — ${license}`))) return null
  if (forbidden.some((text) => basicText.includes(text) || thirdPartyText.includes(text))) return null
  return { basicText, thirdPartyText }
}

export function extractRuntimeLicenseTexts(source: string): string | null {
  const normalized = normalize(source)
  const startMarker = '## 2. React / React DOM / Scheduler'
  const endMarker = '## 8. Development-only direct dependencies'
  if (occurrences(normalized, startMarker) !== 1 || occurrences(normalized, '## 7. Earcut') !== 1 || occurrences(normalized, endMarker) !== 1) return null
  const start = normalized.indexOf(startMarker)
  const end = normalized.indexOf(endMarker)
  if (start < 0 || end <= start) return null
  const runtimeText = normalized.slice(start, end).trim().replace(/\n---\s*$/, '').trim()

  if (RUNTIME_COMPONENTS.some(([name, version]) => !runtimeText.includes(`${name} ${version}`))) return null
  if (REQUIRED_COPYRIGHTS.some((text) => !runtimeText.includes(text))) return null
  if (!runtimeText.includes('Permission is hereby granted') || !runtimeText.includes('Permission to use, copy, modify, and/or distribute')) return null
  if (!runtimeText.includes('THE SOFTWARE IS PROVIDED "AS IS"') || !runtimeText.includes('THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES')) return null
  if (['Development-only direct dependencies', '## 9. Project assets', '## 10. Maintenance rule'].some((text) => runtimeText.includes(text))) return null
  return runtimeText
}

export function buildLicenseScreenContent(screenSource: string, noticesSource: string, noticesUrl: string): LicenseContentResult {
  const screen = parseLicenseScreenText(screenSource)
  const runtimeLicenseTexts = extractRuntimeLicenseTexts(noticesSource)
  if (!screen || !runtimeLicenseTexts || !noticesUrl.trim() || noticesUrl.startsWith('data:')) return { ok: false, content: null }
  return {
    ok: true,
    content: { ...screen, runtimeLicenseTexts, noticesUrl },
  }
}

export const LICENSE_CONTENT = buildLicenseScreenContent(licenseScreenText, thirdPartyNotices, thirdPartyNoticesUrl)
