import puppeteer from 'puppeteer';

/**
 * Servicio de LinkedIn Sales Navigator
 * Usa cookie de sesión para buscar decisores TI con información completa
 */

// Cookie de sesión de LinkedIn (Enterprise)
const LINKEDIN_COOKIE = 'AQEFARABAAAAABr3C50AAAGbvlnWTAAAAZviZw8DTgAAs3VybjpsaTplbnRlcnByaXNlQXV0aFRva2VuOmVKeGpaQUFDdHFsMlYwQTBsOXZQYnlDYVBkSkxoUkhFc09pNi93dk1FTXVJdk1mQUNBQzlHd2tQXnVybjpsaTplbnRlcnByaXNlUHJvZmlsZToodXJuOmxpOmVudGVycHJpc2VBY2NvdW50OjExMDQ0NDI0NCwxNzI0MjM2NzApXnVybjpsaTptZW1iZXI6Nzg3MjE1MTY5AtCxDDDpK_MM-HGTD8wfwesu9IRHehRHwDxAQIpNPgUy8oCWMfnwkIjwW1VveFP4mCpGTxvGyNpoxn8Rbwavc7gKeG_ywjb9a4PKMbQQaC0Ju4ZmIqVCh2tycOz7A323aJ_yemtKbEQYz-h55xkOJBV9S0HmArFqcI5sYvovpUsafGG76cke_jCSD_1nfCP0D7zNJQ';

// Títulos de decisores TI (prioridad)
const DECISION_MAKER_TITLES = [
    'CTO', 'Chief Technology Officer',
    'CIO', 'Chief Information Officer',
    'VP Technology', 'VP Engineering', 'VP IT',
    'Director de Tecnología', 'Director de TI', 'Director IT',
    'Director de Sistemas', 'Director de Informática',
    'Gerente de Tecnología', 'Gerente de TI', 'Gerente IT',
    'Gerente de Sistemas', 'Gerente de Informática',
    'IT Manager', 'Technology Manager',
    'Líder de Tecnología', 'Líder de TI',
    'Jefe de Sistemas', 'Jefe de TI',
    'Head of IT', 'Head of Technology'
];

/**
 * Buscar decisores TI en Sales Navigator
 */
export async function searchSalesNavigator(companyName) {
    let browser;
    const contacts = [];

    try {
        console.log(`[SalesNav] 🔍 Buscando decisores TI en: ${companyName}`);

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Configurar cookie de LinkedIn
        await page.setCookie({
            name: 'li_at',
            value: LINKEDIN_COOKIE,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Buscar en Sales Navigator
        const searchUrl = buildSearchUrl(companyName);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        // Extraer resultados
        const results = await page.evaluate((targetTitles) => {
            const found = [];

            // Selectores de Sales Navigator
            const profileCards = document.querySelectorAll('[data-x-search-result], .search-results__result-item, .artdeco-list__item');

            profileCards.forEach((card, index) => {
                if (index >= 10) return;

                try {
                    // Nombre
                    const nameEl = card.querySelector('[data-anonymize="person-name"], .result-lockup__name, .artdeco-entity-lockup__title');
                    const name = nameEl?.textContent?.trim();

                    // Título/Cargo
                    const titleEl = card.querySelector('[data-anonymize="title"], .result-lockup__highlight-keyword, .artdeco-entity-lockup__subtitle');
                    const title = titleEl?.textContent?.trim();

                    // Empresa
                    const companyEl = card.querySelector('[data-anonymize="company-name"], .result-lockup__position-company');
                    const company = companyEl?.textContent?.trim();

                    // URL del perfil
                    const linkEl = card.querySelector('a[href*="/sales/lead/"], a[href*="/in/"]');
                    const profileUrl = linkEl?.href;

                    // Location
                    const locationEl = card.querySelector('[data-anonymize="location"], .result-lockup__misc-item');
                    const location = locationEl?.textContent?.trim();

                    if (name && title) {
                        // Verificar si es decisor TI
                        const titleLower = title.toLowerCase();
                        const isDecisionMaker = targetTitles.some(t =>
                            titleLower.includes(t.toLowerCase())
                        );

                        found.push({
                            name,
                            title,
                            company,
                            location,
                            profileUrl,
                            isDecisionMaker,
                            source: 'sales_navigator'
                        });
                    }
                } catch (e) { }
            });

            return found;
        }, DECISION_MAKER_TITLES);

        // Filtrar solo decisores y agregar a contactos
        const decisionMakers = results.filter(r => r.isDecisionMaker);

        if (decisionMakers.length > 0) {
            console.log(`[SalesNav] ✅ Encontrados ${decisionMakers.length} decisores TI`);

            for (const dm of decisionMakers.slice(0, 3)) { // Max 3 por empresa
                contacts.push({
                    type: 'linkedin_sales_navigator',
                    name: dm.name,
                    title: dm.title,
                    company: dm.company,
                    location: dm.location,
                    url: dm.profileUrl,
                    confidence: 'alto',
                    source: 'sales_navigator',
                    valueReason: `${dm.title} - Decisor TI en ${dm.company}`
                });

                console.log(`   👤 ${dm.name} - ${dm.title}`);
            }
        } else if (results.length > 0) {
            // Si no hay decisores, tomar el más relevante
            console.log(`[SalesNav] 📋 ${results.length} contactos encontrados (sin decisores TI directos)`);
            const best = results[0];
            contacts.push({
                type: 'linkedin_sales_navigator',
                name: best.name,
                title: best.title,
                company: best.company,
                location: best.location,
                url: best.profileUrl,
                confidence: 'medio',
                source: 'sales_navigator'
            });
        } else {
            console.log(`[SalesNav] 📭 Sin resultados para ${companyName}`);
        }

        return contacts;

    } catch (error) {
        console.error(`[SalesNav] ❌ Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Construir URL de búsqueda de Sales Navigator
 */
function buildSearchUrl(companyName) {
    // Limpiar nombre de empresa
    const cleanName = companyName
        .replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?|SAS|CIA\.?/gi, '')
        .trim();

    // Búsqueda en Sales Navigator con filtros de cargo TI
    const params = new URLSearchParams({
        keywords: cleanName,
        titleFreeText: 'CTO OR Director TI OR Gerente TI OR IT Manager OR Jefe Sistemas',
        geoIncluded: 'Colombia'
    });

    return `https://www.linkedin.com/sales/search/people?${params.toString()}`;
}

/**
 * Obtener información detallada de un perfil
 */
export async function getProfileDetails(profileUrl) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setCookie({
            name: 'li_at',
            value: LINKEDIN_COOKIE,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const details = await page.evaluate(() => {
            return {
                name: document.querySelector('[data-anonymize="person-name"]')?.textContent?.trim(),
                title: document.querySelector('[data-anonymize="title"]')?.textContent?.trim(),
                company: document.querySelector('[data-anonymize="company-name"]')?.textContent?.trim(),
                location: document.querySelector('[data-anonymize="location"]')?.textContent?.trim(),
                email: document.querySelector('[data-anonymize="email"]')?.textContent?.trim(),
                phone: document.querySelector('[data-anonymize="phone"]')?.textContent?.trim(),
                about: document.querySelector('.profile-summary')?.textContent?.trim()?.substring(0, 500)
            };
        });

        return details;

    } catch (error) {
        console.error(`[SalesNav] Error obteniendo perfil:`, error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

export default { searchSalesNavigator, getProfileDetails, LINKEDIN_COOKIE };
