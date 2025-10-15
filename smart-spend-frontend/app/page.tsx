"use client"

import { useState } from "react"
import { UploadJson } from "@/components/upload-json"
import { SummaryChart } from "@/components/summary-chart"
import { Insights } from "@/components/insights"
import { TransactionsTable } from "@/components/transactions-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function Page() {
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [lastUploadCount, setLastUploadCount] = useState<number | null>(null)

  const handleUploaded = (count: number) => {
    setLastUploadCount(count)
    setRefreshSignal((v) => v + 1)
  }

  return (
    <main className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className={cn("text-pretty text-2xl font-semibold leading-tight md:text-3xl")}>
                Smart Spend Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload transactions, visualize spending, and get quick insights.
              </p>
            </div>
            {lastUploadCount !== null && (
              <Badge variant="secondary" className="text-sm">
                {lastUploadCount} transactions uploaded
              </Badge>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {/* Upload at the top */}
        <UploadJson onUploaded={handleUploaded} />

        {/* Two column layout: Left Chart + Total, Right Insights */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <SummaryChart refreshSignal={refreshSignal} />
          <Insights refreshSignal={refreshSignal} />
        </div>

        {/* Transactions Table full width at bottom */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable refreshSignal={refreshSignal} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
