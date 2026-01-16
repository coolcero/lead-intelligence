/**
 * Servicio de Kaspr API
 * API PREMIUM para encontrar emails y teléfonos REALES de LinkedIn
 * Mucho más preciso que Hunter.io
 */

// API Key de Kaspr (Plan de pago)
const KASPR_API_KEY = '314d419e7c7d4e7a8092c631f930dd52';
const KASPR_BASE_URL = 'https://api.kaspr.io';

/**
 * Buscar información de contacto por URL de LinkedIn
 * @param {string} linkedinUrl - URL del perfil de LinkedIn
 */
export async function enrichLinkedInProfile(linkedinUrl) {
    try {
        console.log(`[Kaspr] 🔍 Enriqueciendo perfil: ${linkedinUrl}`);

        const response = await fetch(`${KASPR_BASE_URL}/linkedin/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': KASPR_API_KEY
            },
            body: JSON.stringify({
                linkedin_url: linkedinUrl
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error(`[Kaspr] ❌ Error:`, data.error);
            return null;
        }

        const result = {
            // Datos personales
            firstName: data.first_name,
            lastName: data.last_name,
            fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            headline: data.headline,

            // Datos de contacto REALES
            emails: data.emails || [],
            directEmail: data.emails?.[0]?.email,
            phones: data.phone_numbers || [],
            directPhone: data.phone_numbers?.[0]?.number,

            // Empresa actual
            company: data.current_company?.name,
            companyDomain: data.current_company?.domain,
            companyLinkedIn: data.current_company?.linkedin_url,
            position: data.current_position,

            // LinkedIn
            linkedinUrl: linkedinUrl,

            // Metadata
            source: 'kaspr_api',
            verified: true,
            confidence: 'alto'
        };

        console.log(`[Kaspr] ✅ Encontrado: ${result.fullName} | Email: ${result.directEmail || 'N/A'} | Tel: ${result.directPhone || 'N/A'}`);

        return result;

    } catch (error) {
        console.error(`[Kaspr] ❌ Error:`, error.message);
        return null;
    }
}

/**
 * Buscar contactos de una empresa
 * @param {string} companyName - Nombre de la empresa
 * @param {string} companyDomain - Dominio de la empresa (opcional)
 */
export async function searchCompanyContacts(companyName, companyDomain = null) {
    try {
        console.log(`[Kaspr] 🔍 Buscando contactos de: ${companyName}`);

        const searchParams = {
            company_name: companyName,
            job_titles: ['CTO', 'Director TI', 'IT Manager', 'Gerente TI', 'Gerente de Tecnología', 'Director de Tecnología', 'Jefe de Sistemas'],
            limit: 5
        };

        if (companyDomain) {
            searchParams.company_domain = companyDomain;
        }

        const response = await fetch(`${KASPR_BASE_URL}/search/people`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': KASPR_API_KEY
            },
            body: JSON.stringify(searchParams)
        });

        const data = await response.json();

        if (data.error) {
            console.error(`[Kaspr] ❌ Error:`, data.error);
            return [];
        }

        const contacts = (data.results || []).map(person => ({
            name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
            firstName: person.first_name,
            lastName: person.last_name,
            title: person.headline || person.current_position,
            company: person.current_company?.name || companyName,
            email: person.emails?.[0]?.email,
            emails: person.emails?.map(e => e.email) || [],
            phone: person.phone_numbers?.[0]?.number,
            phones: person.phone_numbers?.map(p => p.number) || [],
            linkedin: person.linkedin_url,
            source: 'kaspr_api',
            verified: true,
            confidence: 'alto'
        }));

        console.log(`[Kaspr] ✅ ${contacts.length} contactos encontrados para ${companyName}`);

        return contacts;

    } catch (error) {
        console.error(`[Kaspr] ❌ Error buscando empresa:`, error.message);
        return [];
    }
}

/**
 * Enriquecer múltiples perfiles de LinkedIn
 * @param {string[]} linkedinUrls - Array de URLs de LinkedIn
 */
export async function enrichMultipleProfiles(linkedinUrls) {
    const results = [];

    for (const url of linkedinUrls) {
        const profile = await enrichLinkedInProfile(url);
        if (profile) {
            results.push(profile);
        }
        // Pequeño delay para no sobrecargar la API
        await new Promise(r => setTimeout(r, 500));
    }

    return results;
}

/**
 * Buscar decisores TI de una empresa usando Kaspr
 * Esta es la función principal que combina búsqueda + enriquecimiento
 */
export async function findITDecisionMakers(companyName) {
    console.log(`\n[Kaspr] 🎯 Buscando decisores TI de: ${companyName}`);

    // Primero buscar contactos de la empresa
    const contacts = await searchCompanyContacts(companyName);

    if (contacts.length > 0) {
        // Filtrar por roles de decisor TI
        const decisionMakers = contacts.filter(c => {
            const title = (c.title || '').toLowerCase();
            return title.includes('cto') ||
                title.includes('director') ||
                title.includes('gerente') ||
                title.includes('manager') ||
                title.includes('jefe') ||
                title.includes('leader') ||
                title.includes('it') ||
                title.includes('tecnología') ||
                title.includes('sistemas');
        });

        if (decisionMakers.length > 0) {
            console.log(`[Kaspr] ✅ ${decisionMakers.length} decisores TI encontrados`);
            return decisionMakers;
        }
    }

    // Si no hay resultados específicos, devolver todos los contactos
    return contacts;
}

export { KASPR_API_KEY };

export default {
    enrichLinkedInProfile,
    searchCompanyContacts,
    enrichMultipleProfiles,
    findITDecisionMakers,
    KASPR_API_KEY
};
