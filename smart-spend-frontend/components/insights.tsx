"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, TrendingUp, WalletMinimal } from "lucide-react"
import { Spinner } from "./spinner"

type Props = { refreshSignal: number }

const API_BASE = "http://localhost:5000"

export function Insights({ refreshSignal }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/insight`)
        if (!res.ok) throw new Error("Failed to fetch insights")
        const json = await res.json()
        const list: string[] = Array.isArray(json) ? json : (json?.insights ?? [])
        if (active) setInsights(list ?? [])
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to fetch insights")
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [refreshSignal])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && <Spinner label="Loading insights..." />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && insights.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No insights available yet. Upload transactions to see tips.
          </div>
        )}
        {!loading && !error && insights.length > 0 && (
          <ul className="flex list-none flex-col gap-2">
            {insights.map((txt, idx) => (
              <li key={idx} className="flex items-start gap-2 rounded-md border bg-card p-3">
                {idx % 3 === 0 ? (
                  <Lightbulb className="mt-1 h-4 w-4 text-primary" />
                ) : idx % 3 === 1 ? (
                  <TrendingUp className="mt-1 h-4 w-4 text-primary" />
                ) : (
                  <WalletMinimal className="mt-1 h-4 w-4 text-primary" />
                )}
                <span className="text-sm">{txt}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
