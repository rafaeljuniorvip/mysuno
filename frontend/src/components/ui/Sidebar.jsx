import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Music, ListMusic, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generate', icon: Music, label: 'Gerar Musica' },
  { to: '/songs', icon: ListMusic, label: 'Musicas' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios' },
  { to: '/settings', icon: Settings, label: 'Configuracoes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Music size={20} />
        </div>
        <h1>MySuno</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            {user.picture && <img src={user.picture} alt="" className="sidebar-avatar" />}
            <span className="sidebar-username">{user.name?.split(' ')[0]}</span>
          </div>
          <button onClick={logout} className="sidebar-logout" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
