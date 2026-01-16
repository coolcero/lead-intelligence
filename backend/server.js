import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeComputrabajo } from './scrapers/computrabajo.js';
import { scrapeElEmpleo } from './scrapers/elempleo.js';
import { scrapeIndeed } from './scrapers/indeed.js';
import { scrapeMagneto } from './scrapers/magneto.js';
import { scrapeLinkedIn } from './scrapers/linkedin.js';
import { scrapeBumeran } from './scrapers/bumeran.js';
import { scrapeTrabajando } from './scrapers/trabajando.js';
import { classifyVacancy, isRelevantVacancy } from './services/classifier.js';
import { findDecisionMaker, GROQ_API_KEY } from './services/contactFinder.js';
import { searchJobsWithRapidAPI } from './services/rapidApiService.js';
import { generateExcelReport, generateCompaniesReport } from './services/excelExporter.js';
import { scanBusinessNews, quickNewsScan } from './services/newsScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Estado del scraping
let scanStatus = {
    isScanning: false,
    currentCompany: '',
    currentPortal: '',
    progress: 0,
    total: 0,
    found: 0,
    filtered: 0,
    errors: 0,
    contactsFound: 0,
    startTime: null,
    lastExcelGenerated: null
};

let scanResults = [];
let scannedCompanies = []; // Lista de empresas ya escaneadas {name, status, vacancies, timestamp}
let activityLogs = []; // Array de logs en tiempo real
let generatedReports = []; // Lista de reportes generados

// Función para agregar logs
function addLog(message, type = 'info') {
    const log = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('es-CO'),
        message,
        type
    };
    activityLogs.unshift(log);
    // Mantener solo los últimos 200 logs
    if (activityLogs.length > 200) activityLogs.pop();
    console.log(`[${log.time}] ${message}`);
}

// Endpoints
app.get('/api/status', (req, res) => {
    res.json(scanStatus);
});

app.get('/api/results', (req, res) => {
    res.json(scanResults);
});

// NUEVO: Endpoint para obtener logs en tiempo real
app.get('/api/logs', (req, res) => {
    res.json(activityLogs);
});

// Obtener empresas ya escaneadas
app.get('/api/scanned-companies', (req, res) => {
    res.json({
        total: scannedCompanies.length,
        companies: scannedCompanies
    });
});

// Obtener reportes generados
app.get('/api/reports', (req, res) => {
    res.json(generatedReports);
});

// Limpiar resultados
app.post('/api/results/clear', (req, res) => {
    scanResults = [];
    scannedCompanies = [];
    generatedReports = [];
    res.json({ message: 'Resultados limpiados' });
});

// Iniciar escaneo SIN LÍMITE de empresas
app.post('/api/scan', async (req, res) => {
    const { companies, portals, groqApiKey, findContacts = true, rapidApiKey } = req.body;

    if (!companies || companies.length === 0) {
        return res.status(400).json({ error: 'No hay empresas para escanear' });
    }

    if (scanStatus.isScanning) {
        return res.status(409).json({ error: 'Ya hay un escaneo en progreso' });
    }

    // Usar todas las empresas, sin límite
    // scannedCompanies se llena durante el escaneo, no aquí
    scannedCompanies = []; // Limpiar para nuevo escaneo

    const enabledPortals = portals.filter(p =>
        ['computrabajo', 'elempleo', 'indeed', 'magneto', 'linkedin', 'bumeran', 'trabajando'].includes(p)
    );

    scanStatus = {
        isScanning: true,
        currentCompany: '',
        currentPortal: '',
        progress: 0,
        total: companies.length, // Total es número de empresas, no empresas*portales
        found: 0,
        filtered: 0,
        errors: 0,
        contactsFound: 0,
        startTime: Date.now()
    };
    scanResults = [];
    generatedReports = [];

    // Ejecutar escaneo async
    runScan(companies, enabledPortals, groqApiKey || GROQ_API_KEY, findContacts, rapidApiKey);

    res.json({
        message: `Escaneo iniciado: ${companies.length} empresas en ${enabledPortals.length} portales`,
        status: scanStatus
    });
});

// Detener escaneo
app.post('/api/scan/stop', (req, res) => {
    scanStatus.isScanning = false;
    res.json({ message: 'Escaneo detenido' });
});

// Generar reporte Excel
app.post('/api/report/generate', (req, res) => {
    try {
        const outputPath = path.join(__dirname, 'reports');

        // Crear directorio si no existe
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const report = generateExcelReport(scanResults, scannedCompanies, outputPath);
        const companiesReport = generateCompaniesReport(scannedCompanies, scanResults, outputPath);

        res.json({
            success: true,
            vacanciesReport: report,
            companiesReport: companiesReport,
            message: `Reportes generados exitosamente`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Descargar reporte
app.get('/api/report/download/:filename', (req, res) => {
    const filepath = path.join(__dirname, 'reports', req.params.filename);
    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// =====================================================
// ESCANEO DE NOTICIAS DE NEGOCIOS
// =====================================================
let newsResults = [];

// Endpoint para escanear noticias
app.post('/api/news/scan', async (req, res) => {
    try {
        addLog('📰 Iniciando escaneo de noticias de negocios...', 'info');

        const opportunities = await quickNewsScan();
        newsResults = opportunities;

        addLog(`📰 ${opportunities.length} oportunidades detectadas en noticias`, 'success');

        res.json({
            success: true,
            count: opportunities.length,
            opportunities
        });
    } catch (error) {
        addLog(`❌ Error en escaneo de noticias: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Obtener resultados de noticias
app.get('/api/news/results', (req, res) => {
    res.json(newsResults);
});

// Función principal de escaneo - TODOS LOS PORTALES
async function runScan(companies, portals, groqApiKey, findContacts = true, rapidApiKey = null) {
    activityLogs = [];

    // CONFIGURACIÓN (Optimizada para Scrapers + Sales Nav)
    // RapidAPI descartada por inestabilidad. Usamos scrapers y Sales Nav.
    const CONCURRENT_COMPANIES = 7; // Límite seguro para no tumbar browsers
    const GENERATE_EXCEL_EVERY = 50; // Menos escritura en disco frecuente

    addLog('='.repeat(50), 'info');
    addLog('🚀 ESCANEO COMPLETO - INICIADO (Modo Scrapers + Sales Nav)', 'success');
    addLog(`🎯 FOCO: RedHat, OCI, Quest (Prioridad Alta)`, 'warning');
    addLog(`📊 Empresas: ${companies.length}`, 'info');
    addLog(`📡 Portales: ${portals.join(', ')} (${portals.length})`, 'info');
    addLog(`🚀 Paralelismo: ${CONCURRENT_COMPANIES} simultáneas (Scrapers + AI)`, 'info');
    addLog('='.repeat(50), 'info');

    // TODOS los scrapers
    const scraperMap = {
        'computrabajo': scrapeComputrabajo,
        'elempleo': scrapeElEmpleo,
        'indeed': scrapeIndeed,
        'magneto': scrapeMagneto,
        'linkedin': scrapeLinkedIn,
        'bumeran': scrapeBumeran,
        'trabajando': scrapeTrabajando
    };

    const startTime = Date.now();
    let excelCount = 0;

    // Función para procesar una empresa
    async function processCompanyFast(company, index) {
        if (!scanStatus.isScanning) return [];

        // Protection against crashes: Wrap everything
        try {
            const companyName = typeof company === 'string' ? company : (company.razonSocial || company.name);
            addLog(`[${index + 1}/${companies.length}] 🏢 ${companyName}`, 'info');

            const companyVacancies = [];

            // Buscar en TODOS los portales (Modo Normal)
            // Ejecutamos portales en paralelo para esta empresa si son pocos, o serie si son muchos para no ahogar memoria?
            // Mejor en serie por empresa para no abrir 7 browsers por empresa * 8 empresas = 56 browsers (Crash seguro)
            for (const portalId of portals) {
                if (!scanStatus.isScanning) break;

                const scraper = scraperMap[portalId];
                if (!scraper) continue;

                scanStatus.currentCompany = companyName;
                scanStatus.currentPortal = portalId;

                try {
                    const vacancies = await scraper(companyName);

                    if (vacancies && vacancies.length > 0) {
                        addLog(`   📋 ${vacancies.length} vacantes encontradas en ${portalId}`, 'info');
                        // Usar helper unificado para procesar vacantes (incluye actualización en tiempo real)
                        await processVacancies(vacancies, portalId, company, companyName, companyVacancies, groqApiKey);
                    }
                } catch (error) {
                    // No incrementar error global para no alarmar, solo log interno
                }
            }

            // Si hay vacantes TI, buscar decisores con POTENCIA (Sales Nav + Kaspr)
            if (companyVacancies.length > 0 && findContacts) {
                await processContacts(companyName, companyVacancies, groqApiKey);
            } else if (companyVacancies.length > 0) {
                addLog(`   🔹 Omitiendo búsqueda de decisores (opción desactivada)`, 'text-muted');
                // Si findContacts es false, no buscamos
            }

            // Registrar empresa como escaneada
            scannedCompanies.push({
                name: companyName,
                id: company.id || null, // Fix: handle string or object
                status: companyVacancies.length > 0 ? 'con_vacantes' : 'sin_vacantes',
                vacanciesFound: companyVacancies.length,
                timestamp: new Date().toISOString(),
                index: index + 1
            });

            return companyVacancies;

        } catch (criticalError) {
            console.error(`CRITICAL ERROR processing company ${index}:`, criticalError);
            scanStatus.errors++;
            return [];
        }
    }

    // Helper: Procesar lista de vacantes (Filtro + Clasificación + Update Real-time)
    async function processVacancies(vacancies, sourceName, company, companyName, collection, groqApiKey) {
        if (!vacancies || vacancies.length === 0) return;

        // addLog(`   📋 ${vacancies.length} vacantes analizando...`, 'text-muted');

        for (const vacancy of vacancies) {
            // 1. FILTRO RÁPIDO
            const titleLower = vacancy.title.toLowerCase();
            const ignoreKeywords = ['aseo', 'limpieza', 'vigilante', 'guarda', 'seguridad', 'conductor',
                'chofer', 'vendedor', 'cajero', 'mesero', 'auxiliar de bodega',
                'operario', 'secretaria', 'recepcionista', 'call center',
                'asistente administrativo', 'auxiliar contable', 'mercaderista'];

            if (ignoreKeywords.some(kw => titleLower.includes(kw))) {
                scanStatus.filtered++;
                continue;
            }

            // 2. Clasificación IA
            const classified = await classifyVacancy(vacancy, groqApiKey);
            if (classified === null) {
                scanStatus.filtered++;
                // addLog(`   🚫 Descartada (No TI): ${vacancy.title.substring(0, 40)}...`, 'text-muted');
                continue;
            }

            addLog(`   ✅ OPORTUNIDAD: ${classified.bmindService} - ${vacancy.title.substring(0, 40)}...`, 'success');

            const resultItem = {
                ...classified,
                companyId: company.id || null,
                companyName: companyName,
                source: sourceName === 'Global (API)' ? classified.source || sourceName : sourceName,
                dateDetected: new Date().toISOString()
            };

            collection.push(resultItem);

            // ACTUALIZACIÓN EN TIEMPO REAL GLOBAL
            scanResults.push(resultItem);
            scanStatus.found = scanResults.length;
        }
    }

    // Helper: Buscar contactos
    async function processContacts(companyName, vacancies, groqApiKey) {
        try {
            // addLog(`   🔍 Buscando contactos clave en ${companyName}...`, 'warning');
            const contacts = await findDecisionMaker(companyName, groqApiKey);

            if (contacts && contacts.length > 0) {
                addLog(`   👤 Contacto encontrado: ${contacts[0].name} (${contacts[0].title})`, 'success');
                vacancies.forEach(v => { v.contacts = contacts; });
                scanStatus.contactsFound++;
            } else {
                // addLog(`   ⚠️ No se encontraron contactos`, 'warning');
            }
        } catch (e) {
            console.error(`Error contacts ${companyName}:`, e.message);
        }
    }

    // Procesar en batches paralelos grandes
    for (let i = 0; i < companies.length; i += CONCURRENT_COMPANIES) {
        if (!scanStatus.isScanning) break;

        const batch = companies.slice(i, i + CONCURRENT_COMPANIES);

        // Ejecución protegida de batch
        try {
            const batchPromises = batch.map((company, idx) => processCompanyFast(company, i + idx));
            await Promise.all(batchPromises); // Wait for all in batch
        } catch (batchError) {
            console.error('Error in batch execution:', batchError);
        }

        scanStatus.progress = Math.min(i + CONCURRENT_COMPANIES, companies.length);

        // Log cada 50 empresas
        if ((i + CONCURRENT_COMPANIES) % 50 === 0) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const rate = Math.round((i + CONCURRENT_COMPANIES) / elapsed * 60);
            addLog(`📊 ${i + CONCURRENT_COMPANIES}/${companies.length} | ${scanResults.length} vacantes | ${rate}/min`, 'info');
        }

        // GENERAR EXCEL PARCIAL cada X empresas
        if ((i + CONCURRENT_COMPANIES) % GENERATE_EXCEL_EVERY === 0 && scanResults.length > 0) {
            excelCount++;
            try {
                const outputPath = path.join(__dirname, 'reports');
                if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

                const partialCompanies = companies.slice(0, i + CONCURRENT_COMPANIES);
                generateExcelReport(scanResults, partialCompanies, outputPath);
                addLog(`📋 Excel parcial #${excelCount} generado (${scanResults.length} vacantes)`, 'success');
            } catch (e) {
                console.error('Error generating partial excel:', e);
            }
        }
    }

    scanStatus.isScanning = false;

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ESCANEO COMPLETADO en ${totalTime} minutos`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Empresas escaneadas: ${companies.length}`);
    console.log(`📝 Vacantes TI encontradas: ${scanResults.length}`);
    console.log(`🚫 Vacantes filtradas (no TI): ${scanStatus.filtered}`);
    console.log(`📇 Empresas con contacto decisor: ${scanStatus.contactsFound}`);
    console.log(`❌ Errores: ${scanStatus.errors}`);
    console.log(`${'='.repeat(60)}\n`);

    // Generar reporte automáticamente al finalizar
    if (scanResults.length > 0) {
        try {
            const outputPath = path.join(__dirname, 'reports');
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }
            const report = generateExcelReport(scanResults, companies, outputPath);
            console.log(`📁 Reporte Excel generado automáticamente: ${report.filename}`);
        } catch (error) {
            console.error('Error generando reporte:', error.message);
        }
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0',
        portals: ['computrabajo', 'elempleo', 'indeed', 'magneto', 'linkedin', 'bumeran', 'trabajando'],
        features: {
            itFiltering: true,
            decisionMakerSearch: true,
            aiValidation: true,
            excelExport: true,
            noCompanyLimit: true
        },
        scanning: scanStatus.isScanning
    });
});

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 LEAD INTELLIGENCE BACKEND v2.0`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📡 Servidor: http://localhost:${PORT}`);
    console.log(`\n📋 PORTALES DISPONIBLES (7):`);
    console.log(`   ✅ Computrabajo`);
    console.log(`   ✅ El Empleo`);
    console.log(`   ✅ Indeed Colombia`);
    console.log(`   ✅ Magneto`);
    console.log(`   ✅ LinkedIn (via Google)`);
    console.log(`   ✅ Bumeran`);
    console.log(`   ✅ Trabajando.com`);
    console.log(`\n🎯 CARACTERÍSTICAS:`);
    console.log(`   ✅ Filtrado solo vacantes TI`);
    console.log(`   ✅ Sin límite de empresas`);
    console.log(`   ✅ Búsqueda de decisores TI (CTO, Gerente TI)`);
    console.log(`   ✅ Validación con Groq AI`);
    console.log(`   ✅ Exportación a Excel automática`);
    console.log(`\n🔧 ENDPOINTS:`);
    console.log(`   GET  /api/status         - Estado del escaneo`);
    console.log(`   GET  /api/results        - Vacantes encontradas`);
    console.log(`   POST /api/scan           - Iniciar escaneo`);
    console.log(`   POST /api/scan/stop      - Detener escaneo`);
    console.log(`   POST /api/report/generate - Generar reporte Excel`);
    console.log(`${'='.repeat(60)}\n`);
});
