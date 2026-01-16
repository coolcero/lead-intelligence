import { useState, useEffect, useCallback } from 'react'
import {
    Search,
    Play,
    Pause,
    RefreshCw,
    Building2,
    Briefcase,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Zap,
    Globe,
    Loader2,
    Server
} from 'lucide-react'

// Portales de empleo disponibles
const JOB_PORTALS = [
    { id: 'computrabajo', name: 'Computrabajo', icon: '💼', enabled: true },
    { id: 'elempleo', name: 'El Empleo', icon: '📋', enabled: true },
    { id: 'indeed', name: 'Indeed Colombia', icon: '🔍', enabled: true },
    { id: 'magneto', name: 'Magneto', icon: '🧲', enabled: true },
    { id: 'linkedin', name: 'LinkedIn', icon: '💎', enabled: true, note: 'via Google' },
    { id: 'bumeran', name: 'Bumeran', icon: '🚀', enabled: true },
    { id: 'trabajando', name: 'Trabajando.com', icon: '💻', enabled: true }
]

function ScanPage() {
    const [companies, setCompanies] = useState([])
    const [scanning, setScanning] = useState(false)
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, portal: '', company: '' })
    const [scanResults, setScanResults] = useState({ found: 0, scanned: 0, errors: 0, filtered: 0 })
    const [vacancies, setVacancies] = useState([])
    const [selectedPortals, setSelectedPortals] = useState(['computrabajo', 'elempleo', 'indeed', 'magneto', 'linkedin', 'bumeran', 'trabajando'])
    const [scanLog, setScanLog] = useState([])
    const [backendOnline, setBackendOnline] = useState(false)
    const [settings, setSettings] = useState({
        groqApiKey: '',
        rapidApiKey: '', // Default Key removed for security
        backendUrl: 'http://localhost:3001'
    })
    const [findContacts, setFindContacts] = useState(true)
    const [lastOpportunities, setLastOpportunities] = useState([]) // Últimas oportunidades encontradas

    // Cargar datos
    useEffect(() => {
        const savedCompanies = localStorage.getItem('leadIntelligence_companies')
        if (savedCompanies) setCompanies(JSON.parse(savedCompanies))

        const savedVacancies = localStorage.getItem('leadIntelligence_vacancies')
        if (savedVacancies) setVacancies(JSON.parse(savedVacancies))

        const savedSettings = localStorage.getItem('leadIntelligence_settings')
        if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))

        checkBackendStatus()
    }, [])

    // Verificar estado del backend Y si hay escaneo activo
    const checkBackendStatus = async () => {
        try {
            const savedSettings = localStorage.getItem('leadIntelligence_settings')
            const url = savedSettings ? JSON.parse(savedSettings).backendUrl : 'http://localhost:3001'

            const response = await fetch(`${url}/api/status`, {
                signal: AbortSignal.timeout(3000)
            })

            if (response.ok) {
                setBackendOnline(true)
                const status = await response.json()

                // Si hay un escaneo activo, reconectar automáticamente
                if (status.isScanning) {
                    setScanning(true)
                    setScanProgress({
                        current: status.progress,
                        total: status.total,
                        portal: status.currentPortal,
                        company: status.currentCompany
                    })
                    setScanResults({
                        found: status.found,
                        scanned: status.progress,
                        errors: status.errors,
                        filtered: status.filtered
                    })

                    // También cargar logs
                    try {
                        const logsRes = await fetch(`${url}/api/logs`)
                        const logs = await logsRes.json()
                        setScanLog(logs)
                    } catch { }
                }
            } else {
                setBackendOnline(false)
            }
        } catch {
            setBackendOnline(false)
        }
    }

    // Polling del estado del escaneo Y logs en tiempo real
    useEffect(() => {
        let interval;
        if (scanning && backendOnline) {
            interval = setInterval(async () => {
                try {
                    // Obtener estado
                    const statusRes = await fetch(`${settings.backendUrl}/api/status`)
                    const status = await statusRes.json()

                    setScanProgress({
                        current: status.progress,
                        total: status.total,
                        portal: status.currentPortal,
                        company: status.currentCompany
                    })
                    setScanResults({
                        found: status.found,
                        scanned: status.progress,
                        errors: status.errors,
                        filtered: status.filtered
                    })

                    // Obtener logs en tiempo real
                    const logsRes = await fetch(`${settings.backendUrl}/api/logs`)
                    const logs = await logsRes.json()
                    setScanLog(logs)

                    if (!status.isScanning && scanning) {
                        setScanning(false)
                        fetchResults()
                    }
                } catch (error) {
                    console.error('Error polling:', error)
                }
            }, 1000) // Polling cada 1 segundo para logs en tiempo real
        }
        return () => clearInterval(interval)
    }, [scanning, backendOnline, settings.backendUrl])

    // NUEVO: Verificación periódica del backend cada 5 segundos (siempre activa)
    useEffect(() => {
        const checkInterval = setInterval(() => {
            checkBackendStatus()
        }, 5000)
        return () => clearInterval(checkInterval)
    }, [])

    // Obtener resultados
    const fetchResults = async () => {
        try {
            const response = await fetch(`${settings.backendUrl}/api/results`)
            const results = await response.json()

            if (results.length > 0) {
                // Actualizar últimas oportunidades encontradas (tomar las últimas 5)
                const recent = results.slice(-5).reverse();
                setLastOpportunities(recent);

                const newVacancies = [...vacancies, ...results]
                setVacancies(newVacancies)
                localStorage.setItem('leadIntelligence_vacancies', JSON.stringify(newVacancies))

                // También guardar como oportunidades
                const opportunities = newVacancies.map(v => ({
                    id: v.id,
                    company: v.companyName,
                    vacancy: v.title,
                    source: v.source,
                    sourceUrl: v.url,
                    bmindService: v.bmindService,
                    score: v.score,
                    postedDate: v.dateDetected,
                    status: v.status
                }))
                localStorage.setItem('leadIntelligence_opportunities', JSON.stringify(opportunities))

                addLog(`🎉 Escaneo completado: ${results.length} vacantes encontradas`, 'success')
            }
        } catch (error) {
            console.error('Error fetching results:', error)
        }
    }

    // Toggle portal selection
    const togglePortal = (portalId) => {
        const portal = JOB_PORTALS.find(p => p.id === portalId)
        if (!portal?.enabled) return

        setSelectedPortals(prev =>
            prev.includes(portalId)
                ? prev.filter(p => p !== portalId)
                : [...prev, portalId]
        )
    }

    // Agregar entrada al log
    const addLog = useCallback((message, type = 'info') => {
        setScanLog(prev => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message,
            type
        }, ...prev].slice(0, 100))
    }, [])

    // Iniciar escaneo con backend real
    const startScan = async () => {
        if (companies.length === 0) {
            addLog('No hay empresas para escanear. Importa empresas primero.', 'error')
            return
        }

        if (selectedPortals.length === 0) {
            addLog('Selecciona al menos un portal de empleo.', 'error')
            return
        }

        if (!backendOnline) {
            addLog('El backend no está disponible. Ejecuta: cd backend && npm install && npm start', 'error')
            return
        }

        setScanning(true)
        setScanResults({ found: 0, scanned: 0, errors: 0 })
        setScanLog([])

        addLog(`Iniciando escaneo de ${companies.length} empresas en ${selectedPortals.length} portales...`, 'info')

        try {
            const response = await fetch(`${settings.backendUrl}/api/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companies: companies, // TODAS las empresas
                    portals: selectedPortals,
                    groqApiKey: settings.groqApiKey,
                    findContacts: findContacts,
                    rapidApiKey: settings.rapidApiKey
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error iniciando escaneo')
            }

            addLog('Escaneo iniciado en el backend...', 'success')

        } catch (error) {
            addLog(`Error: ${error.message}`, 'error')
            setScanning(false)
        }
    }

    // Detener escaneo
    const stopScan = async () => {
        try {
            await fetch(`${settings.backendUrl}/api/scan/stop`, { method: 'POST' })
            setScanning(false)
            addLog('⏹️ Escaneo detenido', 'warning')
        } catch (error) {
            console.error('Error stopping scan:', error)
        }
    }

    // Limpiar resultados
    const clearResults = () => {
        setVacancies([])
        setScanLog([])
        setScanResults({ found: 0, scanned: 0, errors: 0 })
        localStorage.removeItem('leadIntelligence_vacancies')
        localStorage.removeItem('leadIntelligence_opportunities')

        const resetCompanies = companies.map(c => ({
            ...c,
            lastScanned: null,
            vacanciesFound: 0
        }))
        setCompanies(resetCompanies)
        localStorage.setItem('leadIntelligence_companies', JSON.stringify(resetCompanies))

        addLog('🗑️ Resultados limpiados', 'info')
    }

    // Generar reporte Excel
    const generateReport = async () => {
        addLog('📊 Generando reporte Excel...', 'info')
        try {
            const response = await fetch(`${settings.backendUrl}/api/report/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (response.ok) {
                const result = await response.json()
                addLog(`✅ Reporte generado: ${result.vacanciesReport?.filename}`, 'success')
                addLog(`📁 Ubicación: backend/reports/`, 'info')
            } else {
                throw new Error('Error generando reporte')
            }
        } catch (error) {
            addLog(`❌ Error: ${error.message}`, 'error')
        }
    }

    const progressPercentage = scanProgress.total > 0
        ? Math.round((scanProgress.current / scanProgress.total) * 100)
        : 0

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>Escanear Vacantes</h1>
                <p>Buscar ofertas de empleo reales en portales colombianos</p>
            </div>

            {/* Backend Status Alert */}
            {!backendOnline && (
                <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--warning)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Server size={24} style={{ color: 'var(--warning)' }} />
                        <div>
                            <div style={{ fontWeight: 600 }}>Backend no disponible</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Para escanear vacantes reales, inicia el backend:
                            </div>
                            <code style={{
                                display: 'block',
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'var(--bg-dark)',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                color: 'var(--primary)'
                            }}>
                                cd backend && npm install && npm start
                            </code>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={checkBackendStatus}
                            style={{ marginLeft: 'auto' }}
                        >
                            <RefreshCw size={16} />
                            Verificar
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Empresas a Escanear</h3>
                        <div className="value">{companies.length.toLocaleString()}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon info">
                        <Globe size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Portales Seleccionados</h3>
                        <div className="value">{selectedPortals.length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <Briefcase size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Vacantes Encontradas</h3>
                        <div className="value">{vacancies.length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className={`stat-icon ${backendOnline ? 'success' : 'warning'}`}>
                        <Server size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Backend</h3>
                        <div className="value" style={{ fontSize: '1rem' }}>
                            {backendOnline ? '🟢 Online' : '🔴 Offline'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Portal Selection */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Portales de Empleo</h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginTop: '16px'
                }}>
                    {JOB_PORTALS.map(portal => (
                        <div
                            key={portal.id}
                            onClick={() => togglePortal(portal.id)}
                            style={{
                                padding: '16px',
                                borderRadius: 'var(--radius-sm)',
                                border: `2px solid ${selectedPortals.includes(portal.id) ? 'var(--primary)' : 'var(--border)'}`,
                                background: selectedPortals.includes(portal.id) ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                                cursor: portal.enabled ? 'pointer' : 'not-allowed',
                                opacity: portal.enabled ? 1 : 0.5,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>{portal.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{portal.name}</div>
                                {portal.requiresAuth && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
                                        Requiere API
                                    </div>
                                )}
                                {portal.comingSoon && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Próximamente
                                    </div>
                                )}
                            </div>
                            {selectedPortals.includes(portal.id) && portal.enabled && (
                                <CheckCircle size={18} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Scan Controls */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 className="card-title">Control de Escaneo</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {!scanning ? (
                            <button
                                className="btn btn-primary"
                                onClick={startScan}
                                disabled={companies.length === 0 || selectedPortals.length === 0 || !backendOnline}
                            >
                                <Play size={18} />
                                Iniciar Escaneo Real
                            </button>
                        ) : (
                            <button className="btn btn-danger" onClick={stopScan}>
                                <Pause size={18} />
                                Detener
                            </button>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={clearResults}
                            disabled={scanning}
                        >
                            <RefreshCw size={18} />
                            Limpiar Resultados
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={generateReport}
                            disabled={scanning || vacancies.length === 0}
                            style={{ background: 'var(--accent)' }}
                        >
                            📊 Generar Excel
                        </button>
                    </div>
                </div>

                <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                }}>
                    🚀 Escaneo COMPLETO: Se buscarán TODAS las {companies.length.toLocaleString()} empresas en los 7 portales. El reporte Excel se genera automáticamente.
                </div>

                {/* Progress Bar */}
                {scanning && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            fontSize: '0.875rem'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader2 size={16} className="animate-spin" />
                                Escaneando: {scanProgress.company || 'Iniciando...'}
                            </span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="progress-bar" style={{ height: '12px' }}>
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div style={{
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            gap: '24px'
                        }}>
                            <span>Portal: {scanProgress.portal || '-'}</span>
                            <span>Progreso: {scanProgress.current} / {scanProgress.total}</span>
                        </div>
                    </div>
                )}

                {/* Results Summary */}
                {!scanning && scanResults.scanned > 0 && (
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        gap: '32px'
                    }}>
                        <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Búsquedas realizadas</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{scanResults.scanned}</div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Vacantes encontradas</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent)' }}>{scanResults.found}</div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Errores</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: scanResults.errors > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                {scanResults.errors}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scan Log */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Registro de Actividad</h2>
                    <span className="badge badge-info">{scanLog.length} entradas</span>
                </div>

                <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginTop: '16px',
                    background: 'var(--bg-dark)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                }}>
                    {scanLog.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                            El registro aparecerá aquí cuando inicies un escaneo...
                        </div>
                    ) : (
                        scanLog.map(entry => (
                            <div
                                key={entry.id}
                                style={{
                                    padding: '6px 0',
                                    borderBottom: '1px solid var(--border)',
                                    color: entry.type === 'error' ? 'var(--danger)'
                                        : entry.type === 'success' ? 'var(--accent)'
                                            : entry.type === 'warning' ? 'var(--warning)'
                                                : 'var(--text-secondary)'
                                }}
                            >
                                <span style={{ color: 'var(--text-muted)', marginRight: '12px' }}>
                                    [{entry.time}]
                                </span>
                                {entry.message}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Oportunidades Encontradas (Tiempo Real) */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="card-title">🚀 Oportunidades Encontradas (Tiempo Real)</h3>
                    <a href="/opportunities" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                        Ver Todas
                    </a>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Vacante</th>
                                <th>Servicio</th>
                                <th>Portal</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lastOpportunities.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                        Las oportunidades aparecerán aquí en tiempo real...
                                    </td>
                                </tr>
                            ) : (
                                lastOpportunities.map((opp, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 500 }}>{opp.companyName || opp.company}</td>
                                        <td>
                                            <a href={opp.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                                {opp.title || opp.vacancy}
                                            </a>
                                        </td>
                                        <td>
                                            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                                {opp.bmindService}
                                            </span>
                                        </td>
                                        <td>{opp.source}</td>
                                        <td>
                                            <div className="score-indicator" style={{ width: '60px' }}>
                                                <div className="score-bar">
                                                    <div className="score-bar-fill high" style={{ width: `${opp.score || 50}%` }} />
                                                </div>
                                                <span className="score-value">{opp.score || 50}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div >
    )
}

export default ScanPage
