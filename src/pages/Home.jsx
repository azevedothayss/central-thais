import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTasks, useEvents, useFinances, useAreas } from '../lib/useStore'
import {
  Sun, Sunrise, Moon, RotateCcw, CalendarDays, Clock,
  AlertCircle, ChevronRight, TrendingUp, TrendingDown, Wallet
} from 'lucide-react'
import TaskCard from '../components/TaskCard'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Bom dia', icon: Sunrise }
  if (h < 18) return { text: 'Boa tarde', icon: Sun }
  return { text: 'Boa noite', icon: Moon }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function Home() {
  const { user } = useAuth()
  const { areas } = useAreas()
  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)
  const { tasks, updateTask, deleteTask, addSubtask, toggleSubtask } = useTasks(null, { excludeCompleted: true })
  const { events } = useEvents()
  const { summary } = useFinances(currentMonth)
  const navigate = useNavigate()

  const greeting = getGreeting()
  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Thais'

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const areaStats = useMemo(() => {
    return areas.map(area => {
      const areaTasks = tasks.filter(t => t.area_id === area.id)
      const active = areaTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      const inProgress = areaTasks.filter(t => t.status === 'in_progress')
      const completedRecently = areaTasks.filter(t => t.completed_at?.slice(0, 10) === today)

      let stat, isOnTrack
      if (area.slug === 'financeiro') {
        const pending = summary.upcoming?.length || 0
        stat = pending > 0 ? `${pending} conta${pending > 1 ? 's' : ''} a vencer` : 'Contas em dia'
        isOnTrack = pending === 0
      } else if (active.length === 0) {
        stat = 'Tudo em dia'
        isOnTrack = true
      } else if (inProgress.length > 0) {
        stat = `${inProgress.length} em andamento`
        isOnTrack = true
      } else {
        stat = `${active.length} pendente${active.length > 1 ? 's' : ''}`
        isOnTrack = completedRecently.length > 0
      }

      return { ...area, stat, isOnTrack, activeCount: active.length }
    })
  }, [areas, tasks, today, summary])

  const areasOnTrack = areaStats.filter(a => a.isOnTrack).length

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.planned_date === today || t.due_date === today),
    [tasks, today]
  )

  const resumeTask = useMemo(() =>
    tasks.find(t => t.resume_note && t.status === 'in_progress'),
    [tasks]
  )

  const urgentTasks = useMemo(() =>
    tasks
      .filter(t => t.due_date && t.due_date < today && t.status !== 'completed')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 3),
    [tasks, today]
  )

  const todayEvents = useMemo(() =>
    events.filter(e => e.start_at?.slice(0, 10) === today),
    [events, today]
  )

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pb-2">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-brand-primary/50 mb-1">
          Visao geral
        </p>
        <h1 className="font-display text-2xl font-bold text-brand-text">
          {greeting.text}, {firstName}
        </h1>
        <p className="text-sm text-brand-text/35 capitalize mt-1">{dateStr}</p>
      </header>

      {/* Consistency + Financial Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Consistency Card - Purple tint */}
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: `linear-gradient(135deg, rgba(${hexToRgb('#552A7B')}, 0.04), rgba(${hexToRgb('#A56CFF')}, 0.06))`,
            borderColor: `rgba(${hexToRgb('#552A7B')}, 0.08)`,
          }}
        >
          <p className="text-[11px] font-medium text-brand-primary/50 mb-3">Consistencia da semana</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-brand-primary">{areasOnTrack}</span>
            <span className="text-sm text-brand-text/30">/ {areaStats.length} pilares em dia</span>
          </div>
          <div className="flex gap-1.5 mt-4">
            {areaStats.map(a => (
              <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="h-2 w-full rounded-full transition-all"
                  style={{ backgroundColor: a.isOnTrack ? a.color : '#e5e5e5' }}
                />
                <span className="text-[8px] text-brand-text/25 truncate max-w-full">{a.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Card - Green tint */}
        <button
          onClick={() => navigate('/financeiro')}
          className="rounded-2xl p-5 border text-left group transition-all hover:shadow-md"
          style={{
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.04), rgba(16, 185, 129, 0.06))',
            borderColor: 'rgba(5, 150, 105, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-emerald-600/50">Financeiro do mes</p>
            <ChevronRight size={14} className="text-emerald-600/20 group-hover:text-emerald-600/40 transition-colors" />
          </div>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-brand-action'}`}>
            {formatCurrency(summary.balance)}
          </p>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-emerald-500" />
              <span className="text-[11px] text-brand-text/35">{formatCurrency(summary.totalIncome)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={12} className="text-brand-action/60" />
              <span className="text-[11px] text-brand-text/35">{formatCurrency(summary.totalExpense)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Urgent Alert - Red tinted */}
      {urgentTasks.length > 0 && (
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 103, 92, 0.04), rgba(255, 103, 92, 0.07))',
            borderColor: 'rgba(255, 103, 92, 0.12)',
          }}
        >
          <h3 className="text-xs font-semibold text-brand-action flex items-center gap-2 mb-3">
            <AlertCircle size={14} />
            {urgentTasks.length} tarefa{urgentTasks.length > 1 ? 's' : ''} com prazo vencido
          </h3>
          <div className="space-y-2">
            {urgentTasks.map(task => (
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
        </div>
      )}

      {/* Resume Card - Accent tinted */}
      {resumeTask && (
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(165, 108, 255, 0.04), rgba(165, 108, 255, 0.07))',
            borderColor: 'rgba(165, 108, 255, 0.1)',
          }}
        >
          <div className="flex items-start gap-3">
            <RotateCcw size={16} className="text-brand-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-brand-accent/70 mb-0.5">Continuar de onde parei</p>
              <p className="font-semibold text-sm truncate">{resumeTask.title}</p>
              <p className="text-xs text-brand-text/40 mt-1 line-clamp-2">{resumeTask.resume_note}</p>
              <button
                onClick={() => updateTask(resumeTask.id, { status: 'in_progress' })}
                className="mt-2.5 text-xs font-semibold text-brand-accent hover:text-brand-primary transition-colors"
              >
                Retomar &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Pillar Cards */}
      <section>
        <h2 className="section-label">Seus pilares</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {areaStats.map(area => {
            const rgb = hexToRgb(area.color)
            return (
              <button
                key={area.id}
                onClick={() => navigate(area.slug === 'financeiro' ? '/financeiro' : `/area/${area.slug}`)}
                className="relative rounded-2xl p-4 border text-left group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, rgba(${rgb}, 0.03), rgba(${rgb}, 0.07))`,
                  borderColor: `rgba(${rgb}, 0.1)`,
                }}
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full rounded-r-full"
                  style={{ backgroundColor: area.color }}
                />
                <div className="flex items-center gap-2 mb-2.5 pl-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: area.color }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: area.color, opacity: 0.7 }}
                  >
                    {area.name}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-brand-text/70 pl-2 leading-snug">
                  {area.stat}
                </p>
                <div
                  className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-full opacity-[0.04]"
                  style={{ backgroundColor: area.color }}
                />
              </button>
            )
          })}
        </div>
      </section>

      {/* Today Events - Blue tinted */}
      {todayEvents.length > 0 && (
        <section>
          <h2 className="section-label flex items-center gap-2">
            <CalendarDays size={12} />
            Compromissos de hoje
          </h2>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <div
                key={event.id}
                className="rounded-2xl border flex items-center gap-3 py-3 px-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(59, 130, 246, 0.06))',
                  borderColor: 'rgba(59, 130, 246, 0.08)',
                }}
              >
                <div className="w-1 h-8 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  {!event.all_day && (
                    <p className="text-[11px] text-brand-text/40 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(event.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today Tasks - Warm tinted */}
      {todayTasks.length > 0 && (
        <section>
          <h2 className="section-label">
            Tarefas de hoje ({todayTasks.length})
          </h2>
          <div className="space-y-2">
            {todayTasks.map(task => (
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
        </section>
      )}

      {/* Empty State */}
      {todayTasks.length === 0 && urgentTasks.length === 0 && todayEvents.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/5 flex items-center justify-center mx-auto mb-3">
            <Sun size={20} className="text-brand-primary/30" />
          </div>
          <p className="text-sm text-brand-text/25">Nenhuma tarefa ou evento para hoje</p>
          <p className="text-xs text-brand-text/15 mt-1">Use o + para adicionar</p>
        </div>
      )}
    </div>
  )
}
