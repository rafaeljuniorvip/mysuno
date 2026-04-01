import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Music, ListMusic, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generate', icon: Music, label: 'Generate' },
  { to: '/songs', icon: ListMusic, label: 'Songs' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Music size={24} color="var(--primary)" />
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
            <item.icon />
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
          <button onClick={logout} className="sidebar-logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
