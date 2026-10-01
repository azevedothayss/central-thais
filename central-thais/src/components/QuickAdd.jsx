import { useState, useRef, useEffect } from 'react'
import { X, ListPlus, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function QuickAdd({ areas, onClose, onAdded }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [areaId, setAreaId] = useState('')
  const [isBatch, setIsBatch] = useState(false)
  const [batchPreview, setBatchPreview] = useState([])
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleTextChange = (val) => {
    setText(val)
    if (isBatch) {
      const lines = val.split('\n').map(l => l.trim()).filter(Boolean)
      setBatchPreview(lines)
    }
  }

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)

    if (isBatch) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const tasks = lines.map(title => ({
        user_id: user.id,
        title,
        area_id: areaId || null,
        status: 'pending',
      }))
      await supabase.from('tasks').insert(tasks)
    } else {
      await supabase.from('tasks').insert({
        user_id: user.id,
        title: text.trim(),
        area_id: areaId || null,
        status: 'pending',
      })
    }

    setSaving(false)
    onAdded()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isBatch && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-text/5">
          <h2 className="font-semibold text-brand-text">
            {isBatch ? 'Adicionar lista de tarefas' : 'Nova tarefa'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-text/5 text-brand-text/40">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isBatch ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Cole sua lista aqui (uma tarefa por linha)"
              className="input-field min-h-[120px] resize-none"
              rows={5}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="O que precisa fazer?"
              className="input-field text-lg"
            />
          )}

          <select
            value={areaId}
            onChange={e => setAreaId(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Sem area (Caixa de entrada)</option>
            {areas.filter(a => a.slug !== 'financeiro').map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {isBatch && batchPreview.length > 0 && (
            <div className="bg-brand-bg rounded-xl p-3">
              <p className="text-xs font-medium text-brand-text/40 mb-2">
                {batchPreview.length} tarefa{batchPreview.length > 1 ? 's' : ''} detectada{batchPreview.length > 1 ? 's' : ''}:
              </p>
              <ul className="space-y-1">
                {batchPreview.slice(0, 10).map((line, i) => (
                  <li key={i} className="text-sm text-brand-text/70 flex items-center gap-2">
                    <span className="w-4 h-4 rounded border border-brand-text/20 flex-shrink-0" />
                    {line}
                  </li>
                ))}
                {batchPreview.length > 10 && (
                  <li className="text-xs text-brand-text/40">+ {batchPreview.length - 10} mais...</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-brand-text/5 bg-brand-bg/50">
          <button
            onClick={() => { setIsBatch(!isBatch); setText(''); setBatchPreview([]) }}
            className="btn-ghost flex items-center gap-2"
          >
            <ListPlus size={16} />
            {isBatch ? 'Tarefa unica' : 'Colar lista'}
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            <Plus size={16} />
            {saving ? 'Salvando...' : isBatch ? `Adicionar ${batchPreview.length || ''}` : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
