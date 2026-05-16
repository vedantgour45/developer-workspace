# @dw/pdf-service

Headless-Chrome PDF generator for Developer Workspace notes.

The `mfe-notes` "Download as PDF" action posts the doc payload here, the
service renders it through Puppeteer + a real Chromium instance, and
returns the printed PDF.

## Run it

```bash
cd apps/pdf-service
npm install   # first time — downloads Chromium (~170MB)
npm run dev   # tsx watch — restarts on save
# or:
npm start
```

Default port: `5051`. Override with `PORT=… npm start`.

## API

### `POST /pdf`

```jsonc
{
  "title": "Valid Parenthesis Problem From Leetcode",
  "content": "# heading\n\nmarkdown body…",
  "authorName": "shivani kherde" // optional
}
```

Returns `application/pdf` with `Content-Disposition: attachment;
filename="…pdf"`. The filename is sanitized server-side.

### `GET /health`

Returns `{ "status": "ok" }`. Used by the client to detect when the
service isn't running and surface a friendly toast.

## Environment

| Var              | Default                  | Notes                          |
| ---------------- | ------------------------ | ------------------------------ |
| `PORT`           | `5051`                   | TCP port                        |
| `ALLOWED_ORIGIN` | `*`                      | CORS — set to host origin in prod |

## How the client talks to it

The notes MFE reads `VITE_PDF_SERVICE_URL` (default
`http://localhost:5051`) from its `.env.local`. Override in deployed
environments.

## Notes

- One Chromium instance is kept warm across requests; cold start is ~1s,
  warm is ~150ms for a typical doc.
- Puppeteer waits for `document.fonts.ready` before snapshotting, so
  the Google-Fonts `@import` in the print CSS finishes loading before
  the PDF is rendered.
- Long code blocks wrap via `white-space: pre-wrap; overflow-wrap:
  anywhere` so they can't get clipped by the page edge.
