import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAreas, useTasks, useEvents, useNotes } from '../lib/useStore'
import {
  Plus, Filter, CheckSquare, Repeat, StickyNote, CalendarDays,
  Clock, X, Trash2
} from 'lucide-react'
import TaskCard from '../components/TaskCard'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const tabs = [
  { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
  { id: 'habits', label: 'Habitos', icon: Repeat },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
]

export default function AreaPage() {
  const { slug } = useParams()
  const { areas } = useAreas()
  const area = areas.find(a => a.slug === slug)

  const [activeTab, setActiveTab] = useState('tasks')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newEvent, setNewEvent] = useState({ title: '', start_at: '', all_day: false })

  const { tasks, addTask, updateTask, deleteTask, addSubtask, toggleSubtask } =
    useTasks(area?.id, { is_habit: activeTab === 'habits' ? true : (activeTab === 'tasks' ? false : undefined) })
  const { notes, addNote, deleteNote } = useNotes(area?.id)
  const { events, addEvent, deleteEvent } = useEvents(area?.id)

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (statusFilter) result = result.filter(t => t.status === statusFilter)
    return result
  }, [tasks, statusFilter])

  if (!area) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-brand-text/25">Area nao encontrada</p>
      </div>
    )
  }

  const rgb = hexToRgb(area.color)

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    await addTask({
      title: newTaskTitle.trim(),
      area_id: area.id,
      is_habit: activeTab === 'habits',
      habit_frequency: activeTab === 'habits' ? 'daily' : null,
    })
    setNewTaskTitle('')
    setShowAddTask(false)
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNoteContent.trim()) return
    await addNote({ content: newNoteContent.trim(), area_id: area.id })
    setNewNoteContent('')
    setShowAddNote(false)
  }

  const handleAddEvent = async (e) => {
    e.preventDefault()
    if (!newEvent.title.trim() || !newEvent.start_at) return
    await addEvent({
      title: newEvent.title.trim(),
      start_at: new Date(newEvent.start_at).toISOString(),
      all_day: newEvent.all_day,
      area_id: area.id,
    })
    setNewEvent({ title: '', start_at: '', all_day: false })
    setShowAddEvent(false)
  }

  const activeCount = tasks.filter(t => t.status !== 'completed').length

  return (
    <div className="space-y-5">
      {/* Header with area color gradient */}
      <header
        className="rounded-2xl p-5 border -mx-4 -mt-2 md:-mt-4"
        style={{
          background: `linear-gradient(135deg, rgba(${rgb}, 0.05), rgba(${rgb}, 0.10))`,
          borderColor: `rgba(${rgb}, 0.10)`,
        }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-3.5 h-3.5 rounded-full shadow-sm"
            style={{ backgroundColor: area.color }}
          />
          <p
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: area.color, opacity: 0.7 }}
          >
            Pilar
          </p>
        </div>
        <h1 className="font-display text-xl font-bold text-brand-text">{area.name}</h1>
        <p className="text-xs text-brand-text/30 mt-0.5">
          {activeCount} tarefa{activeCount !== 1 ? 's' : ''} ativa{activeCount !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Tabs with area color active state */}
      <div
        className="flex gap-1 rounded-xl p-1 border"
        style={{
          backgroundColor: `rgba(${rgb}, 0.03)`,
          borderColor: `rgba(${rgb}, 0.06)`,
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setStatusFilter('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${isActive
                  ? 'bg-white shadow-sm'
                  : 'text-brand-text/35 hover:text-brand-text/50'}`}
              style={isActive ? { color: area.color } : {}}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tasks Tab */}
      {(activeTab === 'tasks' || activeTab === 'habits') && (
        <div className="space-y-3">
          {/* Filters with area color */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <Filter size={12} className="text-brand-text/25 flex-shrink-0" />
            {['', 'pending', 'in_progress', 'waiting', 'completed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all
                  ${statusFilter === status
                    ? 'text-white'
                    : 'bg-brand-text/[0.04] text-brand-text/35 hover:text-brand-text/50'}`}
                style={statusFilter === status ? { backgroundColor: area.color } : {}}
              >
                {status === '' ? 'Todas' : status === 'pending' ? 'Pendentes' : status === 'in_progress' ? 'Em andamento' : status === 'waiting' ? 'Aguardando' : 'Concluidas'}
              </button>
            ))}
          </div>

          {/* Quick Add */}
          {showAddTask ? (
            <form onSubmit={handleAddTask} className="card flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder={activeTab === 'habits' ? 'Novo habito...' : 'Nova tarefa...'}
                className="flex-1 input-field"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
                style={{ backgroundColor: area.color }}
              >
                Adicionar
              </button>
              <button type="button" onClick={() => setShowAddTask(false)} className="btn-ghost p-2"><X size={16} /></button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="card-interactive flex items-center gap-2 w-full text-sm py-3"
              style={{ color: `rgba(${rgb}, 0.4)` }}
            >
              <Plus size={16} />
              {activeTab === 'habits' ? 'Novo habito' : 'Nova tarefa'}
            </button>
          )}

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-brand-text/20">
                {statusFilter ? 'Nenhuma tarefa com esse filtro' : activeTab === 'habits' ? 'Nenhum habito cadastrado' : 'Nenhuma tarefa ainda'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onAddSubtask={addSubtask}
                  onToggleSubtask={toggleSubtask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {showAddNote ? (
            <form onSubmit={handleAddNote} className="card space-y-3">
              <textarea
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder="Escreva sua anotacao..."
                className="input-field min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddNote(false)} className="btn-ghost">Cancelar</button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
                  style={{ backgroundColor: area.color }}
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddNote(true)}
              className="card-interactive flex items-center gap-2 w-full text-sm py-3"
              style={{ color: `rgba(${rgb}, 0.4)` }}
            >
              <Plus size={16} /> Nova anotacao
            </button>
          )}

          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-brand-text/20">Nenhuma anotacao</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className="card group border-l-[3px]"
                  style={{ borderLeftColor: area.color }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-brand-text/[0.04]">
                    <span className="text-[10px] text-brand-text/20">
                      {new Date(note.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-brand-text/15 hover:text-brand-action transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agenda Tab */}
      {activeTab === 'agenda' && (
        <div className="space-y-3">
          {showAddEvent ? (
            <form onSubmit={handleAddEvent} className="card space-y-3">
              <input
                type="text"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Nome do compromisso"
                className="input-field"
                autoFocus
              />
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={newEvent.start_at}
                  onChange={e => setNewEvent({ ...newEvent, start_at: e.target.value })}
                  className="input-field flex-1"
                />
                <label className="flex items-center gap-2 text-sm text-brand-text/40 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newEvent.all_day}
                    onChange={e => setNewEvent({ ...newEvent, all_day: e.target.checked })}
                    className="rounded"
                  />
                  Dia inteiro
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddEvent(false)} className="btn-ghost">Cancelar</button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
                  style={{ backgroundColor: area.color }}
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddEvent(true)}
              className="card-interactive flex items-center gap-2 w-full text-sm py-3"
              style={{ color: `rgba(${rgb}, 0.4)` }}
            >
              <Plus size={16} /> Novo compromisso
            </button>
          )}

          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-brand-text/20">Nenhum compromisso</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <div
                  key={event.id}
                  className="rounded-2xl border flex items-center gap-3 py-3 px-4 group"
                  style={{
                    background: `linear-gradient(135deg, rgba(${rgb}, 0.03), rgba(${rgb}, 0.06))`,
                    borderColor: `rgba(${rgb}, 0.08)`,
                  }}
                >
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-[11px] text-brand-text/35 flex items-center gap-1">
                      <Clock size={10} />
                      {event.all_day
                        ? new Date(event.start_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : new Date(event.start_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-brand-text/15 hover:text-brand-action transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
