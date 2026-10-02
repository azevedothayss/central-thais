import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTasks, useEvents, useFinances, useAreas, useNotes } from '../lib/useStore'
import { areaPath, areaStyle, themeFor, todayInBrazil, eventDateInBrazil, formatCurrency } from '../lib/presentation'
import { Sun, Moon, CalendarDays, RotateCcw, Wallet, NotebookPen, Heart, CheckCheck } from 'lucide-react'
import TaskCard from '../components/TaskCard'
import banner from '../assets/banner.webp'

const isOpen = task => task.status !== 'completed' && task.status !== 'cancelled'
function Empty({ children }) { return <div className="ct-empty">{children}</div> }
export default function Home() {
  const { areas } = useAreas()
  const today = todayInBrazil()
  const { tasks, loading, updateTask, deleteTask, addSubtask, toggleSubtask } = useTasks()
  const { events } = useEvents()
  const { notes } = useNotes()
  const { summary } = useFinances(today.slice(0, 7))
  const navigate = useNavigate()
  const [taskTab, setTaskTab] = useState('today')
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()))
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const GreetingIcon = hour < 18 ? Sun : Moon
  const ordinaryTasks = tasks.filter(t => !t.is_habit && t.status !== 'cancelled')
  const daily = ordinaryTasks.filter(t => t.planned_date === today || t.due_date === today)
  const completed = daily.filter(t => t.status === 'completed').length
  const progress = daily.length ? Math.round(completed / daily.length * 100) : 0
  const habits = tasks.filter(t => t.is_habit && t.status !== 'cancelled')
  const urgent = ordinaryTasks.filter(t => isOpen(t) && t.due_date && t.due_date < today)
  const visibleTasks = ordinaryTasks.filter(t => taskTab === 'today'
    ? t.planned_date === today || t.due_date === today
    : taskTab === 'urgent' ? isOpen(t) && t.due_date && t.due_date < today : isOpen(t))
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || (a.due_date || '9999').localeCompare(b.due_date || '9999'))
  const resume = tasks.find(t => t.resume_note && t.status === 'in_progress')
  const todayEvents = events.filter(e => e.start_at && eventDateInBrazil(e.start_at) === today)
  const upcomingEvents = events.filter(e => e.start_at && eventDateInBrazil(e.start_at) > today).slice(0, 3)
  const pendingExpenses = summary.upcoming.filter(e => e.type === 'expense').reduce((total, entry) => total + Number(entry.amount), 0)
  const taskActions = { onUpdate: updateTask, onDelete: deleteTask, onAddSubtask: addSubtask, onToggleSubtask: toggleSubtask }
  const noteArea = notes[0] && areas.find(a => a.id === notes[0].area_id)
  const habitFrequency = frequency => ({ daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' })[frequency] || 'Hábito'
  return <div className="ct-dashboard">
    <div className="ct-page-heading"><div><p className="ct-eyebrow">SUA VISÃO GERAL</p><h1>Meu dia<span>.</span></h1></div><p className="ct-page-date">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
    <section className="ct-welcome" style={{ backgroundImage: 'url(' + banner + ')' }}><div className="ct-welcome-copy"><p><GreetingIcon size={16} strokeWidth={1.5} />{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' })}</p><h2>{greeting}, Thais <span aria-hidden="true">✧</span></h2><p className="ct-welcome-message">Vamos cuidar de uma coisa por vez?</p></div><div className="ct-day-progress"><div className="ct-progress-ring" style={{ '--progress': progress * 3.6 + 'deg' }}><span><strong>{completed}<small>/{daily.length}</small></strong><small>concluídas</small></span></div><p>seu dia, no seu ritmo</p></div></section>
    <section className="ct-pillars-section"><div className="ct-section-head"><h2>Minha vida, em equilíbrio</h2><span>{areas.length} áreas · um só lugar</span></div><div className="ct-pillar-grid">{areas.map(area => {
      const areaTasks = ordinaryTasks.filter(t => t.area_id === area.id && t.status !== 'cancelled')
      const active = areaTasks.filter(isOpen).length
      const finished = areaTasks.filter(t => t.status === 'completed').length
      const Icon = themeFor(area).icon
      return <button className="ct-pillar" key={area.id} style={areaStyle(area)} onClick={() => navigate(areaPath(area))}><div><span className="ct-pillar-icon"><Icon size={22} strokeWidth={1.7} /></span><span>{active}</span></div><h3>{area.name}</h3><p>{area.slug === 'financeiro' ? formatCurrency(pendingExpenses) + ' a pagar' : active + (active === 1 ? ' tarefa em aberto' : ' tarefas em aberto')}</p><div className="ct-pillar-progress"><span style={{ width: (areaTasks.length ? finished / areaTasks.length * 100 : 0) + '%' }} /></div></button>
    })}</div></section>
    <div className="ct-dashboard-grid"><div className="ct-dashboard-left">
      {resume && <section className="ct-resume"><RotateCcw size={23} /><div><span>Continuar de onde parei</span><h3>{resume.title}</h3><p>{resume.resume_note}</p></div></section>}
      <section className="ct-panel"><div className="ct-section-head"><h2>Um passo de cada vez</h2><span>{ordinaryTasks.filter(isOpen).length} em aberto</span></div><div className="ct-task-tabs" role="tablist" aria-label="Recorte das tarefas">{[['today', 'Hoje'], ['urgent', 'Atrasadas'], ['open', 'Em aberto']].map(([key, label]) => <button key={key} role="tab" aria-selected={taskTab === key} onClick={() => setTaskTab(key)} className={taskTab === key ? 'active' : ''}>{label}{key === 'today' && <span>{daily.length}</span>}{key === 'urgent' && urgent.length > 0 && <span>{urgent.length}</span>}</button>)}</div><div className="ct-home-tasks">{loading ? <Empty>Carregando suas tarefas…</Empty> : visibleTasks.length ? visibleTasks.map(task => <TaskCard key={task.id} task={task} {...taskActions} />) : <Empty>{taskTab === 'urgent' ? 'Nenhuma tarefa com prazo vencido.' : 'Espaço para um próximo passo.'}</Empty>}</div></section>
      <section className="ct-panel"><div className="ct-section-head"><h2>Cuidar de mim também conta</h2><Heart size={19} strokeWidth={1.7} /></div><p className="ct-panel-description">Seus hábitos cadastrados</p><div className="ct-habit-grid">{habits.map(habit => { const area = areas.find(a => a.id === habit.area_id); return <div className="ct-habit-item" key={habit.id} style={areaStyle(area)}><span className="ct-habit-frequency">{habitFrequency(habit.habit_frequency)}</span><TaskCard task={habit} {...taskActions} /></div> })}{!habits.length && <Empty>Cadastre hábitos na área da vida que preferir.</Empty>}</div></section>
      <div className="ct-reflection"><CheckCheck size={25} strokeWidth={1.7} /><div><h3>Seu progresso merece ser visto.</h3><p>{completed} {completed === 1 ? 'tarefa concluída' : 'tarefas concluídas'} entre as planejadas para hoje.</p></div></div>
    </div><aside className="ct-dashboard-right">
      <section className="ct-panel ct-agenda-panel"><div className="ct-section-head"><h2>Na sua agenda</h2><CalendarDays size={20} strokeWidth={1.7} /></div><p className="ct-month-label">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'long', year: 'numeric' })}</p><h3 className="ct-meta-heading">HOJE</h3>{todayEvents.length ? todayEvents.map(event => <div className="ct-event" key={event.id}><time>{event.all_day ? 'Dia todo' : new Date(event.start_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</time><div><strong>{event.title}</strong><span>{areas.find(a => a.id === event.area_id)?.name || 'Meu espaço'}</span></div></div>) : <Empty>Sem próximos compromissos hoje.</Empty>}{upcomingEvents.length > 0 && <><h3 className="ct-meta-heading">PRÓXIMOS COMPROMISSOS</h3>{upcomingEvents.map(event => <div className="ct-upcoming-event" key={event.id}><span>{new Date(event.start_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' })}</span><strong>{event.title}</strong></div>)}</>}<p className="ct-agenda-help">Gerencie os compromissos na agenda de cada área.</p></section>
      <section className="ct-finance-preview"><div className="ct-section-head"><h2>Seu mês em números</h2><Wallet size={20} strokeWidth={1.7} /></div><span className="ct-balance-label">Saldo previsto dos lançamentos</span><strong className="ct-balance">{formatCurrency(summary.balance)}</strong><div className="ct-finance-mini"><div><span>Receitas</span><strong>{formatCurrency(summary.totalIncome)}</strong></div><div><span>A pagar</span><strong>{formatCurrency(pendingExpenses)}</strong></div></div><button className="ct-button ct-finance-button" onClick={() => navigate('/financeiro')}>Cuidar das finanças</button></section>
      {notes[0] && <section className="ct-note-preview" style={areaStyle(noteArea)}><p><NotebookPen size={18} />PARA LEMBRAR</p><div>{notes[0].content.slice(0, 240)}{notes[0].content.length > 240 ? '…' : ''}</div>{noteArea && noteArea.slug !== 'financeiro' && <button className="ct-text-button" onClick={() => navigate(areaPath(noteArea))}>Ver área</button>}</section>}
    </aside></div>
  </div>
}
