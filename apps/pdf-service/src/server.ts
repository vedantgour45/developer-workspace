/**
 * Developer Workspace — PDF service.
 *
 * Tiny Express server that wraps Puppeteer. The mfe-notes client posts
 * a doc payload to /pdf; the service renders the doc into HTML, loads
 * it in a headless Chromium tab, and returns the printed PDF blob.
 *
 *   POST /pdf
 *     body: { title, content, authorName? }
 *     response: application/pdf attachment
 *
 *   GET /health
 *     response: { status: 'ok' }
 *
 * Browser instance is kept alive between requests so cold-start cost
 * is paid once.
 */
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer'
import { renderPrintHTML } from './renderHTML.js'

const PORT = Number(process.env.PORT ?? 5051)
const ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'

const app = express()

app.use(cors({ origin: ORIGIN }))
// Notes can hold a fair amount of markdown — 5MB is generous and
// well within Express's defaults.
app.use(express.json({ limit: '5mb' }))

// ---------- Browser lifecycle ----------
// Lazy-launch once per process. Subsequent requests reuse the same
// browser, which dramatically speeds up the 2nd+ PDF.
let browserPromise: Promise<Browser> | null = null
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const opts: LaunchOptions = {
      // CI / Docker friendly. Locally these are harmless.
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
    browserPromise = puppeteer.launch(opts)
    browserPromise.then((b) => {
      b.on('disconnected', () => {
        // Force a fresh launch next time if the underlying Chromium dies.
        browserPromise = null
      })
    })
  }
  return browserPromise
}

// ---------- Routes ----------
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

interface PdfRequestBody {
  title?: string
  content?: string
  authorName?: string | null
}

app.post('/pdf', async (req: Request, res: Response) => {
  const startedAt = Date.now()
  const { title, content, authorName } = (req.body as PdfRequestBody) ?? {}
  if (typeof content !== 'string') {
    res.status(400).json({ error: '`content` must be a string.' })
    return
  }

  let page = null
  try {
    const html = renderPrintHTML({
      title: title ?? 'Untitled',
      content,
      authorName: authorName ?? null,
    })

    const browser = await getBrowser()
    page = await browser.newPage()
    // setContent + waitUntil networkidle0 gives the Google Fonts
    // @import enough time to fetch and apply before we snapshot.
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 })
    // Belt-and-braces — explicitly wait for font loading.
    await page.evaluateHandle('document.fonts.ready')

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    })

    const filename = sanitizeFilename(title || 'document')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}.pdf`,
    )
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(pdf))
    console.log(`[pdf] ${filename}.pdf · ${pdf.length}B · ${Date.now() - startedAt}ms`)
  } catch (err) {
    console.error('[pdf] error:', err)
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'PDF generation failed.' })
  } finally {
    if (page) {
      try {
        await page.close()
      } catch {
        // The page may already be gone if Chromium crashed — ignore.
      }
    }
  }
})

// ---------- Boot ----------
const server = app.listen(PORT, () => {
  console.log(`[pdf] service listening on http://localhost:${PORT}`)
  console.log(`[pdf] allowed origin: ${ORIGIN}`)
})

// ---------- Cleanup ----------
async function shutdown(signal: string) {
  console.log(`[pdf] received ${signal}, shutting down…`)
  server.close()
  if (browserPromise) {
    try {
      const browser = await browserPromise
      await browser.close()
    } catch {
      // Already closed.
    }
  }
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

// ---------- Helpers ----------
function sanitizeFilename(input: string): string {
  // Strip filesystem-hostile characters; collapse whitespace.
  return (
    input
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'document'
  )
}
