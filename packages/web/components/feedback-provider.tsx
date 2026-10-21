"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
}

type NoticeKind = "error" | "success" | "info"
type Notice = { id: number; kind: NoticeKind; message: string }

type FeedbackContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  notify: (message: string, kind?: NoticeKind) => void
}

const FeedbackContext = React.createContext<FeedbackContextValue | null>(null)

const NOTICE_MS = 6000

const noticeStyles: Record<NoticeKind, string> = {
  error: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  info: "border-stone-300 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100",
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)
  const [notices, setNotices] = React.useState<Notice[]>([])
  const nextId = React.useRef(0)

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          current?.resolve(false)
          return { options, resolve }
        })
      }),
    [],
  )

  const dismissNotice = React.useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])

  const notify = React.useCallback(
    (message: string, kind: NoticeKind = "error") => {
      const id = nextId.current++
      setNotices((current) => [...current, { id, kind, message }])
      window.setTimeout(() => dismissNotice(id), NOTICE_MS)
    },
    [dismissNotice],
  )

  const settle = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  const value = React.useMemo(() => ({ confirm, notify }), [confirm, notify])

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.options.title}</DialogTitle>
          </DialogHeader>
          {pending?.options.description && (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{pending.options.description}</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => settle(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={pending?.options.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {pending?.options.confirmLabel || "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {notices.map((notice) => (
          <div
            key={notice.id}
            role={notice.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg",
              noticeStyles[notice.kind],
            )}
          >
            <span className="flex-1">{notice.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              className="-m-1 cursor-pointer p-1 opacity-70 hover:opacity-100"
              onClick={() => dismissNotice(notice.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const ctx = React.useContext(FeedbackContext)
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider")
  }
  return ctx
}
