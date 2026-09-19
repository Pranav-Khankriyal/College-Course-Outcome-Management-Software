'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Users, BookOpen, Shield, GraduationCap,
  UserPlus, Edit3, ToggleLeft, ToggleRight, KeyRound, Mail, User, Eye, EyeOff, X, Check, Search,
  UserCog, Plus, Trash2, ArrowRight,
} from 'lucide-react'
import {
  createUser, updateUser, toggleUserActive, resetUserPassword,
  createSubject, updateSubject, deleteSubject,
  promoteToAdmin, demoteFromAdmin,
} from '@/app/actions/admin'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

// ---- Types ----

type Stats = {
  departmentCount: number
  userCount: number
  subjectCount: number
  sectionCount: number
  facultyCount: number
  hodCount: number
  studentCount: number
}

type Department = {
  id: string
  name: string
  code: string
  hodId: string | null
  hod: { id: string; name: string; email: string } | null
  sections: { id: string; name: string; year: string }[]
  subjects: { id: string; name: string; code: string; semester: number }[]
  _count: { sections: number; subjects: number; students: number }
}

type UserItem = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  departments: { id: string; name: string; code: string }[]
  facultyAssignments: {
    courseOffering: {
      subject: { name: string; code: string }
      section: { name: string; year: string; department: { code: string } }
    }
  }[]
}

type AcademicContext = {
  id: string
  academicYear: string
  semester: string
}

type Tab = 'departments' | 'users' | 'subjects'

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

// ---- Shared UI Atoms ----

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-80" />
}

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(14, 21, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {children}
    </motion.div>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
      style={isActive
        ? { backgroundColor: 'hsl(142 70% 40% / 0.1)', color: 'hsl(142, 70%, 40%)' }
        : { backgroundColor: 'hsl(0 72% 51% / 0.08)', color: 'hsl(0, 72%, 51%)' }
      }
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

// ---- Main Component ----

export function AdminDashboardClient({
  stats, departments, users, academicContexts,
}: {
  stats: Stats
  departments: Department[]
  users: UserItem[]
  academicContexts: AcademicContext[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('departments')

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role="ADMIN"
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab as Tab)}
        userName="Admin"
        userRole="ADMIN"
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumbs={[
          { label: 'Admin' },
          { label: activeTab === 'departments' ? 'Departments' : activeTab === 'users' ? 'Faculty & Users' : 'Subjects' },
        ]} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'departments' && <DepartmentsTab key="departments" departments={departments} />}
            {activeTab === 'users' && <UsersTab key="users" users={users} />}
            {activeTab === 'subjects' && <SubjectsTab key="subjects" departments={departments} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// ---- Departments Tab ----

function DepartmentsTab({ departments }: { departments: Department[] }) {
  const router = useRouter()
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-5">
      <h2 className="text-base font-semibold text-foreground">All Departments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((dept, i) => (
          <motion.div
            key={dept.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => router.push(`/admin/departments/${dept.id}`)}
            className="glass-card rounded-md p-4 cursor-pointer group transition-shadow duration-150 hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-[14px] font-bold text-foreground">{dept.code}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">{dept.name}</p>
              </div>
              <div className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ backgroundColor: 'hsl(221 83% 53% / 0.08)', color: 'hsl(221, 83%, 53%)' }}>
                {dept._count.students} students
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-2 rounded"
              style={{ backgroundColor: 'hsl(220, 17%, 95%)' }}>
              <Shield className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground">HOD:</span>
              {dept.hod ? (
                <span className="text-[11px] font-semibold text-foreground truncate">{dept.hod.name}</span>
              ) : (
                <span className="text-[11px] text-muted-foreground/50 italic">Not assigned</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
              <span>{dept._count.sections} sections</span>
              <span>{dept._count.subjects} subjects</span>
              <ArrowRight className="w-3 h-3 group-hover:text-primary transition-colors duration-150" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ---- Users Tab ----

function UsersTab({ users }: { users: UserItem[] }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [resetPwdUser, setResetPwdUser] = useState<UserItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<'ADMIN' | 'HOD' | 'FACULTY'>('FACULTY')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const displayedUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch && u.role === activeCategory
  })

  const handleToggleActive = async (userId: string) => {
    const result = await toggleUserActive(userId)
    if (result.success) {
      toast.success(`User ${result.isActive ? 'activated' : 'deactivated'}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update user')
    }
  }

  const handlePromoteToAdmin = async (userId: string) => {
    if (!confirm('Promote this user to Admin?')) return
    const result = await promoteToAdmin(userId)
    if (result.success) { toast.success('User promoted to Admin'); router.refresh() }
  }

  const handleDemoteFromAdmin = async (userId: string) => {
    if (!confirm('Remove this user from the Admin pool?')) return
    const result = await demoteFromAdmin(userId)
    if (result.success) { toast.success('User removed from admin pool'); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Faculty & Users</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="gradient-primary px-3.5 py-2 rounded text-[13px] font-semibold flex items-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add User
        </button>
      </div>

      {/* Category + Search */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex border border-border rounded overflow-hidden">
          {(['ADMIN', 'HOD', 'FACULTY'] as const).map(role => (
            <button
              key={role}
              onClick={() => setActiveCategory(role)}
              className="px-4 py-2 text-[12px] font-semibold transition-colors duration-150"
              style={activeCategory === role
                ? { backgroundColor: 'hsl(221, 83%, 53%)', color: 'white' }
                : { backgroundColor: 'transparent', color: 'hsl(220, 12%, 50%)' }
              }
              onMouseEnter={e => {
                if (activeCategory !== role)
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(220, 17%, 94%)'
              }}
              onMouseLeave={e => {
                if (activeCategory !== role)
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              {role === 'ADMIN' ? 'Admins' : role === 'HOD' ? 'HODs' : 'Faculty'}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 pr-3.5 py-2 rounded text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(220, 14%, 87%)' }}>
                <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Name</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Email</th>
                {activeCategory !== 'ADMIN' && (
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Assignments</th>
                )}
                <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Status</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map(user => (
                <tr key={user.id} className="hover:bg-secondary/30 transition-colors duration-100"
                  style={{ borderBottom: '1px solid hsl(220, 14%, 93%)' }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: 'hsl(221, 83%, 53%)' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{user.email}</td>
                  {activeCategory !== 'ADMIN' && (
                    <td className="px-4 py-2.5">
                      {user.facultyAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.facultyAssignments.slice(0, 2).map((a, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: 'hsl(220, 17%, 93%)', color: 'hsl(220, 12%, 50%)' }}>
                              {a.courseOffering.subject.code}
                            </span>
                          ))}
                          {user.facultyAssignments.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: 'hsl(220, 17%, 93%)', color: 'hsl(220, 12%, 50%)' }}>
                              +{user.facultyAssignments.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2.5"><StatusBadge isActive={user.isActive} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {activeCategory === 'ADMIN' ? (
                        <button
                          onClick={() => handleDemoteFromAdmin(user.id)}
                          className="p-1.5 rounded transition-colors duration-150"
                          style={{ color: 'hsl(0, 72%, 51%)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(0 72% 51% / 0.08)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                          title="Remove from Admins"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromoteToAdmin(user.id)}
                          className="p-1.5 rounded transition-colors duration-150"
                          style={{ color: 'hsl(262, 80%, 55%)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(262 80% 55% / 0.08)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                          title="Promote to Admin"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 rounded transition-colors duration-150 text-muted-foreground"
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(221 83% 53% / 0.08)'
                          ;(e.currentTarget as HTMLElement).style.color = 'hsl(221, 83%, 53%)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = ''
                          ;(e.currentTarget as HTMLElement).style.color = ''
                        }}
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResetPwdUser(user)}
                        className="p-1.5 rounded transition-colors duration-150"
                        style={{ color: 'hsl(38, 92%, 44%)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(38 92% 44% / 0.08)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className="p-1.5 rounded transition-colors duration-150"
                        style={{ color: user.isActive ? 'hsl(0, 72%, 51%)' : 'hsl(142, 70%, 40%)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = user.isActive ? 'hsl(0 72% 51% / 0.08)' : 'hsl(142 70% 40% / 0.08)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = ''}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No {activeCategory.toLowerCase()}s found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {resetPwdUser && <ResetPasswordModal user={resetPwdUser} onClose={() => setResetPwdUser(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ---- Subjects Tab ----

function SubjectsTab({ departments }: { departments: Department[] }) {
  const [selectedDept, setSelectedDept] = useState<string>(departments[0]?.id || '')
  const [addSubjectSem, setAddSubjectSem] = useState<number | null>(null)
  const router = useRouter()

  const dept = departments.find(d => d.id === selectedDept)

  const semesterGroups: Record<number, typeof departments[0]['subjects']> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
  }
  if (dept) {
    for (const sub of dept.subjects) {
      if (semesterGroups[sub.semester]) semesterGroups[sub.semester].push(sub)
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return
    const result = await deleteSubject(subjectId)
    if (result.success) { toast.success('Subject deleted'); router.refresh() }
    else toast.error(result.error || 'Failed')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Subject Management</h2>
        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="glass-input px-3.5 py-2 rounded text-sm"
        >
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
          ))}
        </select>
      </div>

      {dept && (
        <div className="space-y-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
            <div key={sem}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  style={{ borderLeft: '2px solid hsl(142, 70%, 40%)', paddingLeft: '0.5rem' }}>
                  Semester {sem}
                </h3>
                <button
                  onClick={() => setAddSubjectSem(sem)}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors duration-150"
                  style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)', color: 'hsl(142, 70%, 40%)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(142 70% 40% / 0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(142 70% 40% / 0.08)'}
                >
                  <Plus className="w-3 h-3" /> Add Subject
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {semesterGroups[sem].map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="glass-card rounded-md p-3.5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: 'hsl(142 70% 40% / 0.08)' }}>
                        <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(142, 70%, 40%)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold truncate">{sub.code}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{sub.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all duration-150 text-muted-foreground"
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(0 72% 51% / 0.08)'
                        ;(e.currentTarget as HTMLElement).style.color = 'hsl(0, 72%, 51%)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                        ;(e.currentTarget as HTMLElement).style.color = ''
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
                {semesterGroups[sem].length === 0 && (
                  <p className="text-[11px] text-muted-foreground/50 col-span-3 pl-1">No subjects for this semester.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {addSubjectSem !== null && selectedDept && (
          <AddSubjectModal
            departmentId={selectedDept}
            semester={addSubjectSem}
            onClose={() => setAddSubjectSem(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ---- Modals ----

function AddSubjectModal({ departmentId, semester, onClose }: { departmentId: string; semester: number; onClose: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !code) return
    setLoading(true)
    const result = await createSubject({ name, code, departmentId, semester })
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Subject created'); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="glass-card-strong rounded-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Add Subject — Semester {semester}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="e.g. CSBS301" className="glass-input w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Subject Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Operating Systems" className="glass-input w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Create Subject</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'HOD' | 'FACULTY'>('FACULTY')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return
    setLoading(true)
    const result = await createUser({ name, email, password, role })
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success(`User "${name}" created successfully`); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="glass-card-strong rounded-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Add New User</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name" className="glass-input w-full pl-9 pr-3.5 py-2.5 rounded text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@bvdu.edu.in" className="glass-input w-full pl-9 pr-3.5 py-2.5 rounded text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" className="glass-input w-full pl-9 pr-10 py-2.5 rounded text-sm" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as 'ADMIN' | 'HOD' | 'FACULTY')}
              className="glass-input w-full px-3.5 py-2.5 rounded text-sm">
              <option value="FACULTY">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Create User</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

function EditUserModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await updateUser(user.id, { name, email, role: role as 'ADMIN' | 'HOD' | 'FACULTY' })
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('User updated successfully'); router.refresh(); onClose() }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="glass-card-strong rounded-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">Edit User</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 rounded text-sm" required />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 rounded text-sm">
              <option value="FACULTY">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="gradient-primary w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2">
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}

function ResetPasswordModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    setLoading(true)
    const result = await resetUserPassword(user.id, newPassword)
    setLoading(false)
    if (result.success) { toast.success(`Password reset for ${user.name}`); router.refresh(); onClose() }
    else toast.error('Failed to reset password')
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="glass-card-strong rounded-md p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold">Reset Password</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Setting new password for <strong className="text-foreground">{user.name}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type={showPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="New password" className="glass-input w-full pl-9 pr-10 py-2.5 rounded text-sm" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors duration-150"
            style={{ backgroundColor: 'hsl(38, 92%, 44%)', color: 'white' }}>
            {loading ? <Spinner /> : <><Check className="w-3.5 h-3.5" /> Reset Password</>}
          </button>
        </form>
      </motion.div>
    </ModalBackdrop>
  )
}
