import type { StandingRow } from '@/engine'
import { toast } from 'sonner'

/** Renders standings to a PNG (canvas) and shares or downloads it. */
export async function exportStandingsImage(title: string, subtitle: string, rows: StandingRow[]) {
  const scale = 2
  const width = 720
  const rowH = 56
  const head = 170
  const height = head + rows.length * rowH + 60
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    toast.error('Image export isn’t supported in this browser.')
    return
  }
  ctx.scale(scale, scale)
  const navy = '#101a3a'
  const lime = '#d4f23a'
  ctx.fillStyle = navy
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = lime
  ctx.beginPath()
  ctx.arc(width - 70, 70, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 40px "Barlow Condensed", sans-serif'
  ctx.fillText(title.toUpperCase(), 40, 78)
  ctx.font = '500 18px Manrope, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(subtitle, 40, 110)
  ctx.font = '700 13px Manrope, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  const cols = [
    ['#', 40],
    ['PLAYER', 84],
    ['PTS', 440],
    ['P', 520],
    ['AVG', 580],
    ['W-D-L', 640],
  ] as const
  for (const [label, x] of cols) ctx.fillText(label, x, head - 14)
  rows.forEach((r, i) => {
    const y = head + i * rowH
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(24, y, width - 48, rowH)
    }
    const mid = y + rowH / 2 + 7
    ctx.fillStyle = i < 3 ? lime : 'rgba(255,255,255,0.75)'
    ctx.font = '800 22px "Barlow Condensed", sans-serif'
    ctx.fillText(String(r.rank), 40, mid)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 20px Manrope, sans-serif'
    ctx.fillText(r.name.slice(0, 26), 84, mid)
    ctx.font = '800 22px "Barlow Condensed", sans-serif'
    ctx.fillText(String(r.points), 440, mid)
    ctx.font = '500 18px Manrope, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(String(r.played), 520, mid)
    ctx.fillText(r.average.toFixed(1), 580, mid)
    ctx.fillText(`${r.wins}-${r.draws}-${r.losses}`, 640, mid)
  })
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '600 13px Manrope, sans-serif'
  ctx.fillText('PADEL FRIDAY', 40, height - 26)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) {
    toast.error('Couldn’t create the image.')
    return
  }
  const file = new File([blob], `${title.replace(/\W+/g, '-').toLowerCase()}-standings.png`, {
    type: 'image/png',
  })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast.success('Standings image downloaded')
}
