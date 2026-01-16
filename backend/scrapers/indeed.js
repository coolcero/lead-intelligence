import puppeteer from 'puppeteer';

/**
 * Scraper para Indeed Colombia
 */
export async function scrapeIndeed(companyName) {
    let browser;

    try {
        const searchQuery = encodeURIComponent(companyName.replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?/gi, '').trim());
        const url = `https://co.indeed.com/jobs?q=${searchQuery}&l=Colombia`;

        console.log(`[Indeed] Buscando: ${companyName}`);

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

            // Selectores de Indeed
            const jobCards = document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultsList > li, [class*="resultContent"]');

            jobCards.forEach((card, index) => {
                if (index >= 10) return;

                try {
                    const titleEl = card.querySelector('h2.jobTitle a, a[data-jk], .jobTitle span');
                    const companyEl = card.querySelector('[data-testid="company-name"], .companyName, .company');
                    const locationEl = card.querySelector('[data-testid="text-location"], .companyLocation');

                    const title = titleEl?.textContent?.trim() || '';
                    const companyFound = companyEl?.textContent?.trim() || '';
                    const location = locationEl?.textContent?.trim() || '';
                    const link = titleEl?.href || (titleEl?.closest('a')?.href) || '';

                    const companyLower = company.toLowerCase();
                    const foundLower = companyFound.toLowerCase();

                    if (title && (foundLower.includes(companyLower.split(' ')[0]) || companyLower.includes(foundLower.split(' ')[0]))) {
                        results.push({
                            title,
                            company: companyFound,
                            location,
                            url: link.startsWith('http') ? link : `https://co.indeed.com${link}`,
                            source: 'indeed'
                        });
                    }
                } catch (e) { }
            });

            return results;
        }, companyName);

        console.log(`[Indeed] Encontradas ${vacancies.length} vacantes para ${companyName}`);
        return vacancies;

    } catch (error) {
        console.error(`[Indeed] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
