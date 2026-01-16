/**
 * Servicio de Hunter.io
 * API para encontrar emails corporativos REALES
 */

// API Key de Hunter.io (Plan gratuito - 25 búsquedas/mes)
const HUNTER_API_KEY = 'eb2c8a370d5cffe62caabc7e30fc13c2855ed7a2';

/**
 * Buscar emails de una empresa usando Hunter.io
 * @param {string} domain - Dominio de la empresa (ej: bmind.com.co)
 * @returns {Promise<Object>} - Emails encontrados
 */
export async function searchEmailsByDomain(domain) {
    try {
        console.log(`[Hunter.io] 🔍 Buscando emails en: ${domain}`);

        const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.errors) {
            console.error(`[Hunter.io] ❌ Error:`, data.errors);
            return { emails: [], patterns: null };
        }

        const result = {
            domain: data.data?.domain,
            organization: data.data?.organization,
            pattern: data.data?.pattern, // ej: {first}.{last}
            emails: (data.data?.emails || []).map(e => ({
                email: e.value,
                firstName: e.first_name,
                lastName: e.last_name,
                position: e.position,
                department: e.department,
                linkedin: e.linkedin,
                twitter: e.twitter,
                phone: e.phone_number,
                confidence: e.confidence,
                sources: e.sources?.length || 0
            })),
            totalEmails: data.meta?.results || 0
        };

        console.log(`[Hunter.io] ✅ ${result.emails.length} emails encontrados para ${domain}`);

        return result;

    } catch (error) {
        console.error(`[Hunter.io] ❌ Error:`, error.message);
        return { emails: [], patterns: null };
    }
}

/**
 * Buscar email de una persona específica
 * @param {string} domain - Dominio de la empresa
 * @param {string} firstName - Nombre
 * @param {string} lastName - Apellido
 */
export async function findPersonEmail(domain, firstName, lastName) {
    try {
        console.log(`[Hunter.io] 🔍 Buscando email de ${firstName} ${lastName} en ${domain}`);

        const url = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${HUNTER_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.errors || !data.data?.email) {
            return null;
        }

        return {
            email: data.data.email,
            confidence: data.data.score,
            firstName: data.data.first_name,
            lastName: data.data.last_name,
            position: data.data.position,
            department: data.data.department,
            linkedin: data.data.linkedin,
            twitter: data.data.twitter,
            phone: data.data.phone_number
        };

    } catch (error) {
        console.error(`[Hunter.io] ❌ Error buscando persona:`, error.message);
        return null;
    }
}

/**
 * Verificar si un email existe
 * @param {string} email - Email a verificar
 */
export async function verifyEmail(email) {
    try {
        const url = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${HUNTER_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.errors) {
            return { valid: false, reason: data.errors[0]?.details };
        }

        return {
            valid: data.data?.result === 'deliverable',
            status: data.data?.status,
            score: data.data?.score,
            disposable: data.data?.disposable,
            webmail: data.data?.webmail
        };

    } catch (error) {
        return { valid: false, reason: error.message };
    }
}

/**
 * Extraer dominio de nombre de empresa
 * @param {string} companyName - Nombre de la empresa
 */
export function extractDomainFromCompany(companyName) {
    // Limpiar nombre de empresa
    const clean = companyName
        .toLowerCase()
        .replace(/s\.a\.s\.?|ltda\.?|s\.a\.?|sas|cia\.?|colombia|inc\.?|corp\.?/gi, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)[0]; // Tomar primera palabra

    // Posibles dominios para Colombia
    const possibleDomains = [
        `${clean}.com.co`,
        `${clean}.co`,
        `${clean}.com`,
        `${clean}colombia.com`,
        `grupo${clean}.com`
    ];

    return possibleDomains;
}

/**
 * Buscar emails de una empresa por nombre
 * Prueba múltiples dominios posibles
 */
export async function searchEmailsByCompanyName(companyName) {
    const domains = extractDomainFromCompany(companyName);

    console.log(`[Hunter.io] 🔍 Probando dominios para ${companyName}:`, domains);

    for (const domain of domains) {
        const result = await searchEmailsByDomain(domain);

        if (result.emails.length > 0) {
            return result;
        }

        // Pequeño delay entre intentos
        await new Promise(r => setTimeout(r, 500));
    }

    return { emails: [], domain: null };
}

export default {
    searchEmailsByDomain,
    searchEmailsByCompanyName,
    findPersonEmail,
    verifyEmail,
    HUNTER_API_KEY
};
