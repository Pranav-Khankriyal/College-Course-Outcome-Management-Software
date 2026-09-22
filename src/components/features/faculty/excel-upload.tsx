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
  const [pendingPayload, setPendingPayload] = useState<any>(null)

  const parseExcelFile = async (file: File) => {
    setLoading(true)
    setImportMsg(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

        // Find the start of the table looking for "S.No."
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          if (rows[i] && rows[i][0] === 'S.No.') {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          setImportMsg({ type: 'error', text: 'Invalid template: Could not find "S.No." header row.' })
          setLoading(false)
          return
        }

        const coRow = rows[headerRowIdx]
        const qRow = rows[headerRowIdx + 1]
        const marksRow = rows[headerRowIdx + 2]

        // Extract mappings dynamically
        const questions = []
        for (let col = 3; col < coRow.length; col++) {
          const co = String(coRow[col] || '').trim()
          if (co.toLowerCase() === 'total') break;
          
          const q = String(qRow?.[col] || '').trim()
          const max = Number(marksRow?.[col] || 0)
          
          if (co && co.startsWith('CO') && q) {
            questions.push({ col, coCode: co, questionName: q, maxMarks: isNaN(max) ? 0 : max })
          }
        }

        if (questions.length === 0) {
          setImportMsg({ type: 'error', text: 'No Course Outcomes / Questions found in the template.' })
          setLoading(false)
          return
        }

        const studentsData = []
        let hasMissingMarks = false

        // Data usually starts a few rows below header. Let's find S.No '1'
        let dataStartIdx = headerRowIdx + 3;
        for (let i = headerRowIdx + 3; i < Math.min(headerRowIdx + 15, rows.length); i++) {
          if (rows[i] && (rows[i][0] == 1 || rows[i][0] == '1')) {
            dataStartIdx = i;
            break;
          }
        }

        for (let i = dataStartIdx; i < rows.length; i++) {
          const row = rows[i]
          if (!row || !row[1]) continue // Skip empty rows or rows without PRN
          
          const prn = String(row[1]).trim()
          const name = `Student ${prn}` // The template omits names; using PRN as a placeholder
          
          const marks = questions.map(q => {
            const val = row[q.col]
            const isEmpty = val === undefined || val === null || String(val).trim() === ''
            
            if (isEmpty) {
              hasMissingMarks = true
            }

            // Handle absent students ("A") or missing
            const obtained = (val === 'A' || val === 'a' || isEmpty) ? 0 : Number(val || 0)
            return {
              questionName: q.questionName,
              coCode: q.coCode,
              maxMarks: q.maxMarks,
              obtained: isNaN(obtained) ? 0 : obtained
            }
          })
          
          studentsData.push({ name, rollNumber: prn, marks })
        }

        if (studentsData.length > 0) {
          const assessmentNameStr = String(rows[3]?.[0] || 'Internal Assessment').replace('Assessment Sheet for ', '')
          const payload = { assessmentName: assessmentNameStr, questions, students: studentsData }
          
          if (hasMissingMarks) {
            setPendingPayload(payload)
            setLoading(false)
            return
          }

          const result = await importMarksFromExcel(offeringId, payload as any)
          if (result.success) {
            setImportMsg({ type: 'success', text: `Successfully updated marks for ${(result as any).count} students.` })
          } else {
            setImportMsg({ type: 'error', text: (result as any).error || 'Import failed. Please try again.' })
          }
        } else {
          setImportMsg({ type: 'error', text: 'No student data found in the template.' })
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

  const confirmPendingImport = async () => {
    if (!pendingPayload) return
    setLoading(true)
    setPendingPayload(null)
    try {
      const result = await importMarksFromExcel(offeringId, pendingPayload)
      if (result.success) {
        setImportMsg({ type: 'success', text: `Successfully updated marks for ${(result as any).count} students.` })
      } else {
        setImportMsg({ type: 'error', text: (result as any).error || 'Import failed. Please try again.' })
      }
    } catch (err) {
      setImportMsg({ type: 'error', text: 'Import failed.' })
    } finally {
      setLoading(false)
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
              Supports the official UT Assessment template structure.
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

      {/* Confirmation Modal for Missing Marks */}
      {pendingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(14, 21, 38, 0.45)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl border border-black/5 shadow-md p-6 w-full max-w-md shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(35, 92%, 53%, 0.15)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'hsl(35, 92%, 53%)' }} />
              </div>
              <h2 className="text-[15px] font-semibold text-foreground">Missing Student Data</h2>
            </div>
            <p className="text-[13px] text-muted-foreground mb-6 pl-13">
              We detected empty or missing mark cells in your Excel file. Shall we proceed by marking those students as absent (0 marks) for the missing questions?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPendingPayload(null)}
                className="px-4 py-2 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingImport}
                className="px-4 py-2 rounded text-[13px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: 'hsl(35, 92%, 53%)' }}
              >
                Yes, Mark as Absent
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
