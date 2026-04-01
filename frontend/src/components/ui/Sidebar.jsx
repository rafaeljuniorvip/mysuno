import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Music, ListMusic, BarChart3 } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generate', icon: Music, label: 'Generate' },
  { to: '/songs', icon: ListMusic, label: 'Songs' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Sidebar() {
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
    </aside>
  );
}
