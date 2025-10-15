"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { CheckCircle2, UploadCloud, AlertTriangle } from "lucide-react"
import { Spinner } from "./spinner"

type Props = {
  onUploaded: (count: number) => void
}

type Transaction = {
  id: number
  amount: number
  category: string
  date: string
}

const API_BASE = "http://localhost:5000"

export function UploadJson({ onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)

  const handleFileChange = async () => {
    setMessage(null)
    setCount(null)
    const file = fileRef.current?.files?.[0]
    if (!file) return

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setStatus("error")
      setMessage("Please select a valid JSON file.")
      return
    }

    try {
      setStatus("loading")
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid JSON: expected an array of transactions.")
      }
      // basic shape validation
      const valid = (parsed as Transaction[]).every(
        (t) =>
          typeof t.id === "number" &&
          typeof t.amount === "number" &&
          typeof t.category === "string" &&
          typeof t.date === "string",
      )
      if (!valid) {
        throw new Error("Invalid JSON: transactions missing required fields.")
      }

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || "Upload failed")
      }

      setStatus("success")
      setMessage("Upload successful.")
      setCount(parsed.length)
      onUploaded(parsed.length)
    } catch (err: any) {
      setStatus("error")
      setMessage(err?.message || "Something went wrong while uploading.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Transactions</CardTitle>
        <CardDescription>Accepts only JSON files with id, amount, category, and date fields.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
          <Input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            aria-label="Upload JSON file"
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="default"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            Choose JSON
          </Button>
          {status === "loading" && <Spinner label="Uploading..." />}
        </div>

        {status === "success" && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {message} {typeof count === "number" ? `(${count} transactions)` : ""}
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{message ?? "Please try again."}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
