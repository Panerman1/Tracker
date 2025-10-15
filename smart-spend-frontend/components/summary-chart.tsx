"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Label } from "recharts"
import { Spinner } from "./spinner"

type Props = { refreshSignal: number }

type SummaryMap = Record<string, number>
type SummaryItem = { category: string; total: number }

const API_BASE = "http://localhost:5000"

const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)

export function SummaryChart({ refreshSignal }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const SHOW_DETAILS = false

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/summary`)
        if (!res.ok) throw new Error("Failed to fetch summary")
        // Support both array and map responses
        const json = await res.json()
        let items: SummaryItem[] = []
        if (Array.isArray(json)) {
          items = json as SummaryItem[]
        } else {
          items = Object.entries(json as SummaryMap).map(([category, total]) => ({ category, total: Number(total) }))
        }
        if (active) setSummary(items ?? [])
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to fetch summary")
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [refreshSignal])

  const total = useMemo(() => summary.reduce((acc, s) => acc + (s.total || 0), 0), [summary])

  const pieData = useMemo(() => summary.map((s) => ({ name: s.category, value: s.total })), [summary])

  const selected = useMemo(() => {
    if (activeIndex == null || activeIndex < 0 || activeIndex >= summary.length) return null
    const item = summary[activeIndex]
    const percent = total ? Math.round((item.total / total) * 100) : 0
    return { ...item, percent }
  }, [activeIndex, summary, total])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading && <Spinner label="Loading summary..." />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && summary.length === 0 && (
          <div className="text-sm text-muted-foreground">No data yet. Upload transactions to see your summary.</div>
        )}

        {!loading && !error && summary.length > 0 && (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip
                    formatter={(value: any, _name: string, props: any) => {
                      const val = Number(value)
                      const percent = total ? `${Math.round((val / total) * 100)}%` : "0%"
                      return [`${formatINR(val)} (${percent})`, props?.payload?.name]
                    }}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    onClick={(_data, idx) => setActiveIndex(typeof idx === "number" ? idx : null)}
                    label={({ value }) => {
                      const v = Number(value || 0)
                      const pct = total ? Math.round((v / total) * 100) : 0
                      return pct > 0 ? `${pct}%` : ""
                    }}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={chartColors[index % chartColors.length]}
                        stroke={index === activeIndex ? "hsl(var(--foreground))" : "transparent"}
                        strokeWidth={index === activeIndex ? 2 : 1}
                        opacity={index === activeIndex ? 1 : 0.9}
                        cursor="pointer"
                      />
                    ))}
                    <Label position="center" content={() => <tspan className="text-xs">{"Category-wise"}</tspan>} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* {SHOW_DETAILS && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {summary.map((s, idx) => {
                  const percent = total ? Math.round((s.total / total) * 100) : 0
                  return (
                    <button
                      key={s.category}
                      onClick={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors ${
                        activeIndex === idx ? "border-foreground" : "border-border hover:bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{s.category}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatINR(s.total)} • {percent}%
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )} */}

            {/* {SHOW_DETAILS && selected && (
              <div className="text-sm">
                <span className="text-muted-foreground">{"Selected: "}</span>
                <span className="font-semibold text-foreground">{selected.category}</span>
                <span className="text-muted-foreground">{" — "}</span>
                <span className="text-foreground">{formatINR(selected.total)}</span>
                <span className="text-muted-foreground">{` (${selected.percent}%)`}</span>
              </div>
            )} */}

            <div className="text-sm text-muted-foreground">
              Grand Total: <span className="font-semibold text-foreground">{formatINR(total)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
