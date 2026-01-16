import puppeteer from 'puppeteer';

/**
 * Scraper para Magneto Empleos Colombia
 * https://www.magneto365.com/
 */
export async function scrapeMagneto(companyName) {
    let browser;

    try {
        const searchQuery = encodeURIComponent(companyName.replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?/gi, '').trim());
        const url = `https://www.magneto365.com/co/empleos?search=${searchQuery}`;

        console.log(`[Magneto] Buscando: ${companyName}`);

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

            const jobCards = document.querySelectorAll('[class*="job-card"], [class*="JobCard"], .offer-card, article');

            jobCards.forEach((card, index) => {
                if (index >= 10) return;

                try {
                    const titleEl = card.querySelector('h2 a, h3 a, [class*="title"] a, a[class*="job"]');
                    const companyEl = card.querySelector('[class*="company"], [class*="employer"]');
                    const locationEl = card.querySelector('[class*="location"], [class*="city"]');

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
                            source: 'magneto'
                        });
                    }
                } catch (e) { }
            });

            return results;
        }, companyName);

        console.log(`[Magneto] Encontradas ${vacancies.length} vacantes para ${companyName}`);
        return vacancies;

    } catch (error) {
        console.error(`[Magneto] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
