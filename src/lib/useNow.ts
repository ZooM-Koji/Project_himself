import { useEffect, useState } from 'react'

/** Текущее время, обновляется раз в 30 секунд (для таймеров и линии «сейчас»). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
