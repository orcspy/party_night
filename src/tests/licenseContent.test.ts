import { describe, expect, it } from 'vitest'
import licenseAuditSummary from '../../LICENSE_AUDIT_SUMMARY.md?raw'
import licenseScreenText from '../../GAME_LICENSE_SCREEN_TEXT.md?raw'
import projectLicense from '../../LICENSE?raw'
import thirdPartyNotices from '../../THIRD_PARTY_NOTICES.md?raw'
import { buildLicenseScreenContent, extractRuntimeLicenseTexts, LICENSE_CONTENT, parseLicenseScreenText } from '../ui/licenseContent'

const COMPONENTS = [
  'React 19.0.0 — MIT', 'React DOM 19.0.0 — MIT', 'Scheduler 0.25.0 — MIT', 'Phaser 3.90.0 — MIT',
  'EventEmitter3 5.0.4 — MIT', 'Matter.js 0.20.0 — MIT', 'poly-decomp.js 0.3.0 — MIT', 'Earcut 2.2.4 — ISC',
]

describe('license screen content', () => {
  it('builds the final screen and runtime notice sections without excluded content', () => {
    const result = buildLicenseScreenContent(licenseScreenText, thirdPartyNotices, '/party_night/assets/THIRD_PARTY_NOTICES.md')
    expect(result.ok).toBe(true)
    expect(LICENSE_CONTENT.ok).toBe(true)
    if (!result.ok) return
    expect(result.content.basicText).toContain('Copyright © 2026 orcspy.\nAll Rights Reserved.')
    expect(result.content.basicText).toContain('orcspy에게 있습니다.')
    for (const component of COMPONENTS) expect(result.content.thirdPartyText).toContain(component)
    expect(result.content.runtimeLicenseTexts).toContain('## 2. React / React DOM / Scheduler')
    expect(result.content.runtimeLicenseTexts).toContain('## 7. Earcut')
    expect(result.content.runtimeLicenseTexts).toContain('Permission is hereby granted')
    expect(result.content.runtimeLicenseTexts).toContain('Permission to use, copy, modify, and/or distribute')
    for (const excluded of ['Development-only direct dependencies', '## 9. Project assets', '## 10. Maintenance rule', 'TypeScript', 'Vitest']) {
      expect(`${result.content.basicText}\n${result.content.thirdPartyText}\n${result.content.runtimeLicenseTexts}`).not.toContain(excluded)
    }
  })

  it('keeps final repository documents independent and normalizes line endings', () => {
    const lf = parseLicenseScreenText(licenseScreenText)
    const crlf = parseLicenseScreenText(licenseScreenText.replaceAll('\n', '\r\n'))
    expect(crlf).toEqual(lf)
    expect(projectLicense).toContain('Copyright © 2026 송현도 (orcspy).')
    expect(lf?.basicText).toContain('Copyright © 2026 orcspy.')
    for (const component of COMPONENTS) {
      const [name, version] = component.split(' — ')[0].split(/ (?=\d)/)
      expect(licenseAuditSummary.toLowerCase()).toContain(name.toLowerCase().replace('react dom', 'react-dom'))
      expect(licenseAuditSummary).toContain(version)
    }
  })

  it('fails closed for malformed inputs, mismatched content, and inline notice URLs', () => {
    expect(buildLicenseScreenContent('', thirdPartyNotices, '/notice.md')).toEqual({ ok: false, content: null })
    expect(buildLicenseScreenContent(licenseScreenText.replace('React 19.0.0', 'React 18.0.0'), thirdPartyNotices, '/notice.md')).toEqual({ ok: false, content: null })
    expect(buildLicenseScreenContent(licenseScreenText, thirdPartyNotices, 'data:text/plain,notice')).toEqual({ ok: false, content: null })
    expect(extractRuntimeLicenseTexts(thirdPartyNotices.replace('## 8. Development-only direct dependencies', '## 8. Removed'))).toBeNull()
  })
})
