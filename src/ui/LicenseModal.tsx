import { useEffect, useRef, useState, type RefObject } from 'react'
import { LICENSE_CONTENT } from './licenseContent'

interface LicenseModalProps {
  onClose: () => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

export function LicenseModal({ onClose, returnFocusRef }: LicenseModalProps) {
  const [textsOpen, setTextsOpen] = useState(false)
  const modalRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [onClose, returnFocusRef])

  return (
    <div className="license-modal-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={modalRef} className="license-modal" role="dialog" aria-modal="true" aria-labelledby="license-modal-title">
        <header className="license-modal-header">
          <h2 id="license-modal-title">License</h2>
          <button ref={closeButtonRef} type="button" className="license-close" aria-label="License 닫기" onClick={onClose}>×</button>
        </header>
        <div className="license-modal-body" tabIndex={0}>
          {LICENSE_CONTENT.ok ? (
            <>
              <section>
                <h3>Party Night Copyright</h3>
                <div className="license-text-block">{LICENSE_CONTENT.content.basicText}</div>
              </section>
              <section>
                <h3>Third-Party Software</h3>
                <div className="license-text-block">{LICENSE_CONTENT.content.thirdPartyText}</div>
              </section>
              <section>
                <button
                  type="button"
                  className="license-disclosure"
                  aria-expanded={textsOpen}
                  aria-controls="third-party-license-texts"
                  onClick={() => setTextsOpen((open) => !open)}
                >
                  Third-Party License Texts
                </button>
                {textsOpen && (
                  <pre id="third-party-license-texts" className="license-runtime-texts" role="region" aria-label="제3자 라이선스 원문" tabIndex={0}>{LICENSE_CONTENT.content.runtimeLicenseTexts}</pre>
                )}
                <a className="license-notice-link" href={LICENSE_CONTENT.content.noticesUrl} target="_blank" rel="noreferrer">전체 notice 파일 열기</a>
              </section>
            </>
          ) : <p className="license-load-error">라이선스 정보를 불러오지 못했습니다.</p>}
        </div>
        <footer className="license-modal-actions"><button type="button" onClick={onClose}>닫기</button></footer>
      </section>
    </div>
  )
}
