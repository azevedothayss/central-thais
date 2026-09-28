import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTasks, useEvents, useFinances, useAreas } from '../lib/useStore'
import {
  Sun, Sunrise, Moon, RotateCcw, CalendarDays, Clock,
  AlertCircle, Wallet, ChevronRight, Check, Circle
} from 'lucide-react'
import TaskCard from '../components/TaskCard'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Bom dia', icon: Sunrise }
  if (h < 18) return { text: 'Boa tarde', icon: Sun }
  return { text: 'Boa noite', icon: Moon }
}

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
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

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.planned_date === today || t.due_date === today),
    [tasks, today]
  )

  const resumeTask = useMemo(() =>
    tasks.find(t => t.resume_note && t.status === 'in_progress'),
    [tasks]
  )

  const waitingTasks = useMemo(() =>
    tasks.filter(t => t.status === 'waiting').slice(0, 5),
    [tasks]
  )

  const urgentTasks = useMemo(() =>
    tasks
      .filter(t => t.due_date && t.due_date <= today && t.status !== 'completed')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 3),
    [tasks, today]
  )

  const todayEvents = useMemo(() =>
    events.filter(e => e.start_at?.slice(0, 10) === today),
    [events, today]
  )

  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Thais'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-brand-text/40 text-sm mb-1">
          <GreetingIcon size={16} />
          <span>{greeting.text}, <span className="capitalize font-medium text-brand-text">{firstName}</span></span>
        </div>
        <p className="text-xs text-brand-text/30 capitalize">{formatDate()}</p>
      </div>

      {/* Urgent / Overdue */}
      {urgentTasks.length > 0 && (
        <div className="bg-brand-action/5 border border-brand-action/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-brand-action flex items-center gap-2 mb-3">
            <AlertCircle size={16} />
            Atencao - {urgentTasks.length} tarefa{urgentTasks.length > 1 ? 's' : ''} com prazo vencido
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
        <div className="card bg-brand-accent/5 border-brand-accent/20">
          <div className="flex items-start gap-3">
            <RotateCcw size={18} className="text-brand-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-brand-accent mb-1">Continuar de onde parei</p>
              <p className="font-semibold text-sm">{resumeTask.title}</p>
              <p className="text-xs text-brand-text/50 mt-1">{resumeTask.resume_note}</p>
              <button
                onClick={() => updateTask(resumeTask.id, { status: 'in_progress' })}
                className="btn-secondary text-xs mt-2"
              >
                Retomar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today Events */}
      {todayEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-brand-text/50 mb-3 flex items-center gap-2">
            <CalendarDays size={14} />
            Compromissos de hoje
          </h2>
          <div className="space-y-2">
            {todayEvents.map(event => (
              <div key={event.id} className="card flex items-center gap-3 py-3">
                <div className="w-1 h-8 rounded-full bg-brand-primary" />
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  {!event.all_day && (
                    <p className="text-xs text-brand-text/40 flex items-center gap-1">
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
      <section>
        <h2 className="text-sm font-semibold text-brand-text/50 mb-3 flex items-center gap-2">
          <Check size={14} />
          Tarefas de hoje ({todayTasks.length})
        </h2>
        {todayTasks.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-sm text-brand-text/30">Nenhuma tarefa planejada para hoje</p>
            <p className="text-xs text-brand-text/20 mt-1">Use o botao + para adicionar</p>
          </div>
        ) : (
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
        )}
      </section>

      {/* Waiting Tasks */}
      {waitingTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-brand-text/50 mb-3 flex items-center gap-2">
            <Clock size={14} />
            Aguardando retorno
          </h2>
          <div className="space-y-2">
            {waitingTasks.map(task => (
              <div key={task.id} className="card flex items-center gap-3 py-3">
                <Circle size={14} className="text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                  {task.waiting_for && (
                    <p className="text-xs text-orange-500">Aguardando: {task.waiting_for}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Financial Quick Summary */}
      <section>
        <button
          onClick={() => navigate('/financeiro')}
          className="w-full card hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Wallet size={16} className="text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-xs text-brand-text/40">Saldo projetado do mes</p>
                <p className={`font-semibold text-sm ${summary.balance >= 0 ? 'text-emerald-600' : 'text-brand-action'}`}>
                  R$ {summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-brand-text/30">
              {summary.upcoming.length > 0 && (
                <span className="text-xs">{summary.upcoming.length} a vencer</span>
              )}
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </section>

      {/* Areas Quick Links */}
      <section>
        <h2 className="text-sm font-semibold text-brand-text/50 mb-3">Suas areas</h2>
        <div className="grid grid-cols-2 gap-2">
          {areas.map(area => {
            const areaTaskCount = tasks.filter(t => t.area_id === area.id && t.status !== 'completed').length
            return (
              <button
                key={area.id}
                onClick={() => navigate(area.slug === 'financeiro' ? '/financeiro' : `/area/${area.slug}`)}
                className="card-interactive text-left py-3"
              >
                <p className="text-sm font-medium" style={{ color: area.color }}>{area.name}</p>
                <p className="text-xs text-brand-text/30 mt-0.5">
                  {areaTaskCount} tarefa{areaTaskCount !== 1 ? 's' : ''} pendente{areaTaskCount !== 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
