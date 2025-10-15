"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "./spinner"

type Props = { refreshSignal: number }

type Transaction = {
  id: number
  amount: number
  category: string
  date: string
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:5000"

export function TransactionsTable({ refreshSignal }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Transaction[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/transactions`, { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch transactions")

        const raw = await res.json()
        console.log("[v0] /transactions raw payload:", raw)

        // Accept both array payloads and wrapped payloads like { transactions: [...] } or { data: [...] }
        const arr: unknown = Array.isArray(raw)
          ? raw
          : raw && Array.isArray((raw as any).transactions)
            ? (raw as any).transactions
            : raw && Array.isArray((raw as any).data)
              ? (raw as any).data
              : []

        const normalized = (Array.isArray(arr) ? arr : [])
          .map((t: any) => {
            return {
              id: Number(t?.id),
              amount: Number(t?.amount),
              category: String(t?.category ?? ""),
              date: String(t?.date ?? ""),
            }
          })
          .filter(
            (t) => Number.isFinite(t.id) && Number.isFinite(t.amount) && t.category.length > 0 && t.date.length > 0,
          )

        if (active) setData(normalized)
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to fetch transactions")
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [refreshSignal])

  const hasData = data.length > 0

  return (
    <div className="flex w-full flex-col gap-4">
      {loading && <Spinner label="Loading transactions..." />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && !hasData && (
        <div className="text-sm text-muted-foreground">No transactions yet. Upload a JSON file to get started.</div>
      )}

      {!loading && !error && hasData && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-secondary text-secondary-foreground">
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-accent/60">
                  <td className="p-3">{t.id}</td>
                  <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3 text-right font-medium">{formatINR(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
