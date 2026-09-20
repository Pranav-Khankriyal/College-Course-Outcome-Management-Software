'use client'

import { useState, useRef, useCallback, Fragment } from 'react'
import Image from 'next/image'
import { FileDown, FileText, Save, Eye, Edit3, ChevronDown, Clock, Loader2 } from 'lucide-react'
import { saveQuestionPaper, type QuestionPaperInput, type QuestionGroup, type QuestionData } from '@/app/actions/question-paper'
import { DEPARTMENTS } from '@/lib/constants'

// ── Types ──────────────────────────────────────────────
interface CourseOutcomeOption {
  code: string
  id: string
}

interface QuestionPaperFormProps {
  offeringId: string
  subjectName: string
  subjectCode: string
  departmentCode: string
  semester: string
  academicYear: string
  semesterLabel: string
  outcomes: CourseOutcomeOption[]
  onSaved?: () => void
}

const BT_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']

const DEPT_FULL_NAMES: Record<string, string> = {
  CSBS: 'Computer Science and Business Systems',
  AIML: 'Artificial Intelligence and Machine Learning',
  CSE: 'Computer Science and Engineering',
  IT: 'Information Technology',
}

// ── Empty question factory ──────────────────────────────
function emptyQuestion(num: string): QuestionData {
  return { questionNumber: num, question: '', maxMarks: '', co: '', btLevel: '' }
}

function defaultGroups(): QuestionGroup[] {
  return [
    {
      main: [emptyQuestion('Q1')],
      alternative: [emptyQuestion('Q1')],
    },
    {
      main: [emptyQuestion('Q2')],
      alternative: [emptyQuestion('Q2')],
    },
    {
      main: [emptyQuestion('Q3')],
      alternative: [emptyQuestion('Q3')],
    },
  ]
}

// ── Component ──────────────────────────────────────────
export function QuestionPaperForm({
  offeringId,
  subjectName,
  subjectCode,
  departmentCode,
  semester,
  academicYear,
  semesterLabel,
  outcomes,
  onSaved,
}: QuestionPaperFormProps) {
  // Form state
  const [department, setDepartment] = useState(departmentCode)
  const [unitTest, setUnitTest] = useState('')
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState('')
  const [maxMarks, setMaxMarks] = useState('')
  const [minMarks, setMinMarks] = useState('')
  const [examination, setExamination] = useState(academicYear)
  const [localSemester, setLocalSemester] = useState(semesterLabel)
  const [localSubjectName, setLocalSubjectName] = useState(subjectName)
  const [groups, setGroups] = useState<QuestionGroup[]>(defaultGroups())
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const printRef = useRef<HTMLDivElement>(null)

  // ── Helpers ──────────────────────────────────────────
  const updateQuestion = useCallback((
    groupIdx: number,
    section: 'main' | 'alternative',
    qIdx: number,
    field: keyof QuestionData,
    value: string
  ) => {
    setGroups(prev => {
      const next = structuredClone(prev)
      next[groupIdx][section][qIdx][field] = value
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)

    const input: QuestionPaperInput = {
      courseOfferingId: offeringId,
      unitTest,
      semester: localSemester,
      department,
      subjectName: localSubjectName,
      date,
      duration,
      maxMarks,
      minMarks,
      examination,
      questionGroups: groups,
    }

    const result = await saveQuestionPaper(input)
    setSaving(false)

    if (result.error) {
      setSaveResult({ error: result.error })
    } else {
      setSaveResult({ success: true })
      onSaved?.()
    }
  }

  const handlePrintPDF = () => {
    window.print()
  }

  const handleDownloadDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, HeadingLevel } = await import('docx')
    const { saveAs } = await import('file-saver')

    // Fetch the logo as an ArrayBuffer
    let logoBuffer: ArrayBuffer | null = null
    try {
      const response = await fetch('/bv-logo.png')
      logoBuffer = await response.arrayBuffer()
    } catch {
      // Logo fetch failed, continue without it
    }

    // Build header paragraphs
    const headerChildren: InstanceType<typeof Paragraph>[] = []

    if (logoBuffer) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 60, height: 60 },
              type: 'png',
            }),
          ],
        })
      )
    }

    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'Bharati Vidyapeeth', bold: true, size: 32, font: 'Old English Text MT' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({ text: '(Deemed to be University)', italics: true, size: 20, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({ text: 'Department of Engineering and Technology', bold: true, size: 20, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `B.Tech- ${DEPT_FULL_NAMES[department] || department}`, bold: true, size: 20, font: 'Times New Roman' }),
          new TextRun({ text: `          Examination: ${examination}`, size: 20, font: 'Times New Roman' }),
        ],
      }),
      // Metadata line 1
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `Sem: ${localSemester}          Unit Test: ${unitTest}          Date: ${date}          Duration: ${duration}`, size: 20, font: 'Times New Roman' }),
        ],
      }),
      // Metadata line 2
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `Max. Marks: ${maxMarks}          Min Marks: ${minMarks}          Subject: ${localSubjectName}`, size: 20, font: 'Times New Roman' }),
        ],
      })
    )

    // Build question table rows
    const cellBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    }

    // Header row
    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Q. No.', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 800, type: WidthType.DXA }, borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Question', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 5400, type: WidthType.DXA }, borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Max Marks', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 900, type: WidthType.DXA }, borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CO', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 600, type: WidthType.DXA }, borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BT Level', bold: true, size: 20, font: 'Times New Roman' })] })], width: { size: 900, type: WidthType.DXA }, borders: cellBorders }),
      ],
    })

    const tableRows: InstanceType<typeof TableRow>[] = [headerRow]

    const makeQuestionRow = (q: QuestionData) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.questionNumber, bold: true, size: 20, font: 'Times New Roman' })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.question, size: 20, font: 'Times New Roman' })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.maxMarks, size: 20, font: 'Times New Roman' })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.co, size: 20, font: 'Times New Roman' })] })], borders: cellBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.btLevel, size: 20, font: 'Times New Roman' })] })], borders: cellBorders }),
      ],
    })

    const makeOrRow = () => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'OR', bold: true, size: 20, font: 'Times New Roman' })] })],
          columnSpan: 5,
          borders: cellBorders,
        }),
      ],
    })

    for (const group of groups) {
      for (const q of group.main) {
        tableRows.push(makeQuestionRow(q))
      }
      tableRows.push(makeOrRow())
      for (const q of group.alternative) {
        tableRows.push(makeQuestionRow(q))
      }
    }

    const table = new Table({
      rows: tableRows,
      width: { size: 8600, type: WidthType.DXA },
    })

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [...headerChildren, table],
      }],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${unitTest || 'UT'}_${localSubjectName.replace(/\s+/g, '_')}_Question_Paper.docx`)
  }

  const deptFullName = DEPT_FULL_NAMES[department] || department

  // ── Render helpers ──────────────────────────────────
  const renderInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    width?: string,
    type?: string,
  ) => {
    if (mode === 'preview') {
      return (
        <span style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          borderBottom: '1px solid #999',
          minWidth: width || '100px',
          display: 'inline-block',
          padding: '1px 4px',
          color: value ? '#000' : '#999',
        }}>
          {value || placeholder}
        </span>
      )
    }
    return (
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          border: 'none',
          borderBottom: '1px solid transparent',
          outline: 'none',
          padding: '2px 4px',
          width: width || '100px',
          backgroundColor: 'transparent',
          color: '#000',
        }}
      />
    )
  }

  const renderSelect = (
    value: string,
    onChange: (v: string) => void,
    options: { label: string; value: string }[],
    placeholder: string,
    width?: string,
  ) => {
    if (mode === 'preview') {
      return (
        <span style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          borderBottom: '1px solid #999',
          minWidth: width || '70px',
          display: 'inline-block',
          padding: '1px 4px',
          color: value ? '#000' : '#999',
        }}>
          {value || placeholder}
        </span>
      )
    }
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          border: 'none',
          outline: 'none',
          padding: '2px 4px',
          width: width || '70px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          appearance: 'none',
          color: value ? '#000' : '#777',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  const renderTextarea = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => {
    if (mode === 'preview') {
      return (
        <span style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          color: value ? '#000' : '#999',
          whiteSpace: 'pre-wrap',
        }}>
          {value || placeholder}
        </span>
      )
    }
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          border: 'none',
          outline: 'none',
          padding: '4px',
          width: '100%',
          backgroundColor: 'transparent',
          resize: 'vertical',
          minHeight: '20px',
          color: '#000',
        }}
      />
    )
  }

  // ── Question row ───────────────────────────────────
  const renderQuestionRow = (
    q: QuestionData,
    groupIdx: number,
    section: 'main' | 'alternative',
    qIdx: number,
  ) => (
    <tr key={`${groupIdx}-${section}-${qIdx}`}>
      <td style={{
        border: '1px solid #000',
        padding: '3px 4px',
        fontFamily: 'Times New Roman, serif',
        fontSize: '11px',
        fontWeight: 700,
        textAlign: 'center',
        verticalAlign: 'top',
        width: '55px',
      }}>
        {q.questionNumber}.
      </td>
      <td style={{
        border: '1px solid #000',
        padding: '3px 4px',
        fontFamily: 'Times New Roman, serif',
        fontSize: '11px',
        verticalAlign: 'top',
      }}>
        {renderTextarea(
          q.question,
          (v) => updateQuestion(groupIdx, section, qIdx, 'question', v),
          '(Type question here)'
        )}
      </td>
      <td style={{
        border: '1px solid #000',
        padding: '3px 4px',
        fontFamily: 'Times New Roman, serif',
        fontSize: '11px',
        textAlign: 'center',
        verticalAlign: 'top',
        width: '70px',
      }}>
        {renderInput(
          q.maxMarks,
          (v) => updateQuestion(groupIdx, section, qIdx, 'maxMarks', v),
          '',
          '50px',
          'number'
        )}
      </td>
      <td style={{
        border: '1px solid #000',
        padding: '3px 4px',
        textAlign: 'center',
        verticalAlign: 'top',
        width: '70px',
      }}>
        {renderSelect(
          q.co,
          (v) => updateQuestion(groupIdx, section, qIdx, 'co', v),
          outcomes.map(o => ({ label: o.code, value: o.code })),
          'CO',
          '60px'
        )}
      </td>
      <td style={{
        border: '1px solid #000',
        padding: '3px 4px',
        textAlign: 'center',
        verticalAlign: 'top',
        width: '80px',
      }}>
        {renderSelect(
          q.btLevel,
          (v) => updateQuestion(groupIdx, section, qIdx, 'btLevel', v),
          BT_LEVELS.map(l => ({ label: l, value: l })),
          'BT',
          '55px'
        )}
      </td>
    </tr>
  )

  // ── OR row ──────────────────────────────────────────
  const renderOrRow = () => (
    <tr>
      <td
        colSpan={5}
        style={{
          border: '1px solid #000',
          padding: '2px',
          textAlign: 'center',
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: '#f8f8f8',
        }}
      >
        OR
      </td>
    </tr>
  )

  // ── Main render ─────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid hsl(220, 14%, 87%)',
            background: mode === 'preview' ? 'hsl(221 83% 53% / 0.1)' : 'white',
            color: mode === 'preview' ? 'hsl(221, 83%, 53%)' : 'hsl(222, 47%, 11%)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          {mode === 'edit' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          {mode === 'edit' ? 'Preview' : 'Edit'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'hsl(142, 70%, 40%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'all 150ms ease',
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save & Map COs'}
        </button>

        <button
          onClick={handlePrintPDF}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid hsl(220, 14%, 87%)',
            background: 'white',
            color: 'hsl(222, 47%, 11%)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <FileDown className="w-4 h-4" />
          Download PDF
        </button>

        <button
          onClick={handleDownloadDocx}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid hsl(220, 14%, 87%)',
            background: 'white',
            color: 'hsl(222, 47%, 11%)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <FileText className="w-4 h-4" />
          Download Word
        </button>

        {saveResult?.success && (
          <span style={{ fontSize: '12px', color: 'hsl(142, 70%, 36%)', fontWeight: 500 }}>
            ✓ Saved successfully! COs mapped to {unitTest || 'UT'}.
          </span>
        )}
        {saveResult?.error && (
          <span style={{ fontSize: '12px', color: 'hsl(0, 72%, 48%)', fontWeight: 500 }}>
            ✗ {saveResult.error}
          </span>
        )}
      </div>

      {/* ── Question Paper Template ─────────────────── */}
      <div
        ref={printRef}
        className="question-paper-preview shadow-lg"
        style={{
          width: '210mm',
          minHeight: '148.5mm',
          margin: '0 auto',
          background: '#fff',
          padding: '6mm 10mm',
          border: '2px solid #000',
          fontFamily: 'Times New Roman, serif',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ── Header ────────────────────────────────── */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '8px' }}>
          {/* Logo absolutely positioned on the left */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bv-logo.png"
            alt="Bharati Vidyapeeth Logo"
            style={{ position: 'absolute', left: '10px', top: '0', width: '105px', height: '105px', objectFit: 'contain' }}
          />

          {/* Centered Text */}
          <h1 style={{
            fontFamily: "'Old English Text MT', 'UnifrakturCook', serif",
            fontSize: '40px',
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.1,
            color: '#000',
          }}>
            Bharati Vidyapeeth
          </h1>
          <p style={{
            fontFamily: 'Times New Roman, serif',
            fontSize: '14px',
            fontStyle: 'italic',
            margin: '2px 0',
            color: '#000',
          }}>
            (Deemed to be University)
          </p>
          <p style={{
            fontFamily: 'Times New Roman, serif',
            fontSize: '15px',
            fontWeight: 700,
            margin: '2px 0',
            color: '#000',
          }}>
            Department of Engineering and Technology
          </p>

          {/* B.Tech Centered, Examination Right-Aligned */}
          <div style={{ position: 'relative', marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: '14px',
              fontWeight: 700,
              color: '#000',
            }}>
              B.Tech-{' '}
              {mode === 'edit' ? (
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  style={{
                    fontFamily: 'Times New Roman, serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    outline: 'none',
                    padding: '0px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{DEPT_FULL_NAMES[d] || d}</option>
                  ))}
                </select>
              ) : (
                <span>{deptFullName}</span>
              )}
            </div>
            
            <div style={{
              position: 'absolute',
              right: '0',
              bottom: '0',
              fontFamily: 'Times New Roman, serif',
              fontSize: '13px',
              fontWeight: 700,
              color: '#000',
            }}>
              Examination:{' '}
              {renderInput(examination, setExamination, '____', '70px')}
            </div>
          </div>
        </div>

        {/* ── Thick Horizontal Line ────────────────────── */}
        <div style={{ borderBottom: '2px solid #000', marginBottom: '6px' }} />

        {/* ── Metadata rows ────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '8px 16px',
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          marginBottom: '4px',
          color: '#000',
          fontWeight: 700,
        }}>
          <div>Sem: {renderInput(localSemester, setLocalSemester, semesterLabel, '60px')}</div>
          <div>Unit Test: {renderInput(unitTest, setUnitTest, '____', '50px')}</div>
          <div>Date: {renderInput(date, setDate, '____', '80px')}</div>
          <div>Duration: {renderInput(duration, setDuration, '____', '60px')}</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 2fr',
          gap: '8px 16px',
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          marginBottom: '8px',
          color: '#000',
          fontWeight: 700,
        }}>
          <div>Max. Marks: {renderInput(maxMarks, setMaxMarks, '____', '40px')}</div>
          <div>Min Marks: {renderInput(minMarks, setMinMarks, '____', '40px')}</div>
          <div>Subject: {renderInput(localSubjectName, setLocalSubjectName, subjectName, '200px')}</div>
        </div>


        {/* ── Questions Table ──────────────────────── */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'Times New Roman, serif',
          fontSize: '11px',
          color: '#000',
        }}>
          <thead>
            <tr>
              <th style={{
                border: '1px solid #000',
                padding: '4px 4px',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                width: '55px',
              }}>Q. No.</th>
              <th style={{
                border: '1px solid #000',
                padding: '4px 4px',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
              }}>Question</th>
              <th style={{
                border: '1px solid #000',
                padding: '4px 4px',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                width: '70px',
              }}>Max Marks</th>
              <th style={{
                border: '1px solid #000',
                padding: '4px 4px',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                width: '70px',
              }}>CO</th>
              <th style={{
                border: '1px solid #000',
                padding: '4px 4px',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                width: '80px',
              }}>BT Level</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <Fragment key={gi}>
                {group.main.map((q, qi) => renderQuestionRow(q, gi, 'main', qi))}
                {renderOrRow()}
                {group.alternative.map((q, qi) => renderQuestionRow(q, gi, 'alternative', qi))}
              </Fragment>
            ))}
          </tbody>
        </table>

      </div>

      {/* ── Instructions (only in edit mode, hidden on download) ── */}
      {mode === 'edit' && (
        <div className="no-print" style={{
          width: '210mm',
          margin: '12px auto 0 auto',
          fontFamily: 'Times New Roman, serif',
          fontSize: '9.5px',
          fontStyle: 'italic',
          color: '#666',
          lineHeight: 1.4,
          textAlign: 'center',
        }}>
          <em>Instructions for faculty:</em> fill in the blank space after Examination, Sem, Unit Test No., Date, Duration, Max/Min Marks and Subject above, type
          each question in place of the placeholder text and fill Max Marks / CO / BT Level for every question and its OR alternative.
        </div>
      )}
    </div>
  )
}

// ── Recently Generated Papers List ────────────────────
interface RecentPaper {
  id: string
  title: string
  unitTest: string
  subjectName: string
  department: string
  date: string
  createdAt: string | Date
  questionsJson: string
  semester: string
  duration: string
  maxMarks: string
  minMarks: string
  examination: string
  createdBy: { name: string }
}

export function RecentQuestionPapers({ papers }: { papers: RecentPaper[] }) {
  if (papers.length === 0) return null

  return (
    <div className="bg-card rounded-2xl border border-black/5 shadow-sm">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold text-foreground">
          Recently Generated Papers <span className="text-muted-foreground font-normal ml-1">({papers.length})</span>
        </h2>
      </div>

      <div className="divide-y divide-border/50">
        {papers.map(paper => (
          <div
            key={paper.id}
            className="px-5 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors duration-100"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded" style={{ backgroundColor: 'hsl(262 80% 55% / 0.1)' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: 'hsl(262, 80%, 55%)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {paper.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {paper.department} · {paper.semester} · {new Date(paper.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  {' · by '}{paper.createdBy.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ backgroundColor: 'hsl(262 80% 55% / 0.1)', color: 'hsl(262, 80%, 55%)' }}>
                {paper.unitTest}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
