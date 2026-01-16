import { useState, useRef, useCallback } from 'react'
import {
    Building2,
    Upload,
    FileSpreadsheet,
    Search,
    Trash2,
    Check,
    AlertCircle,
    Download,
    X,
    Filter,
    ClipboardPaste,
    Plus
} from 'lucide-react'
import * as XLSX from 'xlsx'

function Companies() {
    const [companies, setCompanies] = useState(() => {
        const saved = localStorage.getItem('leadIntelligence_companies')
        return saved ? JSON.parse(saved) : []
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [previewData, setPreviewData] = useState(null)
    const [showPasteMode, setShowPasteMode] = useState(true) // Por defecto mostrar el modo de pegar
    const [pastedText, setPastedText] = useState('')
    const fileInputRef = useRef(null)

    // Guardar empresas en localStorage
    const saveCompanies = useCallback((newCompanies) => {
        setCompanies(newCompanies)
        localStorage.setItem('leadIntelligence_companies', JSON.stringify(newCompanies))
    }, [])

    // Procesar texto pegado (nombres de empresas, uno por línea)
    const processPastedNames = useCallback(() => {
        if (!pastedText.trim()) {
            setImportResult({ success: false, message: 'Por favor pega los nombres de las empresas' })
            return
        }

        // Separar por líneas y limpiar
        const lines = pastedText
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 2) // Filtrar líneas muy cortas

        if (lines.length === 0) {
            setImportResult({ success: false, message: 'No se encontraron nombres válidos' })
            return
        }

        // Crear empresas
        const processedCompanies = lines.map((name, idx) => ({
            id: `company_${Date.now()}_${idx}`,
            razonSocial: name,
            nit: '',
            sector: 'Privado',
            ciudad: '',
            contactoNombre: '',
            contactoEmail: '',
            contactoCargo: '',
            status: 'pending',
            lastScanned: null,
            createdAt: new Date().toISOString(),
            vacanciesFound: 0
        }))

        // Mostrar preview
        setPreviewData({
            total: processedCompanies.length,
            companies: processedCompanies,
            columns: ['Texto pegado'],
            usedColumn: 'Nombres',
            sample: processedCompanies.slice(0, 5),
            fromPaste: true
        })
    }, [pastedText])

    // Procesar archivo Excel
    const processExcelFile = useCallback((file) => {
        setImporting(true)
        setImportResult(null)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                if (jsonData.length === 0) {
                    setImportResult({
                        success: false,
                        message: 'El archivo está vacío o no tiene datos válidos'
                    })
                    setImporting(false)
                    return
                }

                // Detectar columnas automáticamente
                const firstRow = jsonData[0]
                const columns = Object.keys(firstRow)

                // Buscar columna de razón social (intentar varios nombres)
                const razonSocialColumn = columns.find(col =>
                    col.toLowerCase().includes('razon') ||
                    col.toLowerCase().includes('razón') ||
                    col.toLowerCase().includes('nombre') ||
                    col.toLowerCase().includes('empresa') ||
                    col.toLowerCase() === 'company'
                ) || columns[0]

                // Procesar empresas
                const processedCompanies = jsonData.map((row, idx) => ({
                    id: `company_${Date.now()}_${idx}`,
                    razonSocial: String(row[razonSocialColumn] || '').trim(),
                    nit: row.nit || row.NIT || row.Nit || '',
                    sector: row.sector || row.Sector || row.SECTOR || 'Privado',
                    ciudad: row.ciudad || row.Ciudad || row.CIUDAD || '',
                    contactoNombre: row.contacto_nombre || row.contactoNombre || row.Contacto || '',
                    contactoEmail: row.contacto_email || row.contactoEmail || row.Email || row.email || '',
                    contactoCargo: row.contacto_cargo || row.contactoCargo || row.Cargo || '',
                    status: 'pending',
                    lastScanned: null,
                    createdAt: new Date().toISOString(),
                    vacanciesFound: 0
                })).filter(c => c.razonSocial && c.razonSocial.length > 2)

                setPreviewData({
                    total: processedCompanies.length,
                    companies: processedCompanies,
                    columns: columns,
                    usedColumn: razonSocialColumn,
                    sample: processedCompanies.slice(0, 5)
                })
                setImporting(false)

            } catch (error) {
                console.error('Error processing file:', error)
                setImportResult({
                    success: false,
                    message: `Error al procesar el archivo: ${error.message}`
                })
                setImporting(false)
            }
        }

        reader.onerror = () => {
            setImportResult({
                success: false,
                message: 'Error al leer el archivo'
            })
            setImporting(false)
        }

        reader.readAsArrayBuffer(file)
    }, [])

    // Confirmar importación
    const confirmImport = useCallback(() => {
        if (!previewData) return

        const newCompanies = [...companies, ...previewData.companies]
        saveCompanies(newCompanies)

        setImportResult({
            success: true,
            message: `Se importaron ${previewData.companies.length} empresas exitosamente`
        })
        setPreviewData(null)
        setPastedText('') // Limpiar el texto pegado
    }, [previewData, companies, saveCompanies])

    // Cancelar preview
    const cancelPreview = useCallback(() => {
        setPreviewData(null)
    }, [])

    // Manejar drop de archivo
    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)

        const file = e.dataTransfer.files[0]
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
            processExcelFile(file)
        } else {
            setImportResult({
                success: false,
                message: 'Por favor sube un archivo Excel (.xlsx, .xls) o CSV'
            })
        }
    }, [processExcelFile])

    // Manejar selección de archivo
    const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0]
        if (file) {
            processExcelFile(file)
        }
    }, [processExcelFile])

    // Eliminar empresa
    const deleteCompany = useCallback((id) => {
        const newCompanies = companies.filter(c => c.id !== id)
        saveCompanies(newCompanies)
    }, [companies, saveCompanies])

    // Limpiar todas las empresas
    const clearAllCompanies = useCallback(() => {
        if (window.confirm('¿Estás seguro de que quieres eliminar todas las empresas?')) {
            saveCompanies([])
            setImportResult({ success: true, message: 'Se eliminaron todas las empresas' })
        }
    }, [saveCompanies])

    // Descargar plantilla
    const downloadTemplate = useCallback(() => {
        const template = [
            {
                razon_social: 'Empresa Ejemplo S.A.S.',
                nit: '900123456-7',
                sector: 'Tecnología',
                ciudad: 'Bogotá',
                contacto_nombre: 'Juan Pérez',
                contacto_email: 'juan@empresa.com',
                contacto_cargo: 'Gerente TI'
            }
        ]

        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Empresas')
        XLSX.writeFile(wb, 'plantilla_empresas.xlsx')
    }, [])

    // Filtrar empresas por búsqueda
    const filteredCompanies = companies.filter(c =>
        c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.ciudad && c.ciudad.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.sector && c.sector.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>Empresas</h1>
                <p>Gestiona tu base de datos de empresas colombianas a monitorear</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Empresas</h3>
                        <div className="value">{companies.length.toLocaleString()}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <Check size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Escaneadas</h3>
                        <div className="value">{companies.filter(c => c.lastScanned).length}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <AlertCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Con Vacantes</h3>
                        <div className="value">{companies.filter(c => c.vacanciesFound > 0).length}</div>
                    </div>
                </div>
            </div>

            {/* Import Result */}
            {importResult && (
                <div
                    className={`card ${importResult.success ? '' : ''}`}
                    style={{
                        marginBottom: '24px',
                        borderColor: importResult.success ? 'var(--accent)' : 'var(--danger)',
                        background: importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {importResult.success ? (
                            <Check size={24} style={{ color: 'var(--accent)' }} />
                        ) : (
                            <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
                        )}
                        <span>{importResult.message}</span>
                        <button
                            onClick={() => setImportResult(null)}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewData && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h2>Confirmar Importación</h2>
                            <button onClick={cancelPreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Empresas encontradas:</span>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>
                                            {previewData.total.toLocaleString()}
                                        </div>
                                    </div>
                                    {!previewData.fromPaste && (
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Columna detectada:</span>
                                            <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                                                "{previewData.usedColumn}"
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!previewData.fromPaste && (
                                    <div style={{
                                        padding: '12px 16px',
                                        background: 'rgba(14, 165, 233, 0.1)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--secondary)',
                                        fontSize: '0.875rem',
                                        marginBottom: '16px'
                                    }}>
                                        💡 Columnas detectadas: {previewData.columns.join(', ')}
                                    </div>
                                )}
                            </div>

                            <h4 style={{ marginBottom: '12px' }}>Vista previa (primeras 5):</h4>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Razón Social</th>
                                            <th>Ciudad</th>
                                            <th>Sector</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.sample.map((company, idx) => (
                                            <tr key={idx}>
                                                <td>{company.razonSocial}</td>
                                                <td>{company.ciudad || '-'}</td>
                                                <td>{company.sector || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={cancelPreview}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={confirmImport}>
                                <Check size={18} />
                                Importar {previewData.total.toLocaleString()} empresas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Options Tabs */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Agregar Empresas</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className={`btn ${showPasteMode ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setShowPasteMode(true)}
                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                        >
                            <ClipboardPaste size={16} />
                            Pegar Nombres
                        </button>
                        <button
                            className={`btn ${!showPasteMode ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setShowPasteMode(false)}
                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                        >
                            <Upload size={16} />
                            Subir Excel
                        </button>
                    </div>
                </div>

                {/* Paste Mode */}
                {showPasteMode ? (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '16px',
                            fontSize: '0.875rem',
                            color: 'var(--primary-light)'
                        }}>
                            💡 Pega los nombres de las empresas, uno por línea. Puedes copiar directamente desde Excel.
                        </div>
                        <textarea
                            className="form-input"
                            placeholder="Empresa 1 S.A.S.
Empresa 2 Ltda.
Empresa 3 S.A.
..."
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: '200px',
                                resize: 'vertical',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                lineHeight: '1.6'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                {pastedText.split(/[\n\r]+/).filter(l => l.trim().length > 2).length} nombres detectados
                            </span>
                            <button
                                className="btn btn-primary"
                                onClick={processPastedNames}
                                disabled={!pastedText.trim()}
                            >
                                <Plus size={18} />
                                Procesar Nombres
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Excel Upload Mode */
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                            <button className="btn btn-secondary" onClick={downloadTemplate} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                                <Download size={16} />
                                Descargar Plantilla
                            </button>
                        </div>
                        <div
                            className={`file-upload ${dragOver ? 'dragover' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx,.xls,.csv"
                                style={{ display: 'none' }}
                            />
                            <div className="file-upload-icon">
                                {importing ? (
                                    <div className="animate-pulse"><FileSpreadsheet size={32} /></div>
                                ) : (
                                    <Upload size={32} />
                                )}
                            </div>
                            <h3>{importing ? 'Procesando archivo...' : 'Arrastra tu archivo Excel aquí'}</h3>
                            <p>o haz clic para seleccionar un archivo (.xlsx, .xls, .csv)</p>
                            <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                El archivo debe tener al menos una columna con el nombre de la empresa (razón social)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Companies Table */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Lista de Empresas</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
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
                                placeholder="Buscar empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '40px', width: '250px' }}
                            />
                        </div>
                        {companies.length > 0 && (
                            <button className="btn btn-danger" onClick={clearAllCompanies} style={{ padding: '10px 16px' }}>
                                <Trash2 size={16} />
                                Limpiar Todo
                            </button>
                        )}
                    </div>
                </div>

                {filteredCompanies.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Building2 size={36} />
                        </div>
                        <h3>{companies.length === 0 ? 'No hay empresas importadas' : 'No se encontraron resultados'}</h3>
                        <p>
                            {companies.length === 0
                                ? 'Pega los nombres de las empresas arriba para comenzar'
                                : 'Intenta con otro término de búsqueda'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Razón Social</th>
                                    <th>Ciudad</th>
                                    <th>Sector</th>
                                    <th>Estado</th>
                                    <th>Vacantes</th>
                                    <th style={{ width: '80px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCompanies.slice(0, 50).map((company) => (
                                    <tr key={company.id}>
                                        <td style={{ fontWeight: 500 }}>{company.razonSocial}</td>
                                        <td>{company.ciudad || '-'}</td>
                                        <td>{company.sector || '-'}</td>
                                        <td>
                                            <span className={`badge ${company.lastScanned ? 'badge-success' : 'badge-warning'}`}>
                                                {company.lastScanned ? 'Escaneada' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td>
                                            {company.vacanciesFound > 0 ? (
                                                <span className="badge badge-primary">{company.vacanciesFound}</span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-icon btn-secondary"
                                                onClick={() => deleteCompany(company.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredCompanies.length > 50 && (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                borderTop: '1px solid var(--border)'
                            }}>
                                Mostrando 50 de {filteredCompanies.length.toLocaleString()} empresas
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Companies
