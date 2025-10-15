"use client"

import { Loader2 } from "lucide-react"

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  )
}
