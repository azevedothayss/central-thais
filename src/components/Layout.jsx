import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAreas } from '../lib/useStore'
import { areaPath, areaStyle } from '../lib/presentation'
import { LayoutDashboard, Wallet, Plus, LogOut, Menu, X, Leaf } from 'lucide-react'
import QuickAdd from './QuickAdd'

function Brand() {
  return <div className="ct-brand"><span className="ct-brand-mark" aria-hidden="true">t<span /></span><div>Central <em>Thais</em><small>UM ESPAÇO PARA VOCÊ</small></div></div>
}
function SidebarLink({ to, label, area, icon: Icon, onClick }) {
  return <NavLink to={to} end={to === '/'} onClick={onClick}
    className={({ isActive }) => 'ct-nav-link' + (isActive ? ' active' : '') + (area ? ' area-link' : '')}
    style={area ? areaStyle(area) : undefined}>
    {area ? <span className="ct-area-dot" /> : <Icon size={20} strokeWidth={1.7} />}
    <span>{label}</span>
  </NavLink>
}
export default function Layout({ children }) {
  const { signOut, user } = useAuth()
  const { areas } = useAreas()
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const drawerRef = useRef(null)
  const menuRef = useRef(null)
  const area = areas.find(a => location.pathname === areaPath(a))
  const title = location.pathname === '/' ? 'Meu dia' : area?.name || 'Financeiro'
  const closeMenu = () => setMobileMenuOpen(false)
  useEffect(() => { closeMenu(); window.scrollTo({ top: 0 }); }, [location.pathname])
  useEffect(() => { document.title = 'Central Thais · ' + title }, [title])
  useEffect(() => {
    if (!mobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector('button')?.focus()
    const keydown = event => {
      if (event.key === 'Escape') closeMenu()
      if (event.key !== 'Tab') return
      const controls = [...drawerRef.current.querySelectorAll('a, button')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const resize = () => { if (window.innerWidth > 760) closeMenu() }
    document.addEventListener('keydown', keydown)
    window.addEventListener('resize', resize)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', keydown)
      window.removeEventListener('resize', resize)
      menuRef.current?.focus()
    }
  }, [mobileMenuOpen])
  const navigation = onClick => <>
    <p className="ct-nav-heading">SEU COTIDIANO</p>
    <nav aria-label="Seu cotidiano">
      <SidebarLink to="/" icon={LayoutDashboard} label="Meu dia" onClick={onClick} />
      <SidebarLink to="/financeiro" icon={Wallet} label="Finanças" onClick={onClick} />
    </nav>
    <div className="ct-nav-divider" />
    <p className="ct-nav-heading">ÁREAS DA VIDA</p>
    <nav aria-label="Áreas da vida">{areas.map(a => <SidebarLink key={a.id} to={areaPath(a)} label={a.name} area={a} onClick={onClick} />)}</nav>
  </>
  const profile = <div className="ct-profile"><span className="ct-avatar">TA</span><div><strong>Thais Azevedo</strong><small>{user?.email || 'Meu espaço pessoal'}</small></div></div>
  return <div className="central-app">
    <a className="ct-skip" href="#main-content">Pular para o conteúdo</a>
    <aside className="ct-sidebar" aria-label="Navegação principal">
      <Brand />{navigation()}
      <div className="ct-sidebar-bottom"><div className="ct-thought"><Leaf size={23} strokeWidth={1.4} /><p>Um passo de cada vez.<br /><em>Você está no seu tempo.</em></p></div>{profile}<button className="ct-signout" onClick={signOut}><LogOut size={17} />Sair</button></div>
    </aside>
    <div className="ct-main-shell">
      <header className="ct-topbar"><div className="ct-breadcrumb"><button ref={menuRef} className="ct-icon-button ct-menu-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu" aria-expanded={mobileMenuOpen} aria-controls={mobileMenuOpen ? 'mobile-navigation' : undefined}><Menu size={22} /></button><span className="ct-breadcrumb-base">Meu espaço<span>/</span></span><strong>{title}</strong></div><div className="ct-topbar-actions"><span className="ct-header-date">{new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })}</span><button className="ct-button ct-primary" onClick={() => setShowQuickAdd(true)}><Plus size={18} /><span>Nova tarefa</span></button></div></header>
      <main id="main-content" className="ct-content" tabIndex={-1}>{children}<footer className="ct-footer"><span>Central Thais</span><span>Seu espaço, no seu ritmo.</span></footer></main>
    </div>
    {mobileMenuOpen && <div className="ct-drawer-backdrop" onClick={closeMenu}><aside ref={drawerRef} id="mobile-navigation" className="ct-drawer" role="dialog" aria-modal="true" aria-label="Menu da Central" onClick={event => event.stopPropagation()}><div className="ct-drawer-head"><Brand /><button className="ct-icon-button" onClick={closeMenu} aria-label="Fechar menu"><X size={22} /></button></div>{navigation(closeMenu)}<div className="ct-sidebar-bottom">{profile}<button className="ct-signout" onClick={() => { signOut(); closeMenu() }}><LogOut size={17} />Sair</button></div></aside></div>}
    {showQuickAdd && <QuickAdd areas={areas} onClose={() => setShowQuickAdd(false)} onAdded={() => { setShowQuickAdd(false); navigate(0) }} />}
  </div>
}
