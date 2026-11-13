import { toast } from 'sonner'

/** Uses the native share sheet when available, otherwise copies to clipboard. */
export async function shareOrCopy(data: { title: string; text?: string; url?: string }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data)
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  await copyText(data.url ?? data.text ?? '')
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  } catch {
    toast.error('Couldn’t copy — long-press the link to copy it manually.')
  }
}
