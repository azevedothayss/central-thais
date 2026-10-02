import { Heart, Wallet, Briefcase, Sparkles, BookOpen } from 'lucide-react'

const themes = {
  pessoal: { accent: '#A56CFF', soft: '#F0E8FB', ink: '#7543A4', icon: Heart, description: 'Seu tempo, seu cuidado.' },
  financeiro: { accent: '#059669', soft: '#E4F2E9', ink: '#237356', icon: Wallet, description: 'Mais clareza para decidir.' },
  trabalho: { accent: '#552A7B', soft: '#EBE5F2', ink: '#552A7B', icon: Briefcase, description: 'Suas entregas, no lugar.' },
  projetos: { accent: '#FF675C', soft: '#FDEAE4', ink: '#B54C42', icon: Sparkles, description: 'Ideias que ganham forma.' },
  estudos: { accent: '#3B82F6', soft: '#E6EFFB', ink: '#3765A5', icon: BookOpen, description: 'Um pouco mais, todo dia.' },
}
export function themeFor(area) {
  const theme = themes[area?.slug] || themes.pessoal
  return { ...theme, accent: area?.color || theme.accent }
}
export function areaStyle(area) {
  const { accent, soft, ink } = themeFor(area)
  return { '--area-accent': accent, '--area-soft': soft, '--area-ink': ink }
}
export const areaPath = area => area.slug === 'financeiro' ? '/financeiro' : '/area/' + area.slug
const dateOptions = {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}
export const todayInBrazil = () => new Intl.DateTimeFormat('en-CA',dateOptions).format(new Date())
export const eventDateInBrazil = start => new Intl.DateTimeFormat('en-CA',dateOptions).format(new Date(start))
export const formatCurrency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
