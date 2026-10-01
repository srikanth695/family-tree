"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => undefined) }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = ({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) => {
  const ctx = React.useContext(DialogContext)
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => ctx?.onOpenChange(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          ctx?.onOpenChange(true)
        }
      }}
    >
      {children}
    </span>
  )
}

const DialogContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const ctx = React.useContext(DialogContext)
  if (!ctx?.open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) ctx.onOpenChange(false)
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative w-full max-w-lg rounded-lg border border-stone-200 bg-white p-6 text-stone-900 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100", className)}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger }
