import puppeteer from 'puppeteer';
import Groq from 'groq-sdk';
import { searchSalesNavigator } from './salesNavigator.js';
import { findITDecisionMakers } from './kasprService.js';

// API Key de Groq (configurada por el usuario via variable de entorno o parámetro)
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Servicio mejorado para encontrar contactos de DECISORES TI
 * Prioriza: CTO, Gerente TI, Director TI, Líder TI, Jefe de Sistemas
 */

// Títulos de decisores TI que nos interesan (en orden de prioridad)
const DECISION_MAKER_TITLES = [
    'CTO', 'Chief Technology Officer',
    'CIO', 'Chief Information Officer',
    'VP Technology', 'VP Engineering', 'VP IT',
    'Director de Tecnología', 'Director de TI', 'Director IT',
    'Director de Sistemas', 'Director de Informática',
    'Gerente de Tecnología', 'Gerente de TI', 'Gerente IT',
    'Gerente de Sistemas', 'Gerente de Informática',
    'Líder de Tecnología', 'Líder de TI', 'Líder TI',
    'Líder de Infraestructura', 'Líder de Sistemas',
    'Jefe de Tecnología', 'Jefe de TI', 'Jefe TI',
    'Jefe de Sistemas', 'Jefe de Informática',
    'Head of IT', 'IT Manager',
    'Technology Manager', 'Infrastructure Manager'
];

// Títulos que NO queremos (RRHH, etc)
const EXCLUDE_TITLES = ['Assistant', 'Intern', 'Becario', 'Practicante', 'Asistente'];

/**
 * Busca el decisor de TI de una empresa usando Sales Navigator (Prioridad) o Kaspr (Fallback)
 */
export async function findDecisionMaker(companyName, groqApiKey = GROQ_API_KEY) {
    // 1. INTENTO PRINCIPAL: LinkedIn Sales Navigator (Más preciso, info real)
    try {
        console.log(`[ContactFinder] 🔍 Iniciando búsqueda profunda en Sales Navigator para: ${companyName}`);
        const salesNavContacts = await searchSalesNavigator(companyName);

        if (salesNavContacts && salesNavContacts.length > 0) {
            console.log(`[ContactFinder] ✅ Encontrados ${salesNavContacts.length} contactos en Sales Navigator`);
            // Mapear al formato unificado
            return salesNavContacts.map(c => ({
                ...c,
                source: 'sales_navigator',
                verified: true
            }));
        }
    } catch (error) {
        console.error(`[ContactFinder] ⚠️ Error en Sales Navigator: ${error.message}`);
    }

    // 2. FALLBACK: Kaspr API (Rápido, base de datos)
    try {
        console.log(`[ContactFinder] ⚠️ Sales Nav sin resultados, probando Kaspr...`);
        const kasprContacts = await findITDecisionMakers(companyName);
        if (kasprContacts && kasprContacts.length > 0) {
            return kasprContacts.map(kc => ({
                type: 'kaspr_api',
                name: kc.name || kc.fullName,
                email: kc.email || kc.directEmail,
                emails: kc.emails || [kc.email].filter(Boolean),
                phone: kc.phone || kc.directPhone,
                phones: kc.phones || [kc.phone].filter(Boolean),
                title: kc.title || kc.position,
                company: kc.company,
                linkedin: kc.linkedin || kc.linkedinUrl,
                source: 'kaspr_api',
                verified: true,
                confidence: 'alto'
            }));
        }
        return [];
    } catch (error) {
        console.error(`[ContactFinder] ❌ Error en Kaspr: ${error.message}`);
        return [];
    }
}

/**
 * Validar y enriquecer contactos usando Groq AI
 */
async function validateContactsWithAI(contacts, companyName, apiKey) {
    try {
        const groq = new Groq({ apiKey });

        const contactsInfo = contacts.map(c => ({
            name: c.name,
            snippet: c.snippet,
            type: c.type
        }));

        const prompt = `Analiza estos contactos encontrados para la empresa "${companyName}" y determina cuál es el MEJOR para vender servicios de TI gestionados (bases de datos, cloud, infraestructura).

Contactos encontrados:
${JSON.stringify(contactsInfo, null, 2)}

Prioridad de contactos (de mayor a menor):
1. CTO, Director TI, Gerente TI - IDEAL, toman decisiones
2. Líder de Infraestructura, Jefe de Sistemas - MUY BUENO
3. Arquitecto, DevOps Lead - BUENO
4. RRHH, Recruiter - NO SIRVE (filtrar)

Responde SOLO con este JSON:
{
  "bestContactIndex": 0,
  "confidence": "alto|medio|bajo",
  "role": "cargo detectado",
  "reason": "por qué este contacto es valioso"
}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-70b-versatile',
            temperature: 0.2,
            max_tokens: 200
        });

        const response = completion.choices[0]?.message?.content || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            const bestIndex = analysis.bestContactIndex || 0;

            if (contacts[bestIndex]) {
                contacts[bestIndex].aiValidated = true;
                contacts[bestIndex].detectedRole = analysis.role;
                contacts[bestIndex].confidence = analysis.confidence;
                contacts[bestIndex].valueReason = analysis.reason;

                console.log(`   🤖 AI seleccionó: ${contacts[bestIndex].name} (${analysis.role}) - ${analysis.confidence}`);
            }
        }

        return contacts;

    } catch (error) {
        console.error(`[AI Validation] Error:`, error.message);
        return contacts;
    }
}

/**
 * Extraer título/cargo de un snippet de LinkedIn
 */
export function extractJobTitle(snippet) {
    if (!snippet) return null;

    const lowerSnippet = snippet.toLowerCase();

    for (const title of DECISION_MAKER_TITLES) {
        if (lowerSnippet.includes(title)) {
            return title;
        }
    }

    return null;
}
