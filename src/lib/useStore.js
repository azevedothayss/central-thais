import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from '../contexts/AuthContext'

export function useAreas() {
  const { user } = useAuth()
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAreas = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return
    const { data } = await supabase
      .from('areas')
      .select('*')
      .order('sort_order')
    setAreas(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAreas() }, [fetchAreas])

  return { areas, loading, refetch: fetchAreas }
}

export function useTasks(areaId, filters = {}) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return
    let query = supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (areaId) query = query.eq('area_id', areaId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.planned_date) query = query.eq('planned_date', filters.planned_date)
    if (filters.is_habit !== undefined) query = query.eq('is_habit', filters.is_habit)
    if (filters.excludeCompleted) query = query.neq('status', 'completed')

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }, [user, areaId, filters.status, filters.planned_date, filters.is_habit, filters.excludeCompleted])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: user.id })
      .select('*, subtasks(*)')
      .single()
    if (!error) setTasks(prev => [data, ...prev])
    return { data, error }
  }

  const updateTask = async (id, updates) => {
    if (updates.status === 'completed') updates.completed_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*, subtasks(*)')
      .single()
    if (!error) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return { data, error }
  }

  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  const addSubtask = async (taskId, title) => {
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ task_id: taskId, title })
      .select()
      .single()
    if (!error) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), data] } : t
      ))
    }
    return { data, error }
  }

  const toggleSubtask = async (taskId, subtaskId, completed) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ completed })
      .eq('id', subtaskId)
    if (!error) {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s) }
          : t
      ))
    }
  }

  return { tasks, loading, addTask, updateTask, deleteTask, addSubtask, toggleSubtask, refetch: fetchTasks }
}

export function useEvents(areaId) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])

  const fetchEvents = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return
    let query = supabase
      .from('events')
      .select('*')
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(20)

    if (areaId) query = query.eq('area_id', areaId)
    const { data } = await query
    setEvents(data || [])
  }, [user, areaId])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const addEvent = async (event) => {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, user_id: user.id })
      .select()
      .single()
    if (!error) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.start_at) - new Date(b.start_at)))
    return { data, error }
  }

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  return { events, addEvent, deleteEvent, refetch: fetchEvents }
}

export function useFinances(month) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFinances = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return
    let query = supabase
      .from('finances')
      .select('*')
      .order('due_date', { nullsFirst: false })
      .order('created_at', { ascending: false })

    if (month) {
      const start = `${month}-01`
      const endDate = new Date(month + '-01')
      endDate.setMonth(endDate.getMonth() + 1)
      const end = endDate.toISOString().slice(0, 10)
      query = query.gte('due_date', start).lt('due_date', end)
    }

    const { data } = await query
    setEntries(data || [])
    setLoading(false)
  }, [user, month])

  useEffect(() => { fetchFinances() }, [fetchFinances])

  const addEntry = async (entry) => {
    const { data, error } = await supabase
      .from('finances')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single()
    if (!error) setEntries(prev => [data, ...prev])
    return { data, error }
  }

  const updateEntry = async (id, updates) => {
    const { data, error } = await supabase
      .from('finances')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setEntries(prev => prev.map(e => e.id === id ? data : e))
    return { data, error }
  }

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('finances').delete().eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  const summary = {
    totalIncome: entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0),
    totalExpense: entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0),
    totalPaid: entries.filter(e => e.paid).reduce((s, e) => s + Number(e.amount) * (e.type === 'expense' ? -1 : 1), 0),
    upcoming: entries.filter(e => !e.paid && e.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date)),
  }
  summary.balance = summary.totalIncome - summary.totalExpense

  return { entries, loading, summary, addEntry, updateEntry, deleteEntry, refetch: fetchFinances }
}

export function useNotes(areaId) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])

  const fetchNotes = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return
    let query = supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (areaId) query = query.eq('area_id', areaId)
    const { data } = await query
    setNotes(data || [])
  }, [user, areaId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = async (note) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: user.id })
      .select()
      .single()
    if (!error) setNotes(prev => [data, ...prev])
    return { data, error }
  }

  const updateNote = async (id, content) => {
    const { error } = await supabase.from('notes').update({ content }).eq('id', id)
    if (!error) setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n))
    return { error }
  }

  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
    return { error }
  }

  return { notes, addNote, updateNote, deleteNote, refetch: fetchNotes }
}
