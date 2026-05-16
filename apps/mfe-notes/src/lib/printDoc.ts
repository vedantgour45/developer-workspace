/**
 * printDoc — "Download as PDF" via the Puppeteer-backed PDF service.
 *
 * The MFE POSTs the doc payload to the local pdf-service (default
 * http://localhost:5051), receives the rendered PDF as a Blob, and
 * triggers a browser download. Puppeteer drives a real headless
 * Chromium so the output respects every CSS rule the on-screen
 * preview uses — no @media-print quirks to fight.
 *
 * Override the service URL with `VITE_PDF_SERVICE_URL` in
 * apps/mfe-notes/.env.local when deploying elsewhere.
 */

const PDF_SERVICE_URL =
  (import.meta.env.VITE_PDF_SERVICE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:5051'

export interface PrintDocInput {
  title: string
  content: string
  authorName?: string | null
}

function sanitizeFilename(input: string): string {
  return (
    input
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'document'
  )
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class PdfServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PdfServiceError'
  }
}

export async function printDoc(opts: PrintDocInput): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${PDF_SERVICE_URL}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: opts.title,
        content: opts.content,
        authorName: opts.authorName ?? null,
      }),
    })
  } catch (err) {
    throw new PdfServiceError(
      `Couldn't reach the PDF service at ${PDF_SERVICE_URL}. ` +
        `Start it with: cd apps/pdf-service && npm run dev`,
      err,
    )
  }

  if (!res.ok) {
    let detail = ''
    try {
      const data = (await res.json()) as { error?: string }
      detail = data.error ? ` — ${data.error}` : ''
    } catch {
      // Body wasn't JSON; that's fine.
    }
    throw new PdfServiceError(`PDF service returned ${res.status}${detail}`)
  }

  const blob = await res.blob()
  if (blob.size === 0) {
    throw new PdfServiceError('PDF service returned an empty document.')
  }
  triggerDownload(blob, `${sanitizeFilename(opts.title || 'document')}.pdf`)
}
