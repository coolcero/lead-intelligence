import puppeteer from 'puppeteer';

/**
 * Scraper para El Empleo Colombia
 */
export async function scrapeElEmpleo(companyName) {
    let browser;

    try {
        const searchQuery = encodeURIComponent(companyName.replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?/gi, '').trim());
        const url = `https://www.elempleo.com/co/ofertas-empleo/?busqueda=${searchQuery}`;

        console.log(`[ElEmpleo] Buscando: ${companyName}`);

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        const vacancies = await page.evaluate((company) => {
            const results = [];

            // Selectores de El Empleo
            const jobCards = document.querySelectorAll('.job-item, .result-item, .offer-item, [class*="JobCard"]');

            jobCards.forEach((card, index) => {
                if (index >= 10) return;

                try {
                    const titleEl = card.querySelector('h2 a, .job-title a, a[class*="title"]');
                    const companyEl = card.querySelector('.company-name, [class*="company"]');
                    const locationEl = card.querySelector('.location, [class*="location"]');

                    const title = titleEl?.textContent?.trim() || '';
                    const companyFound = companyEl?.textContent?.trim() || '';
                    const location = locationEl?.textContent?.trim() || '';
                    const link = titleEl?.href || '';

                    const companyLower = company.toLowerCase();
                    const foundLower = companyFound.toLowerCase();

                    if (title && (foundLower.includes(companyLower.split(' ')[0]) || companyLower.includes(foundLower.split(' ')[0]))) {
                        results.push({
                            title,
                            company: companyFound,
                            location,
                            url: link,
                            source: 'elempleo'
                        });
                    }
                } catch (e) { }
            });

            return results;
        }, companyName);

        console.log(`[ElEmpleo] Encontradas ${vacancies.length} vacantes para ${companyName}`);
        return vacancies;

    } catch (error) {
        console.error(`[ElEmpleo] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
