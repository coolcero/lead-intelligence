import puppeteer from 'puppeteer';

/**
 * Servicio de Enriquecimiento de Datos
 * Busca en múltiples fuentes públicas para obtener emails, teléfonos y más info
 * Similar a Kaspr, Lusha, Apollo
 */

/**
 * FUENTES DE DATOS:
 * 1. Hunter.io - Emails corporativos
 * 2. RUES Colombia - Registro mercantil
 * 3. Google Search - Emails y teléfonos públicos
 * 4. Páginas corporativas - Scraping de contacto
 * 5. Directorios empresariales
 */

/**
 * Enriquecer datos de contacto buscando en múltiples fuentes
 */
export async function enrichContactData(companyName, contactName = null) {
    console.log(`\n📊 [DataEnrich] Enriqueciendo datos de: ${companyName}`);

    const enrichedData = {
        company: companyName,
        emails: [],
        phones: [],
        websites: [],
        socialMedia: [],
        address: null,
        nit: null,
        employees: null,
        sources: []
    };

    try {
        // 1. Buscar emails con Hunter.io pattern
        const emails = await searchCorporateEmails(companyName, contactName);
        enrichedData.emails.push(...emails);
        if (emails.length > 0) enrichedData.sources.push('email_patterns');

        // 2. Buscar en RUES Colombia (Registro empresarial)
        const ruesData = await searchRUES(companyName);
        if (ruesData) {
            enrichedData.nit = ruesData.nit;
            enrichedData.address = ruesData.address;
            if (ruesData.phone) enrichedData.phones.push(ruesData.phone);
            enrichedData.sources.push('rues_colombia');
        }

        // 3. Buscar en Google contacto corporativo
        const googleData = await searchGoogleContactInfo(companyName);
        enrichedData.emails.push(...googleData.emails.filter(e => !enrichedData.emails.includes(e)));
        enrichedData.phones.push(...googleData.phones.filter(p => !enrichedData.phones.includes(p)));
        enrichedData.websites.push(...googleData.websites);
        if (googleData.emails.length > 0 || googleData.phones.length > 0) {
            enrichedData.sources.push('google_search');
        }

        // 4. Buscar página web corporativa
        if (enrichedData.websites.length > 0) {
            const websiteData = await scrapeCompanyWebsite(enrichedData.websites[0]);
            if (websiteData) {
                enrichedData.emails.push(...websiteData.emails.filter(e => !enrichedData.emails.includes(e)));
                enrichedData.phones.push(...websiteData.phones.filter(p => !enrichedData.phones.includes(p)));
                enrichedData.sources.push('company_website');
            }
        }

        // 5. Buscar en directorio de empresas Colombia
        const directoryData = await searchBusinessDirectory(companyName);
        if (directoryData) {
            enrichedData.employees = directoryData.employees;
            if (directoryData.phone) enrichedData.phones.push(directoryData.phone);
            enrichedData.sources.push('business_directory');
        }

        // Eliminar duplicados
        enrichedData.emails = [...new Set(enrichedData.emails)];
        enrichedData.phones = [...new Set(enrichedData.phones)];

        console.log(`   ✅ Emails: ${enrichedData.emails.length} | Teléfonos: ${enrichedData.phones.length}`);
        console.log(`   📁 Fuentes: ${enrichedData.sources.join(', ')}`);

        return enrichedData;

    } catch (error) {
        console.error(`[DataEnrich] Error:`, error.message);
        return enrichedData;
    }
}

/**
 * Buscar emails corporativos usando patrones comunes
 */
async function searchCorporateEmails(companyName, contactName = null) {
    let browser;
    const emails = [];

    try {
        // Limpiar nombre de empresa para dominio
        const cleanName = companyName
            .replace(/S\.A\.S\.?|LTDA\.?|S\.A\.?|SAS|CIA\.?/gi, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .toLowerCase()
            .split(' ')[0];

        // Buscar dominio en Google
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Buscar email de la empresa
        const searchQuery = `"${companyName}" Colombia email @`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(r => setTimeout(r, 2000));

        const foundEmails = await page.evaluate(() => {
            const text = document.body.innerText;
            const emailRegex = /[\w.\-+]+@[\w.-]+\.[a-zA-Z]{2,}/g;
            return [...new Set(text.match(emailRegex) || [])];
        });

        // Filtrar emails genéricos
        const validEmails = foundEmails.filter(email => {
            const domain = email.split('@')[1]?.toLowerCase();
            // Excluir emails genéricos
            const genericDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
            return domain && !genericDomains.includes(domain);
        });

        emails.push(...validEmails.slice(0, 5));

        // Si tenemos nombre de contacto, generar patrones de email
        if (contactName && validEmails.length > 0) {
            const domain = validEmails[0].split('@')[1];
            const [firstName, lastName] = contactName.toLowerCase().split(' ');
            if (firstName && lastName && domain) {
                // Patrones comunes de emails
                const patterns = [
                    `${firstName}.${lastName}@${domain}`,
                    `${firstName}${lastName}@${domain}`,
                    `${firstName[0]}${lastName}@${domain}`,
                    `${firstName}@${domain}`
                ];
                emails.push(...patterns);
            }
        }

        return emails;

    } catch (error) {
        console.error(`[EmailSearch] Error:`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Buscar en RUES Colombia (Registro Único Empresarial)
 */
async function searchRUES(companyName) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Buscar via Google (RUES requiere captcha directo)
        const searchQuery = `site:rfrues.org.co OR site:rfrues.gov.co "${companyName}"`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(r => setTimeout(r, 2000));

        const data = await page.evaluate((company) => {
            const text = document.body.innerText;

            // Buscar NIT
            const nitMatch = text.match(/NIT[:\s]*(\d{9,10}[-\s]?\d?)/i);

            // Buscar dirección
            const addressMatch = text.match(/(Calle|Carrera|Avenida|Cra|Cl|Av)[^,\n]{10,50}/i);

            // Buscar teléfono
            const phoneMatch = text.match(/(\+57|57)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);

            return {
                nit: nitMatch ? nitMatch[1] : null,
                address: addressMatch ? addressMatch[0] : null,
                phone: phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, '') : null
            };
        }, companyName);

        return data.nit ? data : null;

    } catch (error) {
        console.error(`[RUES] Error:`, error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Buscar información de contacto en Google
 */
async function searchGoogleContactInfo(companyName) {
    let browser;
    const result = { emails: [], phones: [], websites: [] };

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        const searchQuery = `"${companyName}" Colombia contacto teléfono email`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(r => setTimeout(r, 2000));

        const data = await page.evaluate(() => {
            const text = document.body.innerText;

            // Emails
            const emailRegex = /[\w.\-+]+@[\w.-]+\.[a-zA-Z]{2,}/g;
            const emails = [...new Set(text.match(emailRegex) || [])];

            // Teléfonos colombianos
            const phoneRegex = /(\+57|57)?[\s.-]?\(?\d{1,3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
            const phones = [...new Set((text.match(phoneRegex) || []).map(p => p.replace(/[^\d+]/g, '')))];

            // Websites
            const links = Array.from(document.querySelectorAll('a[href]'));
            const websites = links
                .map(a => a.href)
                .filter(href => href && !href.includes('google') && !href.includes('facebook'))
                .slice(0, 3);

            return { emails: emails.slice(0, 5), phones: phones.slice(0, 3), websites };
        });

        // Filtrar emails genéricos
        result.emails = data.emails.filter(e =>
            !['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'].some(d => e.includes(d))
        );
        result.phones = data.phones.filter(p => p.length >= 10);
        result.websites = data.websites;

        return result;

    } catch (error) {
        console.error(`[GoogleSearch] Error:`, error.message);
        return result;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Scraping de página web corporativa
 */
async function scrapeCompanyWebsite(websiteUrl) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        // Intentar ir a página de contacto
        const contactLink = await page.$('a[href*="contact"], a[href*="contacto"], a:contains("Contacto")');
        if (contactLink) {
            await contactLink.click();
            await new Promise(r => setTimeout(r, 2000));
        }

        const data = await page.evaluate(() => {
            const text = document.body.innerText;

            const emailRegex = /[\w.\-+]+@[\w.-]+\.[a-zA-Z]{2,}/g;
            const phoneRegex = /(\+57|57)?[\s.-]?\(?\d{1,3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

            return {
                emails: [...new Set(text.match(emailRegex) || [])].slice(0, 5),
                phones: [...new Set((text.match(phoneRegex) || []).map(p => p.replace(/[^\d+]/g, '')))].slice(0, 3)
            };
        });

        return data;

    } catch (error) {
        console.error(`[WebsiteScrape] Error:`, error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Buscar en directorio de empresas
 */
async function searchBusinessDirectory(companyName) {
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Buscar en directorios públicos
        const searchQuery = `"${companyName}" Colombia empleados directorio empresarial`;
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        await new Promise(r => setTimeout(r, 2000));

        const data = await page.evaluate(() => {
            const text = document.body.innerText;

            // Buscar cantidad de empleados
            const employeesMatch = text.match(/(\d{1,5})\s*empleados/i);

            // Teléfono
            const phoneMatch = text.match(/(\+57|57)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);

            return {
                employees: employeesMatch ? parseInt(employeesMatch[1]) : null,
                phone: phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, '') : null
            };
        });

        return data.employees ? data : null;

    } catch (error) {
        console.error(`[Directory] Error:`, error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Generar patrones de email para un contacto
 */
export function generateEmailPatterns(firstName, lastName, domain) {
    if (!firstName || !domain) return [];

    const f = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const l = lastName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

    return [
        `${f}.${l}@${domain}`,
        `${f}${l}@${domain}`,
        `${f[0]}${l}@${domain}`,
        `${f}@${domain}`,
        `${f}_${l}@${domain}`,
        `${f}${l[0] || ''}@${domain}`
    ].filter(e => e.length > 5);
}

export default { enrichContactData, generateEmailPatterns };
