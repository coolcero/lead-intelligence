import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Settings,
  Search,
  TrendingUp,
  Zap
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Opportunities from './pages/Opportunities'
import ScanPage from './pages/ScanPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="icon">
              <Zap size={24} />
            </div>
            <h1>Lead Intelligence</h1>
          </div>

          <nav>
            <div className="nav-section">
              <div className="nav-section-title">Principal</div>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/companies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Building2 size={20} />
                <span>Empresas</span>
              </NavLink>
              <NavLink to="/opportunities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Briefcase size={20} />
                <span>Oportunidades</span>
              </NavLink>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">Herramientas</div>
              <NavLink to="/scan" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Search size={20} />
                <span>Escanear</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileSpreadsheet size={20} />
                <span>Reportes</span>
              </NavLink>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">Sistema</div>
              <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={20} />
                <span>Configuración</span>
              </NavLink>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/reports" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
