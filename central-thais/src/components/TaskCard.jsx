import { useState } from 'react'
import {
  Check, Circle, Clock, Pause, RotateCcw, ChevronDown, ChevronUp,
  Plus, Trash2, MessageSquare, CalendarDays
} from 'lucide-react'

const statusConfig = {
  pending: { label: 'Pendente', badge: 'badge-pending', icon: Circle },
  in_progress: { label: 'Em andamento', badge: 'badge-progress', icon: Clock },
  waiting: { label: 'Aguardando', badge: 'badge-waiting', icon: Pause },
  completed: { label: 'Concluida', badge: 'badge-done', icon: Check },
}

export default function TaskCard({ task, onUpdate, onDelete, onAddSubtask, onToggleSubtask }) {
  const [expanded, setExpanded] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [resumeNote, setResumeNote] = useState(task.resume_note || '')
  const [editingResume, setEditingResume] = useState(false)

  const config = statusConfig[task.status] || statusConfig.pending
  const StatusIcon = config.icon
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter(s => s.completed).length
  const progress = subtasks.length > 0 ? Math.round((completedSubs / subtasks.length) * 100) : null

  const toggleComplete = () => {
    if (task.status === 'completed') {
      onUpdate(task.id, { status: 'pending', completed_at: null })
    } else {
      onUpdate(task.id, { status: 'completed' })
    }
  }

  const cycleStatus = () => {
    const order = ['pending', 'in_progress', 'waiting', 'completed']
    const idx = order.indexOf(task.status)
    const next = order[(idx + 1) % order.length]
    onUpdate(task.id, {
      status: next,
      ...(next === 'completed' ? {} : { completed_at: null })
    })
  }

  const handleAddSubtask = (e) => {
    e.preventDefault()
    if (!newSubtask.trim()) return
    onAddSubtask(task.id, newSubtask.trim())
    setNewSubtask('')
  }

  const saveResume = () => {
    onUpdate(task.id, { resume_note: resumeNote })
    setEditingResume(false)
  }

  return (
    <div className={`card transition-all duration-200 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={toggleComplete}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${task.status === 'completed'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-brand-text/20 hover:border-brand-primary'}`}
        >
          {task.status === 'completed' && <Check size={12} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium text-sm leading-snug ${task.status === 'completed' ? 'line-through text-brand-text/40' : ''}`}>
              {task.title}
            </p>
            <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 p-1 rounded text-brand-text/30 hover:text-brand-text/60">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button onClick={cycleStatus} className={config.badge + ' cursor-pointer hover:opacity-80'}>
              <StatusIcon size={10} className="mr-1" />
              {config.label}
            </button>

            {task.due_date && (
              <span className="text-[11px] text-brand-text/40 flex items-center gap-1">
                <CalendarDays size={10} />
                {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            )}

            {task.waiting_for && (
              <span className="text-[11px] text-orange-500">
                Aguardando: {task.waiting_for}
              </span>
            )}

            {progress !== null && (
              <span className="text-[11px] text-brand-text/40">{completedSubs}/{subtasks.length}</span>
            )}
          </div>

          {task.resume_note && !expanded && (
            <p className="mt-1.5 text-xs text-brand-accent bg-brand-accent/5 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <RotateCcw size={10} className="flex-shrink-0" />
              {task.resume_note}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-brand-text/5 space-y-3">
          {/* Subtasks / Checklist */}
          <div>
            <p className="text-xs font-medium text-brand-text/40 mb-2">Checklist</p>
            {subtasks.length > 0 && (
              <>
                <div className="w-full bg-brand-text/5 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-brand-accent h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ul className="space-y-1.5">
                  {subtasks.map(sub => (
                    <li key={sub.id} className="flex items-center gap-2.5">
                      <button
                        onClick={() => onToggleSubtask(task.id, sub.id, !sub.completed)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all
                          ${sub.completed ? 'bg-brand-accent border-brand-accent text-white' : 'border-brand-text/20'}`}
                      >
                        {sub.completed && <Check size={10} />}
                      </button>
                      <span className={`text-sm ${sub.completed ? 'line-through text-brand-text/30' : ''}`}>
                        {sub.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Nova subtarefa..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-brand-text/10 focus:outline-none focus:ring-1 focus:ring-brand-accent/40"
              />
              <button type="submit" className="p-1.5 rounded-lg text-brand-accent hover:bg-brand-accent/10">
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Resume Note */}
          <div>
            <p className="text-xs font-medium text-brand-text/40 mb-1.5 flex items-center gap-1">
              <MessageSquare size={10} />
              Ponto de retomada
            </p>
            {editingResume ? (
              <div className="flex gap-2">
                <textarea
                  value={resumeNote}
                  onChange={e => setResumeNote(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-text/10 resize-none focus:outline-none focus:ring-1 focus:ring-brand-accent/40"
                  rows={2}
                  placeholder="Onde voce parou? Ex: Falta revisar o audio..."
                />
                <button onClick={saveResume} className="btn-secondary text-xs self-end">Salvar</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingResume(true)}
                className="text-sm text-brand-text/40 hover:text-brand-text bg-brand-bg rounded-lg px-3 py-2 w-full text-left"
              >
                {task.resume_note || 'Registrar onde parei...'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onUpdate(task.id, { status: 'waiting' })}
              className="btn-ghost text-xs"
            >
              Aguardando
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="btn-ghost text-xs text-brand-action/60 hover:text-brand-action ml-auto"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
