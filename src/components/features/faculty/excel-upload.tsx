'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileSpreadsheet, Check, AlertCircle, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importMarksFromExcel } from '@/app/actions/marks'

export function ExcelUpload({ offeringId }: { offeringId: string }) {
  const [isDragging, setIsDragging] = useState(false)
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const parseExcelFile = async (file: File) => {
    setLoading(true)
    setImportMsg(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

        if (rows.length === 0) {
          setImportMsg({ type: 'error', text: 'Excel file is empty.' })
          setLoading(false)
          return
        }

        const studentsData = []
        for (const row of rows) {
          const name = String(row['Name'] || row['name'] || row['Student Name'] || '').trim()
          const rollNumber = String(row['Roll Number'] || row['Roll No'] || row['rollNumber'] || row['PRN'] || row['prn'] || '').trim()
          if (!name || !rollNumber) continue

          const parseCO = (key: string, max: number) => {
            const val = Number(row[key] || row[key.toUpperCase()] || 0)
            return Math.min(max, Math.max(0, isNaN(val) ? 0 : Math.round(val)))
          }

          studentsData.push({
            name, rollNumber,
            co1: parseCO('CO1', 6), co2: parseCO('CO2', 6), co3: parseCO('CO3', 7),
            co4: parseCO('CO4', 6), co5: parseCO('CO5', 6), co6: parseCO('CO6', 7),
          })
        }

        if (studentsData.length > 0) {
          const result = await importMarksFromExcel(offeringId, studentsData)
          if (result.success) {
            setImportMsg({ type: 'success', text: `Successfully imported ${result.count} students with marks.` })
          } else {
            setImportMsg({ type: 'error', text: 'Import failed. Please try again.' })
          }
        } else {
          setImportMsg({ type: 'error', text: 'No valid rows found. Ensure columns: Name, Roll Number/PRN, CO1-CO6.' })
        }
      } catch (err) {
        console.error(err)
        setImportMsg({ type: 'error', text: 'Failed to parse Excel file. Please check the format.' })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseExcelFile(file)
    } else {
      setImportMsg({ type: 'error', text: 'Please drop an Excel (.xlsx, .xls) or CSV file.' })
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('excel-upload')?.click()}
        className={`relative border border-dashed rounded-md p-7 text-center transition-colors duration-150 cursor-pointer ${
          loading ? 'opacity-50 pointer-events-none' : ''
        }`}
        style={{
          borderColor: isDragging ? 'hsl(221, 83%, 53%)' : 'hsl(220, 14%, 82%)',
          backgroundColor: isDragging ? 'hsl(221 83% 53% / 0.04)' : 'hsl(220, 20%, 98%)',
        }}
      >
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) parseExcelFile(file)
            e.target.value = ''
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="p-2.5 rounded" style={{ backgroundColor: isDragging ? 'hsl(221 83% 53% / 0.12)' : 'hsl(220, 17%, 93%)' }}>
            {loading ? (
              <div className="btn-spinner w-5 h-5" style={{ borderTopColor: 'hsl(221, 83%, 53%)', borderColor: 'hsl(221 83% 53% / 0.2)' }} />
            ) : (
              <FileSpreadsheet className="w-5 h-5" style={{ color: isDragging ? 'hsl(221, 83%, 53%)' : 'hsl(220, 12%, 55%)' }} />
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">
              {loading ? 'Processing file…' : isDragging ? 'Drop the file here' : 'Import Excel / CSV'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Drag & drop or click to browse · .xlsx, .xls, .csv
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Required columns: Name, Roll Number (or PRN), CO1–CO6
            </p>
          </div>
        </div>
      </div>

      {importMsg && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-2 px-3.5 py-2.5 rounded text-[13px] font-medium flex items-center justify-between gap-3"
          style={importMsg.type === 'success'
            ? { backgroundColor: 'hsl(142 70% 40% / 0.08)', border: '1px solid hsl(142 70% 40% / 0.2)', color: 'hsl(142, 70%, 40%)' }
            : { backgroundColor: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.2)', color: 'hsl(0, 72%, 51%)' }
          }
        >
          <span className="flex items-center gap-2">
            {importMsg.type === 'success'
              ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            }
            {importMsg.text}
          </span>
          <button
            onClick={() => setImportMsg(null)}
            className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 text-xs"
          >
            ✕
          </button>
        </motion.div>
      )}
    </div>
  )
}
