import puppeteer from 'puppeteer';

/**
 * Scraper para Computrabajo Colombia
 * Busca ofertas de empleo de una empresa específica
 */
export async function scrapeComputrabajo(companyName, onLog = () => { }) {
    let browser;

    try {
        // Limpiar nombre de empresa para búsqueda
        const searchQuery = encodeURIComponent(companyName.replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?|& CIA|Y CIA/gi, '').trim());
        const url = `https://www.computrabajo.com.co/trabajo-de-${searchQuery}`;

        onLog(`URL: ${url}`);

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Optimizar carga
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const pageTitle = await page.title();
        onLog(`Título de página: "${pageTitle}"`); // Clave para detectar bloqueos (ej: "Access Denied" o "Captcha")

        if (pageTitle.includes('403') || pageTitle.includes('Denied') || pageTitle.includes('Bot')) {
            onLog('⚠️ BLOQUEO DETECTADO: La página rechazó la conexión.');
            return [];
        }

        // Extraer ofertas de empleo
        const vacancies = await page.evaluate(() => {
            const results = [];
            const jobCards = document.querySelectorAll('.box_offer, .bRS, article.box_offer');
            return {
                count: jobCards.length,
                data: Array.from(jobCards).slice(0, 10).map(card => {
                    const titleEl = card.querySelector('a.js-o-link, h2 a, .title_offer a');
                    const companyEl = card.querySelector('.fs16, .it-ft, .pr5');
                    return {
                        title: titleEl?.textContent?.trim() || '',
                        company: companyEl?.textContent?.trim() || '',
                        url: titleEl?.href || ''
                    };
                })
            };
        });

        onLog(`Elementos encontrados en DOM: ${vacancies.count}`);

        if (vacancies.count === 0) {
            onLog('DOM vacío. Posible cambio de selectores o cero resultados reales.');
            return [];
        }

        // Filter valid data
        const cleanVacancies = vacancies.data.filter(v => v.title).map(v => ({
            ...v, source: 'computrabajo', location: 'Colombia'
        }));

        return cleanVacancies;

    } catch (error) {
        onLog(`Error crítico: ${error.message}`);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Búsqueda alternativa por nombre directo de empresa
 */
export async function searchComputrabajoByCompany(companyName) {
    let browser;

    try {
        const searchQuery = encodeURIComponent(companyName);
        const url = `https://www.computrabajo.com.co/empresas/search/?q=${searchQuery}`;

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Buscar link a la página de la empresa
        const companyLink = await page.evaluate(() => {
            const link = document.querySelector('.bRS a, .company-link');
            return link?.href || null;
        });

        if (companyLink) {
            await page.goto(companyLink + '/empleos', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 2000));

            const vacancies = await page.evaluate(() => {
                const results = [];
                const jobCards = document.querySelectorAll('.box_offer, article');

                jobCards.forEach((card, idx) => {
                    if (idx >= 10) return;
                    const titleEl = card.querySelector('a.js-o-link, h2 a');
                    const title = titleEl?.textContent?.trim();
                    const link = titleEl?.href;

                    if (title) {
                        results.push({ title, url: link, source: 'computrabajo' });
                    }
                });

                return results;
            });

            return vacancies;
        }

        return [];

    } catch (error) {
        console.error(`[Computrabajo Company Search] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
