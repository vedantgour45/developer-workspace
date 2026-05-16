const EVENT_NAME = 'dw:workspace-event'

export function subscribe(handler: (event: unknown) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
