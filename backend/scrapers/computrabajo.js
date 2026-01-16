import puppeteer from 'puppeteer';

/**
 * Scraper para Computrabajo Colombia
 * Busca ofertas de empleo de una empresa específica
 */
export async function scrapeComputrabajo(companyName) {
    let browser;

    try {
        // Limpiar nombre de empresa para búsqueda
        const searchQuery = encodeURIComponent(companyName.replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?|& CIA|Y CIA/gi, '').trim());
        const url = `https://www.computrabajo.com.co/trabajo-de-${searchQuery}`;

        console.log(`[Computrabajo] Buscando: ${companyName}`);
        console.log(`[Computrabajo] URL: ${url}`);

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process', // Ahorra memoria en entornos limitados
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();

        // Simular navegador real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        // Optimizar carga: Bloquear recursos innecesarios
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Navegar con timeout
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Esperar un poco para que cargue el contenido
        await new Promise(r => setTimeout(r, 2000));

        // Extraer ofertas de empleo
        const vacancies = await page.evaluate((company) => {
            const results = [];

            // Selectores de Computrabajo
            const jobCards = document.querySelectorAll('.box_offer, .bRS, article.box_offer');

            jobCards.forEach((card, index) => {
                if (index >= 10) return; // Limitar a 10 resultados

                try {
                    const titleEl = card.querySelector('a.js-o-link, h2 a, .title_offer a');
                    const companyEl = card.querySelector('.fs16, .it-ft, .pr5');
                    const locationEl = card.querySelector('.fs13, .mr10');
                    const dateEl = card.querySelector('.fs12, .fwB');

                    const title = titleEl?.textContent?.trim() || '';
                    const companyFound = companyEl?.textContent?.trim() || '';
                    const location = locationEl?.textContent?.trim() || '';
                    const link = titleEl?.href || '';

                    // Verificar si es de la empresa buscada (fuzzy match)
                    const companyLower = company.toLowerCase();
                    const foundLower = companyFound.toLowerCase();

                    if (title && (foundLower.includes(companyLower.split(' ')[0]) || companyLower.includes(foundLower.split(' ')[0]))) {
                        results.push({
                            title,
                            company: companyFound,
                            location,
                            url: link,
                            source: 'computrabajo'
                        });
                    }
                } catch (e) {
                    console.error('Error parsing job card:', e);
                }
            });

            return results;
        }, companyName);

        console.log(`[Computrabajo] Encontradas ${vacancies.length} vacantes para ${companyName}`);
        return vacancies;

    } catch (error) {
        console.error(`[Computrabajo] Error:`, error.message);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
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
