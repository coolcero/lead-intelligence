
/**
 * Servicio para consultar JSearch API (RapidAPI)
 * Agrega resultados de LinkedIn, Indeed, Glassdoor, etc.
 */

// URL base de Active Jobs DB (RapidAPI)
const RAPIDAPI_HOST = 'active-jobs-db.p.rapidapi.com';
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/active-jobs`;

/**
 * Buscar ofertas de empleo usando Active Jobs DB
 * @param {string} query - Término de búsqueda (ej: "Bancolombia TI")
 * @param {string} apiKey - Key de RapidAPI
 * @returns {Promise<Array>} - Lista de vacantes normalizadas
 */
export async function searchJobsWithRapidAPI(query, apiKey) {
    if (!apiKey) return [];

    console.log(`[RapidAPI] Buscando: "${query}" en Active Jobs DB...`);

    try {
        const response = await fetch(`${RAPIDAPI_URL}?organization=${encodeURIComponent(query)}&country=Colombia`, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RapidAPI] Error ${response.status}: ${errorText}`);
            throw new Error(`RapidAPI Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
            console.warn('[RapidAPI] Respuesta sin datos válidos');
            return [];
        }

        console.log(`[RapidAPI] Encontradas ${data.data.length} ofertas para "${query}"`);

        // Normalizar formato para que coincida con nuestros scrapers
        return data.data.map(job => ({
            title: job.job_title,
            company: job.employer_name,
            location: job.job_city || job.job_country,
            url: job.job_apply_link,
            source: 'JSearch (' + (job.job_publisher || 'Aggregator') + ')',
            description: job.job_description,
            datePosted: job.job_posted_at_datetime_utc,
            isRemote: job.job_is_remote
        }));

    } catch (error) {
        console.error(`[RapidAPI] Fallo en búsqueda: ${error.message}`);
        // Si el error es de cuota o auth, hay que avisar, no solo retornar []
        if (error.message.includes('429') || error.message.includes('401') || error.message.includes('403')) {
            throw error; // Re-lanzar para que server.js lo maneje (pausar o avisar)
        }
        return [];
    }
}
