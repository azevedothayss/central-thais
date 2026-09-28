import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTasks, useEvents, useFinances, useAreas } from '../lib/useStore'
import {
  Sun, Sunrise, Moon, RotateCcw, CalendarDays, Clock,
  AlertCircle, ChevronRight, TrendingUp
} from 'lucide-react'
import TaskCard from '../components/TaskCard'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Bom dia', icon: Sunrise }
  if (h < 18) return { text: 'Boa tarde', icon: Sun }
  return { text: 'Boa noite', icon: Moon }
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
  const GreetingIcon = greeting.icon
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
      <header>
        <p className="text-[11px] font-semibold tracking-widest uppercase text-brand-primary/60 mb-1">
          Visao geral
        </p>
        <h1 className="font-display text-2xl font-bold text-brand-text">
          {greeting.text}, {firstName}
        </h1>
        <p className="text-sm text-brand-text/40 capitalize mt-1">{dateStr}</p>
      </header>

      {/* Consistency + Week Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-brand-text/40 mb-2">Consistencia da semana</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-brand-text">{areasOnTrack}</span>
            <span className="text-sm text-brand-text/30">/ {areaStats.length} pilares em dia</span>
          </div>
          <div className="flex gap-1.5 mt-3">
            {areaStats.map(a => (
              <div
                key={a.id}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ backgroundColor: a.isOnTrack ? a.color : '#e5e5e5' }}
              />
            ))}
          </div>
        </div>

        <div className="card flex flex-col justify-between">
          <p className="text-xs text-brand-text/40 mb-2">Financeiro do mes</p>
          <div className="flex items-baseline gap-2">
            <TrendingUp size={16} className={summary.balance >= 0 ? 'text-emerald-500' : 'text-brand-action'} />
            <span className={`text-xl font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-brand-action'}`}>
              {formatCurrency(summary.balance)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-brand-text/30 mt-2">
            <span>Receita: {formatCurrency(summary.totalIncome)}</span>
            <span>Despesas: {formatCurrency(summary.totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* Urgent Alert */}
      {urgentTasks.length > 0 && (
        <div className="bg-brand-action/5 border border-brand-action/15 rounded-2xl p-4">
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

      {/* Resume Card */}
      {resumeTask && (
        <div className="card bg-brand-accent/5 border-brand-accent/15">
          <div className="flex items-start gap-3">
            <RotateCcw size={16} className="text-brand-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-brand-accent mb-0.5">Continuar de onde parei</p>
              <p className="font-semibold text-sm truncate">{resumeTask.title}</p>
              <p className="text-xs text-brand-text/40 mt-1 line-clamp-2">{resumeTask.resume_note}</p>
              <button
                onClick={() => updateTask(resumeTask.id, { status: 'in_progress' })}
                className="mt-2 text-xs font-semibold text-brand-accent hover:text-brand-primary transition-colors"
              >
                Retomar &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Pillar Cards */}
      <section>
        <h2 className="text-[11px] font-semibold tracking-widest uppercase text-brand-text/30 mb-3">
          Seus pilares
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {areaStats.map(area => (
            <button
              key={area.id}
              onClick={() => navigate(area.slug === 'financeiro' ? '/financeiro' : `/area/${area.slug}`)}
              className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: area.color }}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-text/40">
                  {area.name}
                </span>
              </div>
              <p className="text-sm font-medium text-brand-text leading-snug">
                {area.stat}
              </p>
              <ChevronRight
                size={14}
                className="absolute top-3 right-3 text-brand-text/10 group-hover:text-brand-text/30 transition-colors"
              />
            </button>
          ))}
        </div>
      </section>

      {/* Today Events */}
      {todayEvents.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold tracking-widest uppercase text-brand-text/30 mb-3 flex items-center gap-2">
            <CalendarDays size={12} />
            Compromissos de hoje
          </h2>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <div key={event.id} className="card flex items-center gap-3 py-3">
                <div className="w-1 h-8 rounded-full bg-brand-primary flex-shrink-0" />
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

      {/* Today Tasks */}
      {todayTasks.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold tracking-widest uppercase text-brand-text/30 mb-3">
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
    </div>
  )
}
