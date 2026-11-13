import { useEffect, useState } from 'react'

/** Current time, ticking every `interval` ms. Null until mounted (keeps SSR output stable). */
export function useNow(interval = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}
