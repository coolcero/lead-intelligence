/**
 * Servicio de Escaneo de Noticias de Negocios
 * Detecta oportunidades en empresas privadas antes de que publiquen vacantes
 * Fuentes: Google News, Portafolio, La República, etc.
 */

import puppeteer from 'puppeteer';

// Keywords para detectar oportunidades
const OPPORTUNITY_KEYWORDS = [
    // Oracle
    'oracle colombia', 'oracle cloud colombia', 'migración oracle',
    'proyecto oracle', 'contrato oracle', 'implementación oracle',

    // Red Hat
    'red hat colombia', 'openshift colombia', 'ansible colombia',
    'linux enterprise', 'proyecto red hat',

    // Quest
    'quest software', 'toad oracle', 'shareplex',

    // Migraciones
    'transformación digital colombia', 'migración cloud',
    'modernización tecnológica', 'migración nube',
    'proyecto tecnológico colombia', 'digitalización empresa',

    // General TI
    'inversión tecnología colombia', 'data center colombia',
    'centro de datos', 'infraestructura cloud'
];

// Servicios Bmind relacionados
const KEYWORD_TO_SERVICE = {
    'oracle': 'Servicios Gestionados Oracle',
    'red hat': 'Servicios Red Hat',
    'openshift': 'Servicios Red Hat (OpenShift)',
    'ansible': 'Servicios Red Hat (Ansible)',
    'migración': 'Consultoría Migración Cloud',
    'transformación digital': 'Consultoría Migración Cloud',
    'cloud': 'Servicios Cloud',
    'linux': 'Servicios Linux/Red Hat',
    'quest': 'Servicios Quest Software'
};

/**
 * Buscar noticias en Google News
 */
async function searchGoogleNews(keyword) {
    let browser;
    const results = [];

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Buscar en Google News
        const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(keyword)}&hl=es-419&gl=CO&ceid=CO:es-419`;

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Extraer noticias
        const news = await page.evaluate(() => {
            const articles = [];
            const items = document.querySelectorAll('article');

            items.forEach((item, index) => {
                if (index >= 10) return; // Límite 10 por keyword

                const titleEl = item.querySelector('h3, h4, a[href*="/articles/"]');
                const sourceEl = item.querySelector('a[data-n-tid], div[data-n-tid]');
                const timeEl = item.querySelector('time, span[class*="time"]');
                const linkEl = item.querySelector('a[href*="/articles/"]');

                if (titleEl) {
                    articles.push({
                        title: titleEl.textContent?.trim() || '',
                        source: sourceEl?.textContent?.trim() || 'Google News',
                        time: timeEl?.textContent?.trim() || '',
                        url: linkEl?.href || ''
                    });
                }
            });

            return articles;
        });

        results.push(...news);

    } catch (error) {
        console.error(`[NewsScanner] Error buscando "${keyword}":`, error.message);
    } finally {
        if (browser) await browser.close();
    }

    return results;
}

/**
 * Extraer empresa mencionada en el titular
 */
function extractCompanyFromTitle(title) {
    // Patrones comunes
    const patterns = [
        /^(.+?)\s+(anuncia|firma|implementa|contrata|invierte|lanza|adquiere)/i,
        /^(.+?)\s+(cierra|logra|completa|inicia)/i,
        /(banco|grupo|empresa|compañía)\s+([A-Z][a-zá-ú]+(\s+[A-Z][a-zá-ú]+)*)/i
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            return match[1] || match[2];
        }
    }

    return null;
}

/**
 * Detectar servicio Bmind relacionado
 */
function detectBmindService(title) {
    const titleLower = title.toLowerCase();

    for (const [keyword, service] of Object.entries(KEYWORD_TO_SERVICE)) {
        if (titleLower.includes(keyword)) {
            return { keyword, service };
        }
    }

    return { keyword: 'tecnología', service: 'Servicios TI' };
}

/**
 * Escanear todas las noticias relevantes
 */
export async function scanBusinessNews() {
    console.log('\n📰 [NewsScanner] Iniciando escaneo de noticias de negocios...');

    const allOpportunities = [];
    const seenTitles = new Set();

    for (const keyword of OPPORTUNITY_KEYWORDS) {
        console.log(`   🔍 Buscando: "${keyword}"`);

        const news = await searchGoogleNews(keyword);

        for (const article of news) {
            // Evitar duplicados
            if (seenTitles.has(article.title)) continue;
            seenTitles.add(article.title);

            const company = extractCompanyFromTitle(article.title);
            const { keyword: matchedKeyword, service } = detectBmindService(article.title);

            allOpportunities.push({
                type: 'news_opportunity',
                title: article.title,
                source: article.source,
                time: article.time,
                url: article.url,
                company: company,
                matchedKeyword: matchedKeyword,
                bmindService: service,
                searchKeyword: keyword,
                dateDetected: new Date().toISOString()
            });
        }

        // Delay entre búsquedas
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`📰 [NewsScanner] ${allOpportunities.length} oportunidades detectadas en noticias`);

    return allOpportunities;
}

/**
 * Escaneo rápido con keywords principales
 */
export async function quickNewsScan() {
    const mainKeywords = [
        'oracle colombia proyecto',
        'red hat colombia',
        'transformación digital colombia',
        'migración cloud colombia empresa'
    ];

    const opportunities = [];

    for (const keyword of mainKeywords) {
        const news = await searchGoogleNews(keyword);
        opportunities.push(...news.map(n => ({
            ...n,
            bmindService: detectBmindService(n.title).service,
            company: extractCompanyFromTitle(n.title)
        })));
        await new Promise(r => setTimeout(r, 1500));
    }

    return opportunities;
}

export default { scanBusinessNews, quickNewsScan, OPPORTUNITY_KEYWORDS };
