import { useState, useEffect } from 'react'
import {
    Briefcase,
    Building2,
    Target,
    Search,
    ExternalLink,
    Mail,
    Phone,
    Linkedin,
    MapPin,
    FileText,
    RefreshCw,
    Download,
    Check,
    X,
    Clock,
    TrendingUp,
    User
} from 'lucide-react'

function Opportunities() {
    const [opportunities, setOpportunities] = useState([])
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOpp, setSelectedOpp] = useState(null)
    const backendUrl = localStorage.getItem('leadIntelligence_settings')
        ? JSON.parse(localStorage.getItem('leadIntelligence_settings')).backendUrl
        : 'http://localhost:3001'

    // Cargar oportunidades del backend
    const loadOpportunities = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${backendUrl}/api/results`)
            if (response.ok) {
                const data = await response.json()
                // Transformar datos para la UI
                const transformed = data.map((item, idx) => ({
                    id: idx + 1,
                    company: item.companyName || item.company || 'N/A',
                    vacancy: item.title || item.vacancy || 'N/A',
                    source: item.source || 'N/A',
                    sourceUrl: item.url || '#',
                    bmindService: item.bmindService || 'Servicios TI',
                    matchReason: item.matchReason || '',
                    score: item.score || 50,
                    status: item.status || 'new',
                    dateDetected: item.dateDetected || new Date().toISOString(),
                    // Datos del contacto
                    contactName: item.contacts?.[0]?.name || '',
                    contactTitle: item.contacts?.[0]?.title || '',
                    contactEmail: item.contacts?.[0]?.email || item.contacts?.[0]?.emails?.[0] || '',
                    contactPhone: item.contacts?.[0]?.phone || item.contacts?.[0]?.phones?.[0] || '',
                    contactLinkedin: item.contacts?.[0]?.linkedin || '',
                    // Datos de la empresa
                    companyNit: item.contacts?.[0]?.companyNit || '',
                    companyAddress: item.contacts?.[0]?.companyAddress || '',
                    // Emails y teléfonos adicionales
                    allEmails: item.contacts?.[0]?.emails || [],
                    allPhones: item.contacts?.[0]?.phones || []
                }))
                setOpportunities(transformed)
            }
        } catch (error) {
            console.error('Error cargando oportunidades:', error)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadOpportunities()
        // Auto-refresh cada 30 segundos
        const interval = setInterval(loadOpportunities, 30000)
        return () => clearInterval(interval)
    }, [])

    const filteredOpportunities = opportunities.filter(opp => {
        const matchesFilter = filter === 'all' || opp.status === filter
        const matchesSearch =
            opp.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opp.vacancy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opp.bmindService?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opp.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const updateStatus = (id, newStatus) => {
        setOpportunities(prev => prev.map(opp =>
            opp.id === id ? { ...opp, status: newStatus } : opp
        ))
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'new': return <span className="badge badge-info">Nueva</span>
            case 'contacted': return <span className="badge badge-warning">Contactada</span>
            case 'negotiating': return <span className="badge badge-primary">En negociación</span>
            case 'won': return <span className="badge badge-success">Ganada</span>
            case 'lost': return <span className="badge badge-danger">Perdida</span>
            default: return <span className="badge">{status}</span>
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Oportunidades</h1>
                    <p>Vacantes detectadas con datos de contacto completos</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={loadOpportunities}
                    disabled={loading}
                >
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    {loading ? 'Cargando...' : 'Actualizar'}
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Total</h3>
                        <div className="value">{opportunities.length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <Mail size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Con Email</h3>
                        <div className="value">{opportunities.filter(o => o.contactEmail).length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Phone size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Con Teléfono</h3>
                        <div className="value">{opportunities.filter(o => o.contactPhone).length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Linkedin size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Con LinkedIn</h3>
                        <div className="value">{opportunities.filter(o => o.contactLinkedin).length}</div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)'
                        }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar por empresa, vacante, servicio o contacto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Opportunities Table */}
            {filteredOpportunities.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Briefcase size={36} />
                        </div>
                        <h3>
                            {opportunities.length === 0
                                ? 'No hay oportunidades detectadas'
                                : 'No se encontraron resultados'}
                        </h3>
                        <p>
                            {opportunities.length === 0
                                ? 'Ejecuta un escaneo para detectar vacantes en portales de empleo'
                                : 'Intenta con otros términos de búsqueda'
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table style={{ minWidth: '1200px' }}>
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Vacante</th>
                                    <th>Servicio Bmind</th>
                                    <th>Portal</th>
                                    <th>Contacto</th>
                                    <th>Email</th>
                                    <th>Teléfono</th>
                                    <th>LinkedIn</th>
                                    <th>NIT</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOpportunities.map((opp) => (
                                    <tr key={opp.id}>
                                        <td style={{ fontWeight: 500, maxWidth: '150px' }}>
                                            {opp.company}
                                        </td>
                                        <td style={{ maxWidth: '200px' }}>
                                            <a
                                                href={opp.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--secondary)', textDecoration: 'none' }}
                                            >
                                                {opp.vacancy}
                                            </a>
                                        </td>
                                        <td>
                                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                                                {opp.bmindService}
                                            </span>
                                        </td>
                                        <td>{opp.source}</td>
                                        <td style={{ maxWidth: '150px' }}>
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <strong>{opp.contactName || '-'}</strong>
                                                {opp.contactTitle && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {opp.contactTitle}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {opp.contactEmail ? (
                                                <a
                                                    href={`mailto:${opp.contactEmail}`}
                                                    style={{ color: 'var(--success)', fontSize: '0.8rem' }}
                                                >
                                                    {opp.contactEmail}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {opp.contactPhone ? (
                                                <a
                                                    href={`tel:${opp.contactPhone}`}
                                                    style={{ color: 'var(--warning)', fontSize: '0.8rem' }}
                                                >
                                                    {opp.contactPhone}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {opp.contactLinkedin ? (
                                                <a
                                                    href={opp.contactLinkedin}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#0077B5' }}
                                                >
                                                    <Linkedin size={16} />
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td style={{ fontSize: '0.8rem' }}>
                                            {opp.companyNit || '-'}
                                        </td>
                                        <td>{getStatusBadge(opp.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {opp.contactEmail && (
                                                    <a
                                                        href={`mailto:${opp.contactEmail}`}
                                                        className="btn btn-icon btn-primary"
                                                        title="Enviar email"
                                                        style={{ padding: '6px' }}
                                                    >
                                                        <Mail size={14} />
                                                    </a>
                                                )}
                                                {opp.contactPhone && (
                                                    <a
                                                        href={`tel:${opp.contactPhone}`}
                                                        className="btn btn-icon btn-success"
                                                        title="Llamar"
                                                        style={{ padding: '6px' }}
                                                    >
                                                        <Phone size={14} />
                                                    </a>
                                                )}
                                                {opp.status === 'new' && (
                                                    <button
                                                        className="btn btn-icon btn-warning"
                                                        onClick={() => updateStatus(opp.id, 'contacted')}
                                                        title="Marcar contactada"
                                                        style={{ padding: '6px' }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Match Reason Section */}
            {selectedOpp && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">Detalles: {selectedOpp.company}</h2>
                    </div>
                    <div style={{ padding: '16px' }}>
                        <p><strong>Match Reason:</strong> {selectedOpp.matchReason}</p>
                        <p><strong>Dirección:</strong> {selectedOpp.companyAddress || 'No disponible'}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Opportunities
