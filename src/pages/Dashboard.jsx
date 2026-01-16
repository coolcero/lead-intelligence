import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Building2,
    Briefcase,
    TrendingUp,
    Search,
    Target,
    Activity,
    ArrowUpRight,
    Clock,
    Play
} from 'lucide-react'

function Dashboard() {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeVacancies: 0,
        qualifiedLeads: 0,
        pendingContacts: 0
    })
    const [recentOpportunities, setRecentOpportunities] = useState([])
    const [topServices, setTopServices] = useState([
        { name: 'Servicios Gestionados BD', count: 0, percentage: 0 },
        { name: 'Operación Cloud', count: 0, percentage: 0 },
        { name: 'Consultoría DevOps', count: 0, percentage: 0 },
        { name: 'Servicios Gestionados TI', count: 0, percentage: 0 }
    ])

    // Cargar datos del localStorage
    useEffect(() => {
        // Cargar empresas
        const savedCompanies = localStorage.getItem('leadIntelligence_companies')
        const companies = savedCompanies ? JSON.parse(savedCompanies) : []

        // Cargar vacantes/oportunidades
        const savedOpportunities = localStorage.getItem('leadIntelligence_opportunities')
        const opportunities = savedOpportunities ? JSON.parse(savedOpportunities) : []

        // Calcular estadísticas
        const newLeads = opportunities.filter(o => o.status === 'new').length
        const contacted = opportunities.filter(o => o.status === 'contacted').length

        setStats({
            totalCompanies: companies.length,
            activeVacancies: opportunities.length,
            qualifiedLeads: opportunities.filter(o => o.score >= 70).length,
            pendingContacts: newLeads
        })

        // Oportunidades recientes (últimas 5)
        setRecentOpportunities(opportunities.slice(0, 5))

        // Calcular servicios más demandados
        const serviceCounts = {}
        opportunities.forEach(opp => {
            const service = opp.bmindService || 'Otros'
            serviceCounts[service] = (serviceCounts[service] || 0) + 1
        })

        const maxCount = Math.max(...Object.values(serviceCounts), 1)
        const servicesArray = [
            { name: 'Servicios Gestionados BD', key: 'Servicios Gestionados' },
            { name: 'Operación Cloud', key: 'Cloud' },
            { name: 'Consultoría DevOps', key: 'DevOps' },
            { name: 'Servicios Gestionados TI', key: 'TI' }
        ].map(s => {
            const count = Object.entries(serviceCounts)
                .filter(([key]) => key.includes(s.key) || key.includes(s.name.split(' ')[0]))
                .reduce((sum, [, val]) => sum + val, 0)
            return {
                name: s.name,
                count,
                percentage: (count / maxCount) * 100
            }
        })

        setTopServices(servicesArray)

    }, [])

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Resumen de oportunidades de negocio para Bmind</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Empresas Monitoreadas</h3>
                        <div className="value">{stats.totalCompanies.toLocaleString()}</div>
                        <div className="change positive">
                            {stats.totalCompanies > 0 ? 'Base de datos activa' : 'Importa tu lista para comenzar'}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Vacantes Detectadas</h3>
                        <div className="value">{stats.activeVacancies}</div>
                        <div className="change">
                            {stats.activeVacancies > 0 ? 'Oportunidades activas' : 'Ejecuta un escaneo'}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <Target size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Leads Calificados</h3>
                        <div className="value">{stats.qualifiedLeads}</div>
                        <div className="change">Score ≥ 70</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon info">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Pendientes de Contacto</h3>
                        <div className="value">{stats.pendingContacts}</div>
                        <div className="change">Por gestionar</div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Recent Opportunities */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Oportunidades Recientes</h2>
                        <Link to="/opportunities" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                            Ver todas
                        </Link>
                    </div>

                    {recentOpportunities.length === 0 ? (
                        <div className="empty-state" style={{ padding: '32px' }}>
                            <div className="empty-state-icon" style={{ width: '60px', height: '60px' }}>
                                <Search size={28} />
                            </div>
                            <h3>Sin oportunidades aún</h3>
                            <p>Importa empresas y ejecuta un escaneo para detectar vacantes</p>
                        </div>
                    ) : (
                        <div>
                            {recentOpportunities.map((opp, idx) => (
                                <div key={idx} style={{
                                    padding: '16px',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{opp.company}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {opp.vacancy}
                                        </div>
                                    </div>
                                    <div className="score-indicator" style={{ width: '100px' }}>
                                        <div className="score-bar">
                                            <div
                                                className={`score-bar-fill ${opp.score >= 80 ? 'high' : opp.score >= 50 ? 'medium' : 'low'}`}
                                                style={{ width: `${opp.score}%` }}
                                            />
                                        </div>
                                        <span className="score-value">{opp.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Services */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Servicios Bmind Demandados</h2>
                        <Activity size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        {topServices.map((service, idx) => (
                            <div key={idx} style={{ marginBottom: '20px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    fontSize: '0.875rem'
                                }}>
                                    <span>{service.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{service.count} oportunidades</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${service.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {stats.totalCompanies === 0 && (
                        <div style={{
                            marginTop: '24px',
                            padding: '16px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
                                💡 Importa tu lista de empresas para comenzar a detectar oportunidades
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Acciones Rápidas</h2>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <Link to="/companies" className="btn btn-primary">
                        <Building2 size={18} />
                        {stats.totalCompanies > 0 ? 'Ver Empresas' : 'Importar Empresas'}
                    </Link>
                    <Link to="/scan" className="btn btn-success">
                        <Play size={18} />
                        Iniciar Escaneo
                    </Link>
                    <Link to="/opportunities" className="btn btn-secondary">
                        <TrendingUp size={18} />
                        Ver Oportunidades
                    </Link>
                </div>
            </div>

            {/* Getting Started Guide */}
            {stats.totalCompanies === 0 && (
                <div className="card" style={{ marginTop: '24px', borderColor: 'var(--primary)' }}>
                    <div className="card-header">
                        <h2 className="card-title">🚀 Guía de Inicio Rápido</h2>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div style={{ flex: 1, padding: '20px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>1️⃣</div>
                                <h4 style={{ marginBottom: '8px' }}>Importar Empresas</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Pega los nombres de las empresas colombianas que quieres monitorear
                                </p>
                            </div>
                            <div style={{ flex: 1, padding: '20px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>2️⃣</div>
                                <h4 style={{ marginBottom: '8px' }}>Escanear Vacantes</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    El sistema buscará ofertas de empleo en portales como Computrabajo
                                </p>
                            </div>
                            <div style={{ flex: 1, padding: '20px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>3️⃣</div>
                                <h4 style={{ marginBottom: '8px' }}>Detectar Oportunidades</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Las vacantes se clasifican automáticamente en servicios Bmind
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
