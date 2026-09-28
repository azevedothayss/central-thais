import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAreas } from '../lib/useStore'
import {
  Home, Heart, Wallet, Briefcase, Rocket, BookOpen,
  Plus, LogOut, Menu, X
} from 'lucide-react'
import QuickAdd from './QuickAdd'

const iconMap = {
  heart: Heart,
  wallet: Wallet,
  briefcase: Briefcase,
  rocket: Rocket,
  'book-open': BookOpen,
}

function NavItem({ to, icon: Icon, label, color, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
         ${isActive
          ? 'bg-brand-primary/10 text-brand-primary'
          : 'text-brand-text/50 hover:text-brand-text hover:bg-brand-text/5'}`
      }
    >
      <Icon size={20} style={color ? { color } : undefined} />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { signOut, user } = useAuth()
  const { areas } = useAreas()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navItems = [
    { to: '/', icon: Home, label: 'Hoje' },
    ...areas.map(a => ({
      to: a.slug === 'financeiro' ? '/financeiro' : `/area/${a.slug}`,
      icon: iconMap[a.icon] || Home,
      label: a.name,
      color: a.color,
      areaId: a.id,
    })),
  ]

  const mobileNavItems = navItems.slice(0, 4)
  const moreItems = navItems.slice(4)

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-white border-r border-brand-text/5 z-30">
        <div className="p-5 pb-3">
          <h1 className="font-display text-xl font-bold text-brand-primary">Central Thais</h1>
          <p className="text-xs text-brand-text/40 mt-0.5">{user?.email}</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-3 space-y-1 border-t border-brand-text/5">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold
                       bg-brand-primary text-white hover:bg-brand-primary/90 transition-all"
          >
            <Plus size={20} />
            Adicionar
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm
                       text-brand-text/40 hover:text-brand-action hover:bg-brand-action/5 transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-brand-text/5 z-30 px-4 h-14 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-brand-primary">Central Thais</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQuickAdd(true)} className="p-2 rounded-xl bg-brand-primary text-white">
            <Plus size={20} />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl text-brand-text/50">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-black/30 z-20" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white rounded-b-2xl shadow-lg mx-2 p-3 space-y-0.5" onClick={e => e.stopPropagation()}>
            {navItems.map(item => (
              <NavItem key={item.to} {...item} onClick={() => setMobileMenuOpen(false)} />
            ))}
            <button
              onClick={() => { signOut(); setMobileMenuOpen(false) }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-brand-text/40 hover:text-brand-action"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-60 pt-14 md:pt-0 pb-20 md:pb-6 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-brand-text/5 z-30 safe-bottom">
        <div className="flex justify-around py-1.5">
          {mobileNavItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all
                   ${isActive ? 'text-brand-primary' : 'text-brand-text/40'}`
                }
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium text-brand-text/40"
            >
              <Menu size={22} />
              <span>Mais</span>
            </button>
          )}
        </div>
      </nav>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAdd
          areas={areas}
          onClose={() => setShowQuickAdd(false)}
          onAdded={() => {
            setShowQuickAdd(false)
            navigate(0)
          }}
        />
      )}
    </div>
  )
}
