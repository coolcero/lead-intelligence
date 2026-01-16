import { useState, useEffect } from 'react'
import {
    Settings,
    Key,
    Save,
    Check,
    AlertCircle,
    Zap,
    TestTube,
    Loader2,
    Server
} from 'lucide-react'

function SettingsPage() {
    const [settings, setSettings] = useState({
        groqApiKey: '',
        rapidApiKey: '', // Key provista por usuario
        autoClassify: true,
        autoGenerateProposals: true,
        scanInterval: 'daily',
        backendUrl: 'http://localhost:3001'
    })
    const [saved, setSaved] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [backendStatus, setBackendStatus] = useState(null)

    // Cargar configuración guardada
    useEffect(() => {
        const savedSettings = localStorage.getItem('leadIntelligence_settings')
        if (savedSettings) {
            setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
        }
        checkBackendStatus()
    }, [])

    // Verificar estado del backend
    const checkBackendStatus = async () => {
        try {
            const response = await fetch(`${settings.backendUrl}/api/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            })
            if (response.ok) {
                setBackendStatus({ online: true, message: 'Backend conectado' })
            } else {
                setBackendStatus({ online: false, message: 'Backend no responde' })
            }
        } catch (error) {
            setBackendStatus({ online: false, message: 'Backend no disponible (ejecuta: cd backend && npm start)' })
        }
    }

    // Guardar configuración
    const saveSettings = () => {
        localStorage.setItem('leadIntelligence_settings', JSON.stringify(settings))
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    // Probar conexión con Groq
    const testGroqConnection = async () => {
        if (!settings.groqApiKey) {
            setTestResult({ success: false, message: 'Por favor ingresa tu API Key de Groq' })
            return
        }

        setTesting(true)
        setTestResult(null)

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.groqApiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: 'Responde solo OK' }],
                    max_tokens: 10
                })
            })

            if (response.ok) {
                setTestResult({
                    success: true,
                    message: '✅ Conexión exitosa con Groq API (Llama 3.1)'
                })
            } else {
                const error = await response.json()
                setTestResult({
                    success: false,
                    message: `Error: ${error.error?.message || 'API Key inválida'}`
                })
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: `Error de conexión: ${error.message}`
            })
        }

        setTesting(false)
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>Configuración</h1>
                <p>Configura las APIs y preferencias del sistema</p>
            </div>

            {/* Saved notification */}
            {saved && (
                <div className="card" style={{
                    marginBottom: '24px',
                    borderColor: 'var(--accent)',
                    background: 'rgba(34, 197, 94, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Check size={24} style={{ color: 'var(--accent)' }} />
                        <span>Configuración guardada exitosamente</span>
                    </div>
                </div>
            )}

            {/* Backend Status */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Server size={20} />
                        Estado del Backend
                    </h2>
                    <button className="btn btn-secondary" onClick={checkBackendStatus} style={{ padding: '8px 12px' }}>
                        Verificar
                    </button>
                </div>

                {backendStatus && (
                    <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: backendStatus.online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: backendStatus.online ? 'var(--accent)' : 'var(--danger)'
                        }} />
                        <div>
                            <div style={{ fontWeight: 500 }}>
                                {backendStatus.online ? '🟢 Backend Online' : '🔴 Backend Offline'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {backendStatus.message}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '20px' }}>
                    <div className="form-group">
                        <label className="form-label">
                            <Server size={16} style={{ marginRight: '8px' }} />
                            URL del Backend
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: http://localhost:3001 o https://mi-backend.onrender.com"
                            value={settings.backendUrl}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\/$/, ''); // Remove trailing slash
                                setSettings({ ...settings, backendUrl: val });
                            }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Si despliegas en Render, pega aquí la URL que te den (ej: <code>https://lead-intelligence.onrender.com</code>).
                            Para local usa <code>http://localhost:3001</code>.
                        </p>
                    </div>
                </div>
            </div>

            {/* RapidAPI Configuration (JSearch) */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={20} className="text-warning" />
                        RapidAPI Key (JSearch) - Modo Turbo
                    </h2>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                        Clave para usar búsquedas ultrarrápidas de Indeed y LinkedIn (via JSearch).
                        <br />
                        <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/playground" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                            ➡ Obtener Key Gratis aquí
                        </a>
                    </p>

                    <div className="form-group">
                        <label className="form-label">
                            <Key size={16} style={{ marginRight: '8px' }} />
                            X-RapidAPI-Key
                        </label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Ej: 9dec538d54mshcf..."
                            value={settings.rapidApiKey || ''}
                            onChange={(e) => setSettings({ ...settings, rapidApiKey: e.target.value })}
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                            Copia el valor de "X-RapidAPI-Key" del Playground.
                        </small>
                    </div>
                </div>
            </div>

            {/* Groq API Configuration */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={20} />
                        Groq API (Inteligencia Artificial)
                    </h2>
                </div>

                <div style={{ marginTop: '16px' }}>
                    <div style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '20px'
                    }}>
                        <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                            🚀 Groq usa modelos Llama 3.1 - Rápido y Gratis
                        </p>
                        <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '20px' }}>
                            <li>Clasificar vacantes automáticamente → Servicios Bmind</li>
                            <li>Generar propuestas comerciales personalizadas</li>
                            <li>Calcular score de relevancia de leads</li>
                        </ul>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Key size={16} style={{ marginRight: '8px' }} />
                            API Key de Groq
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="gsk_..."
                                value={settings.groqApiKey}
                                onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={testGroqConnection}
                                disabled={testing}
                            >
                                {testing ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <TestTube size={18} />
                                )}
                                {testing ? 'Probando...' : 'Probar'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Obtén tu API Key gratis en{' '}
                            <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)' }}
                            >
                                console.groq.com/keys
                            </a>
                        </p>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div style={{
                            padding: '12px 16px',
                            background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            color: testResult.success ? 'var(--accent)' : 'var(--danger)',
                            fontSize: '0.875rem',
                            marginTop: '12px'
                        }}>
                            {testResult.message}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Features Configuration */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Funciones de IA</h2>
                </div>

                <div style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={settings.autoClassify}
                                onChange={(e) => setSettings({ ...settings, autoClassify: e.target.checked })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Clasificación automática de vacantes</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Usa Llama 3.1 para mapear vacantes a servicios Bmind
                                </div>
                            </div>
                        </label>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                checked={settings.autoGenerateProposals}
                                onChange={(e) => setSettings({ ...settings, autoGenerateProposals: e.target.checked })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <div>
                                <div style={{ fontWeight: 500 }}>Generar propuestas automáticamente</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Crea borradores de propuestas comerciales para cada lead
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Service Mapping */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Mapeo de Servicios Bmind</h2>
                </div>

                <div style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        El sistema clasifica las vacantes automáticamente:
                    </p>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Keywords en Vacante</th>
                                    <th>Servicio Bmind</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>DBA, Database, Oracle, SQL Server</code></td>
                                    <td>Servicios Gestionados de Base de Datos</td>
                                </tr>
                                <tr>
                                    <td><code>Cloud, AWS, Azure, GCP</code></td>
                                    <td>Operación Cloud</td>
                                </tr>
                                <tr>
                                    <td><code>DevOps, SRE, Kubernetes, Docker</code></td>
                                    <td>Consultoría DevOps</td>
                                </tr>
                                <tr>
                                    <td><code>SysAdmin, Soporte, Help Desk</code></td>
                                    <td>Servicios Gestionados TI</td>
                                </tr>
                                <tr>
                                    <td><code>Arquitecto, Solution Architect</code></td>
                                    <td>Consultoría en Arquitectura</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button className="btn btn-primary" onClick={saveSettings}>
                    <Save size={18} />
                    Guardar Configuración
                </button>
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
        </div>
    )
}

export default SettingsPage
