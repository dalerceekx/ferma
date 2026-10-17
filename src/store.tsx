import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { FarmError, FarmState, validateBackup } from './logic'
import { createDemoState } from './seed'

const STORAGE_KEY = 'ferma-demo-v1'

function loadState(): FarmState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return validateBackup(JSON.parse(raw))
  } catch {
    // Buzilgan yoki eski ma'lumot — demo holatdan boshlaymiz.
  }
  return createDemoState()
}

interface Toast {
  id: number
  text: string
  kind: 'ok' | 'error'
}

interface FarmCtx {
  state: FarmState
  /** Amalni bajaradi; xato bo'lsa xabar ko'rsatadi va false qaytaradi. */
  run: (fn: (s: FarmState) => FarmState, okText?: string) => boolean
  replace: (s: FarmState) => void
  notify: (text: string, kind?: Toast['kind']) => void
  toasts: Toast[]
  saveError: boolean
}

const Ctx = createContext<FarmCtx | null>(null)

export function FarmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FarmState>(loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [saveError, setSaveError] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }, [state])

  const notify = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const run = useCallback(
    (fn: (s: FarmState) => FarmState, okText?: string) => {
      try {
        const next = fn(stateRef.current)
        stateRef.current = next
        setState(next)
        if (okText) notify(okText)
        return true
      } catch (e) {
        notify(e instanceof FarmError ? e.message : 'Kutilmagan xato yuz berdi', 'error')
        if (!(e instanceof FarmError)) console.error(e)
        return false
      }
    },
    [notify],
  )

  const replace = useCallback((s: FarmState) => {
    stateRef.current = s
    setState(s)
  }, [])

  return <Ctx.Provider value={{ state, run, replace, notify, toasts, saveError }}>{children}</Ctx.Provider>
}

export function useFarm(): FarmCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFarm must be used inside FarmProvider')
  return c
}
