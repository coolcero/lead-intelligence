import puppeteer from 'puppeteer';

/**
 * Scraper para LinkedIn Jobs (búsqueda pública, sin API)
 * Usa Google para buscar ofertas de LinkedIn (evita bloqueos)
 */
export async function scrapeLinkedIn(companyName) {
    let browser;

    try {
        const searchQuery = encodeURIComponent(`site:linkedin.com/jobs "${companyName}" Colombia`);
        const url = `https://www.google.com/search?q=${searchQuery}`;

        console.log(`[LinkedIn] Buscando via Google: ${companyName}`);

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const vacancies = await page.evaluate((company) => {
            const results = [];

            const searchResults = document.querySelectorAll('.g');

            searchResults.forEach((result, index) => {
                if (index >= 10) return;

                try {
                    const linkEl = result.querySelector('a');
                    const titleEl = result.querySelector('h3');
                    const snippetEl = result.querySelector('.VwiC3b');

                    const link = linkEl?.href || '';
                    const title = titleEl?.textContent?.trim() || '';
                    const snippet = snippetEl?.textContent?.trim() || '';

                    if (link.includes('linkedin.com/jobs') && title) {
                        let jobTitle = title
                            .replace(/ - LinkedIn$/, '')
                            .replace(/ \| LinkedIn$/, '')
                            .replace(/ en .*$/, '')
                            .trim();

                        results.push({
                            title: jobTitle,
                            company: company,
                            location: 'Colombia',
                            url: link,
                            source: 'linkedin',
                            description: snippet
                        });
                    }
                } catch (e) { }
            });

            return results;
        }, companyName);

        console.log(`[LinkedIn] Encontradas ${vacancies.length} vacantes para ${companyName}`);
        return vacancies;

    } catch (error) {
        console.error(`[LinkedIn] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
