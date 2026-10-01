import { useState, useMemo } from 'react'
import { useFinances } from '../lib/useStore'
import {
  Plus, TrendingUp, TrendingDown, Wallet, Check,
  ChevronLeft, ChevronRight, X, Trash2, AlertCircle
} from 'lucide-react'

function MonthNav({ month, onChange }) {
  const [year, m] = month.split('-').map(Number)
  const prev = () => {
    const d = new Date(year, m - 2, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const next = () => {
    const d = new Date(year, m, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const label = new Date(year, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
        <ChevronLeft size={18} className="text-emerald-600/40" />
      </button>
      <span className="font-semibold capitalize text-sm min-w-[140px] text-center">{label}</span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
        <ChevronRight size={18} className="text-emerald-600/40" />
      </button>
    </div>
  )
}

export default function Finance() {
  const today = new Date().toISOString().slice(0, 10)
  const [month, setMonth] = useState(today.slice(0, 7))
  const { entries, summary, addEntry, updateEntry, deleteEntry } = useFinances(month)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    amount: '',
    due_date: '',
    is_installment: false,
    installment_total: '',
    notes: '',
  })

  const upcomingBills = useMemo(() =>
    entries
      .filter(e => e.type === 'expense' && !e.paid && e.due_date && e.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 5),
    [entries, today]
  )

  const overdueBills = useMemo(() =>
    entries
      .filter(e => e.type === 'expense' && !e.paid && e.due_date && e.due_date < today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [entries, today]
  )

  const expensesByTitle = useMemo(() => {
    const grouped = {}
    entries.filter(e => e.type === 'expense').forEach(e => {
      const key = e.title.replace(/\s*\(\d+\/\d+\)\s*$/, '')
      grouped[key] = (grouped[key] || 0) + Number(e.amount)
    })
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
  }, [entries])

  const maxExpense = expensesByTitle.length > 0 ? expensesByTitle[0][1] : 1

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.title.trim() || isNaN(amount)) return

    if (form.is_installment && form.installment_total > 1) {
      const groupId = crypto.randomUUID()
      const total = parseInt(form.installment_total)
      for (let i = 1; i <= total; i++) {
        const dueDate = form.due_date ? new Date(form.due_date + 'T12:00:00') : null
        if (dueDate && i > 1) dueDate.setMonth(dueDate.getMonth() + (i - 1))
        await addEntry({
          type: form.type,
          title: `${form.title.trim()} (${i}/${total})`,
          amount,
          due_date: dueDate?.toISOString().slice(0, 10) || null,
          is_installment: true,
          installment_current: i,
          installment_total: total,
          installment_group_id: groupId,
          notes: form.notes || null,
        })
      }
    } else {
      await addEntry({
        type: form.type,
        title: form.title.trim(),
        amount,
        due_date: form.due_date || null,
        notes: form.notes || null,
      })
    }

    setForm({ type: 'expense', title: '', amount: '', due_date: '', is_installment: false, installment_total: '', notes: '' })
    setShowAdd(false)
  }

  const togglePaid = (entry) => {
    updateEntry(entry.id, {
      paid: !entry.paid,
      paid_at: !entry.paid ? today : null,
    })
  }

  const formatCurrency = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const barColors = ['#059669', '#10B981', '#34D399', '#552A7B', '#3B82F6', '#F59E0B']

  return (
    <div className="space-y-5">
      {/* Header with green gradient */}
      <header
        className="rounded-2xl p-5 border -mx-4 -mt-2 md:-mt-4"
        style={{
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05), rgba(16, 185, 129, 0.10))',
          borderColor: 'rgba(5, 150, 105, 0.10)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-3.5 h-3.5 rounded-full shadow-sm bg-emerald-500" />
          <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-600/60">
            Pilar &middot; Financas
          </p>
        </div>
        <h1 className="font-display text-xl font-bold text-brand-text">Financeiro</h1>
      </header>

      <MonthNav month={month} onChange={setMonth} />

      {/* Summary Cards - Green themed */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.04), rgba(16, 185, 129, 0.07))',
            borderColor: 'rgba(5, 150, 105, 0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-[11px] text-emerald-600/50">Receita</p>
          </div>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 103, 92, 0.04), rgba(255, 103, 92, 0.07))',
            borderColor: 'rgba(255, 103, 92, 0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-brand-action" />
            <p className="text-[11px] text-brand-action/50">Despesas</p>
          </div>
          <p className="text-lg font-bold text-brand-action">{formatCurrency(summary.totalExpense)}</p>
        </div>
      </div>

      {/* Balance Bar - Tinted */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          background: summary.balance >= 0
            ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.03), rgba(16, 185, 129, 0.05))'
            : 'linear-gradient(135deg, rgba(255, 103, 92, 0.03), rgba(255, 103, 92, 0.05))',
          borderColor: summary.balance >= 0
            ? 'rgba(5, 150, 105, 0.08)'
            : 'rgba(255, 103, 92, 0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet size={14} className={summary.balance >= 0 ? 'text-emerald-500' : 'text-brand-action'} />
            <p className="text-xs text-brand-text/40">Saldo do mes</p>
          </div>
          <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-brand-action'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
        {summary.totalIncome > 0 && (
          <div className="h-2.5 bg-brand-text/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((Math.max(summary.totalIncome - summary.totalExpense, 0) / summary.totalIncome) * 100, 100)}%`,
                backgroundColor: summary.balance >= 0 ? '#059669' : '#FF675C',
              }}
            />
          </div>
        )}
      </div>

      {/* Overdue Bills - Red tinted */}
      {overdueBills.length > 0 && (
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 103, 92, 0.04), rgba(255, 103, 92, 0.08))',
            borderColor: 'rgba(255, 103, 92, 0.12)',
          }}
        >
          <h3 className="text-xs font-semibold text-brand-action flex items-center gap-2 mb-3">
            <AlertCircle size={14} />
            {overdueBills.length} conta{overdueBills.length > 1 ? 's' : ''} vencida{overdueBills.length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {overdueBills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between">
                <span className="text-sm text-brand-text/60 truncate flex-1 mr-2">{bill.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-brand-action">{formatCurrency(bill.amount)}</span>
                  <button
                    onClick={() => togglePaid(bill)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses by Category - Purple tinted */}
      {expensesByTitle.length > 0 && (
        <section>
          <h2 className="section-label">Gastos por categoria</h2>
          <div
            className="rounded-2xl p-4 border space-y-3"
            style={{
              background: 'linear-gradient(135deg, rgba(85, 42, 123, 0.03), rgba(165, 108, 255, 0.05))',
              borderColor: 'rgba(85, 42, 123, 0.06)',
            }}
          >
            {expensesByTitle.map(([title, amount], i) => (
              <div key={title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-brand-text/60">{title}</span>
                  <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(amount / maxExpense) * 100}%`,
                      backgroundColor: barColors[i % barColors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Bills - Amber/warm tinted */}
      {upcomingBills.length > 0 && (
        <section>
          <h2 className="section-label">Proximos vencimentos</h2>
          <div className="space-y-2">
            {upcomingBills.map(bill => (
              <div
                key={bill.id}
                className="rounded-2xl border flex items-center justify-between py-3 px-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.03), rgba(245, 158, 11, 0.06))',
                  borderColor: 'rgba(245, 158, 11, 0.08)',
                }}
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm truncate">{bill.title}</p>
                  <p className="text-[11px] text-brand-text/30">
                    Vence {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(bill.amount)}</span>
                  <button
                    onClick={() => togglePaid(bill)}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-brand-text/15 hover:text-emerald-500 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Button / Form */}
      {showAdd ? (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'expense' })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                ${form.type === 'expense' ? 'bg-brand-action text-white' : 'bg-brand-text/[0.04] text-brand-text/40'}`}
            >
              Saida
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'income' })}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
                ${form.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-brand-text/[0.04] text-brand-text/40'}`}
            >
              Entrada
            </button>
          </div>

          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Descricao (ex: Aluguel, Freelance...)"
            className="input-field"
            autoFocus
          />

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-text/25">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className="input-field pl-10"
              />
            </div>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="input-field flex-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-text/40">
            <input
              type="checkbox"
              checked={form.is_installment}
              onChange={e => setForm({ ...form, is_installment: e.target.checked })}
              className="rounded"
            />
            Parcelado
          </label>

          {form.is_installment && (
            <input
              type="number"
              min="2"
              value={form.installment_total}
              onChange={e => setForm({ ...form, installment_total: e.target.value })}
              placeholder="Numero de parcelas"
              className="input-field"
            />
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="card-interactive flex items-center gap-2 w-full text-emerald-600/35 text-sm py-3"
        >
          <Plus size={16} /> Novo lancamento
        </button>
      )}

      {/* All Entries */}
      <section>
        <h2 className="section-label">Todos os lancamentos</h2>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Wallet size={24} className="mx-auto text-emerald-600/15 mb-2" />
            <p className="text-sm text-brand-text/20">Nenhum lancamento neste mes</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map(entry => (
              <div key={entry.id} className="card flex items-center gap-3 py-3 group">
                <button
                  onClick={() => togglePaid(entry)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${entry.paid
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-brand-text/15 hover:border-emerald-400'}`}
                >
                  {entry.paid && <Check size={10} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${entry.paid ? 'line-through text-brand-text/25' : ''}`}>{entry.title}</p>
                  {entry.due_date && (
                    <p className="text-[10px] text-brand-text/20">
                      {new Date(entry.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {entry.paid && ' · Pago'}
                    </p>
                  )}
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${entry.type === 'income' ? 'text-emerald-600' : 'text-brand-action'}`}>
                  {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.amount)}
                </span>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-brand-text/15 hover:text-brand-action transition-all flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
