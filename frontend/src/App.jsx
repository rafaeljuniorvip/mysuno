import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/ui/Sidebar';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Songs from './pages/Songs';
import SongDetail from './pages/SongDetail';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
