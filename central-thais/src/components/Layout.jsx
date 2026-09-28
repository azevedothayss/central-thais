import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAreas } from '../lib/useStore'
import {
  Home, Heart, Wallet, Briefcase, Rocket, BookOpen,
  Plus, LogOut, Menu, X, LayoutDashboard
} from 'lucide-react'
import QuickAdd from './QuickAdd'

const iconMap = {
  heart: Heart,
  wallet: Wallet,
  briefcase: Briefcase,
  rocket: Rocket,
  'book-open': BookOpen,
}

function SidebarLink({ to, icon: Icon, label, color, onClick, dot }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150
         ${isActive
          ? 'bg-brand-primary/8 text-brand-primary font-semibold'
          : 'text-brand-text/50 hover:text-brand-text hover:bg-brand-text/[0.03]'}`
      }
    >
      {dot ? (
        <div className="w-5 flex justify-center">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color || '#552A7B' }} />
        </div>
      ) : (
        <Icon size={18} className="opacity-60" />
      )}
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

  const areaLinks = areas.map(a => ({
    to: a.slug === 'financeiro' ? '/financeiro' : `/area/${a.slug}`,
    label: a.name,
    color: a.color,
    areaId: a.id,
  }))

  const mobileNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Painel' },
    ...areaLinks.slice(0, 3).map(a => ({
      ...a,
      icon: iconMap[areas.find(ar => ar.color === a.color)?.icon] || Home,
    })),
  ]

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-white/80 backdrop-blur-sm border-r border-brand-text/[0.04] z-30">
        <div className="px-5 pt-6 pb-4">
          <h1 className="font-display text-lg font-bold text-brand-primary tracking-tight">
            Central Thais
          </h1>
          <p className="text-[11px] text-brand-text/30 mt-0.5">
            @{user?.email?.split('@')[0] || 'thais'}
          </p>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <SidebarLink to="/" icon={LayoutDashboard} label="Visao geral" />

          <div className="mt-5 mb-2 px-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-brand-text/25">
              Pilares
            </p>
          </div>
          {areaLinks.map(item => (
            <SidebarLink key={item.to} {...item} dot />
          ))}
        </nav>

        <div className="p-3 space-y-1.5 border-t border-brand-text/[0.04]">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold
                       bg-brand-primary text-white hover:bg-brand-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Nova tarefa
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px]
                       text-brand-text/30 hover:text-brand-action hover:bg-brand-action/5 transition-all"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-brand-text/[0.04] z-30 px-4 h-13 flex items-center justify-between">
        <h1 className="font-display text-base font-bold text-brand-primary tracking-tight">Central Thais</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="p-2 rounded-xl bg-brand-primary text-white active:scale-95 transition-transform"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-brand-text/40 hover:text-brand-text/60"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-13 bg-black/20 backdrop-blur-[2px] z-20" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="bg-white rounded-b-2xl shadow-xl mx-2 p-3 space-y-0.5"
            onClick={e => e.stopPropagation()}
          >
            <SidebarLink to="/" icon={LayoutDashboard} label="Visao geral" onClick={() => setMobileMenuOpen(false)} />
            <div className="py-2 px-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-brand-text/25">Pilares</p>
            </div>
            {areaLinks.map(item => (
              <SidebarLink key={item.to} {...item} dot onClick={() => setMobileMenuOpen(false)} />
            ))}
            <div className="pt-2 mt-1 border-t border-brand-text/5">
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[12px] text-brand-text/30 hover:text-brand-action"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-56 pt-14 md:pt-0 pb-20 md:pb-6 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-brand-text/[0.04] z-30 safe-bottom">
        <div className="flex justify-around py-1">
          {mobileNavItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium transition-all
                   ${isActive ? 'text-brand-primary' : 'text-brand-text/35'}`
                }
              >
                {item.color ? (
                  <div className="w-[22px] h-[22px] flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  </div>
                ) : (
                  <Icon size={22} />
                )}
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium text-brand-text/35"
          >
            <Menu size={22} />
            <span>Mais</span>
          </button>
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
