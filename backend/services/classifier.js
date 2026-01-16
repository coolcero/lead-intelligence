import Groq from 'groq-sdk';

// =====================================================
// BMIND CORE SERVICES: Oracle, Quest, Red Hat, Migraciones Cloud
// =====================================================

// Keywords PRINCIPALES - Solo estas generan leads de valor
// Keywords PRIORITY - Only these are relevant now as per user request
const PRIORITY_KEYWORDS = [
    'red hat', 'redhat', 'rhel', 'openshift', 'ansible',
    'oci', 'oracle cloud', 'oracle cloud infrastructure',
    'quest', 'quest software', 'toad', 'foglight', 'spotlight', 'shareplex'
];

// Keywords PRINCIPALES - Solo estas generan leads de valor
const IT_KEYWORDS = [
    // ORACLE (prioridad máxima)
    'oracle', 'oracle database', 'oracle db', 'dba oracle', 'pl/sql', 'plsql',
    'oracle cloud', 'oci', 'oracle cloud infrastructure', 'exadata',
    'oracle rac', 'oracle data guard', 'golden gate', 'oracle forms',
    'oracle apex', 'oracle weblogic', 'oracle ebs', 'oracle fusion',

    // QUEST SOFTWARE
    'quest', 'quest software', 'toad', 'toad for oracle', 'shareplex',
    'quest recovery manager', 'spotlight', 'foglight', 'quest migration',
    'stat', 'quest stat', 'change commander',

    // RED HAT
    'red hat', 'redhat', 'rhel', 'red hat enterprise linux',
    'openshift', 'ansible', 'red hat ansible', 'jboss', 'ceph',
    'red hat virtualization', 'rhev', 'satellite', 'podman',

    // MIGRACIONES CLOUD
    'migración', 'migracion', 'migration', 'migrar', 'modernización',
    'modernizacion', 'legacy', 're-platform', 'lift and shift',
    'migración cloud', 'migración a la nube', 'cloud migration',
    'transformación digital', 'transformacion digital',

    // CLOUD (complementario)
    'cloud', 'nube', 'aws', 'azure', 'gcp', 'oracle cloud',
    'oci', 'infraestructura cloud', 'cloud architect',

    // DBA (relacionado con Oracle/Quest)
    'dba', 'database administrator', 'administrador de base de datos',
    'base de datos', 'bases de datos',

    // Linux/Red Hat relacionado
    'linux', 'linux administrator', 'administrador linux'
];

// Keywords que EXCLUYEN (no son servicios Bmind)
const EXCLUDE_KEYWORDS = [
    // Roles comerciales
    'comercial', 'ventas', 'vendedor', 'asesor comercial',
    'call center', 'telefonista', 'recepcionista',
    // Finanzas
    'contador', 'contabilidad', 'auxiliar contable',
    // RRHH
    'recursos humanos', 'rrhh', 'psicólogo', 'selección',
    // Marketing
    'marketing', 'community manager', 'social media', 'publicidad',
    // Diseño
    'diseñador', 'diseño gráfico', 'ux', 'ui',
    // Legal
    'abogado', 'legal', 'jurídico',
    // Operativos
    'mensajero', 'conductor', 'domiciliario', 'operario', 'bodega',
    // Desarrollo puro (no es servicio gestionado)
    'desarrollador frontend', 'react developer', 'angular developer',
    'mobile developer', 'ios developer', 'android developer'
];

// SERVICIOS BMIND - Mapeo de keywords
const KEYWORD_TO_SERVICE_MAP = {
    // ===== ORACLE =====
    'oracle': 'Servicios Gestionados Oracle',
    'oracle database': 'Servicios Gestionados Oracle',
    'oracle db': 'Servicios Gestionados Oracle',
    'dba oracle': 'Servicios Gestionados Oracle',
    'pl/sql': 'Servicios Gestionados Oracle',
    'plsql': 'Servicios Gestionados Oracle',
    'oracle cloud': 'Oracle Cloud Infrastructure (OCI)',
    'oci': 'Oracle Cloud Infrastructure (OCI)',
    'oracle rac': 'Servicios Gestionados Oracle',
    'oracle data guard': 'Servicios Gestionados Oracle',
    'golden gate': 'Servicios Gestionados Oracle',
    'exadata': 'Servicios Gestionados Oracle',
    'oracle apex': 'Servicios Gestionados Oracle',
    'oracle weblogic': 'Servicios Gestionados Oracle',
    'oracle ebs': 'Servicios Gestionados Oracle',
    'oracle fusion': 'Servicios Gestionados Oracle',

    // ===== QUEST SOFTWARE =====
    'quest': 'Servicios Quest Software',
    'quest software': 'Servicios Quest Software',
    'toad': 'Servicios Quest Software',
    'toad for oracle': 'Servicios Quest Software',
    'shareplex': 'Servicios Quest Software (SharePlex)',
    'quest recovery': 'Servicios Quest Software',
    'spotlight': 'Servicios Quest Software',
    'foglight': 'Servicios Quest Software',
    'stat': 'Servicios Quest Software',

    // ===== RED HAT =====
    'red hat': 'Servicios Red Hat',
    'redhat': 'Servicios Red Hat',
    'rhel': 'Servicios Red Hat (RHEL)',
    'openshift': 'Servicios Red Hat (OpenShift)',
    'ansible': 'Servicios Red Hat (Ansible)',
    'jboss': 'Servicios Red Hat (JBoss)',
    'satellite': 'Servicios Red Hat',
    'podman': 'Servicios Red Hat',

    // ===== MIGRACIONES CLOUD =====
    'migración': 'Consultoría Migración Cloud',
    'migracion': 'Consultoría Migración Cloud',
    'migration': 'Consultoría Migración Cloud',
    'migrar': 'Consultoría Migración Cloud',
    'modernización': 'Consultoría Migración Cloud',
    'modernizacion': 'Consultoría Migración Cloud',
    'legacy': 'Consultoría Migración Cloud',
    'transformación digital': 'Consultoría Migración Cloud',

    // ===== CLOUD (genérico) =====
    'cloud': 'Servicios Cloud',
    'nube': 'Servicios Cloud',
    'aws': 'Servicios Cloud (AWS)',
    'azure': 'Servicios Cloud (Azure)',
    'gcp': 'Servicios Cloud (GCP)',

    // ===== DBA =====
    'dba': 'Servicios Gestionados DBA',
    'database administrator': 'Servicios Gestionados DBA',
    'base de datos': 'Servicios Gestionados DBA',

    // ===== LINUX =====
    'linux': 'Servicios Linux/Red Hat',
    'administrador linux': 'Servicios Linux/Red Hat',
};

/**
 * Verificar si una vacante es relevante para Bmind
 */
export function isRelevantVacancy(title) {
    const titleLower = title.toLowerCase();

    // 1. PRIMERO: Verificar si contiene KEYWORDS PRIORITARIAS (User request: RedHat, OCI, Quest)
    // Si contiene alguna de estas, PASA DIRECTO (ignorando exclusions leves, aunque validamos exclusions graves)
    const hasPriority = PRIORITY_KEYWORDS.some(pk => titleLower.includes(pk));

    // Exclusiones absolutas (chofer, aseo, etc) siempre aplican
    for (const exclude of EXCLUDE_KEYWORDS) {
        if (titleLower.includes(exclude)) {
            // Si es "ventas red hat" quizás sea relevante? No, el usuario no quiere roles comerciales.
            // Mantenemos la exclusión de roles basura.
            return false;
        }
    }

    if (hasPriority) {
        return true;
    }

    // Si no tiene keywords prioritarias, aplicamos filtro estricto:
    // User asked "solo redhat, oci, quet y ya". 
    // This implies we should DISCARD anything else explicitly? 
    // Let's make it strict but allow broader distinct matching if configured, 
    // but for this request, let's act as if he wants ONLY these.
    // However, to avoid breaking other functionalities, let's prioritize them heavily in scoring
    // but maybe NOT discard everything else entirely unless requested.
    // The user said: "dale foco solo a redhat, oci, quet y ya". 
    // "y ya" suggests EXCLUSIVE focus.

    // STRICT MODE for this session:
    return false; // Solo permitir prioritarias

    /* Original Logic suppressed for "Focus Mode"
    // Luego verificar si contiene keywords de TI
    for (const keyword of IT_KEYWORDS) {
        if (titleLower.includes(keyword)) {
            return true;
        }
    }
    return false;
    */
}

/**
 * Clasificar vacante usando Groq AI o keywords
 */
// SYSTEM PROMPT AVANZADO (Definido por el usuario)
const SYSTEM_PROMPT = `
ROL: Actúa como un Experto Analista de Oportunidades Comerciales y Preventa Técnica para "Bmind" (bmind.com). Tu objetivo es analizar descripciones de vacantes laborales de empresas en Colombia y determinar si esa necesidad de contratación puede ser satisfecha tercerizando el servicio con Bmind en lugar de contratar un empleado fijo.

CONTEXTO DE LA EMPRESA (BMIND): Bmind es una empresa de servicios de tecnología enfocada en infraestructura, datos y operaciones.
Foco Tecnológico Principal: Oracle (Base de Datos, OCI, Apps), Red Hat (Linux, OpenShift, Ansible), Quest.
Modelo de Servicio: Ofrecemos servicios administrados, consultoría, fábricas de software y celdas de operación.

NUESTROS NIVELES DE SERVICIO:
Nivel 1 (Infraestructura): Oracle Cloud Infrastructure (OCI), Servidores, Redes.
Nivel 2 (Base de Datos): Oracle Database, SQL Server, Migración, Actualización, Afinamiento (Tuning).
Nivel 3 (Aplicaciones & Modernización): Contenedores (Kubernetes/OpenShift), Integraciones, Lowcode, DevOps, Middleware.
Nivel 4 (Analítica): Analítica de Datos, Big Data.
Nivel 5 (IA): Inteligencia Artificial y Machine Learning.
Transversal (Operación): Mesa de Ayuda, Monitoreo (Observabilidad), Soporte Nivel 1/2/3.
Transversal (Gestión): PMO, Project Management (Agile, PMI/ITIL), Scrum Masters.

TU TAREA (ALGORITMO DE PENSAMIENTO):
PASO 1: FILTRADO DE RELEVANCIA
- Descarta vacantes que NO sean de TI (RRHH, Ventas, Admin).
- Descarta desarrollo software NO cubierto (PHP, etc) salvo DevOps.
- Prioridad Alta: Oracle, Red Hat, Linux, Base de Datos, Nube, Migración, DevOps, Ansible, Kubernetes.
PASO 2: ANÁLISIS DEL "DOLOR"
- Identifica qué problema resuelven al contratar.
PASO 3: EMPAREJAMIENTO CON SOLUCIÓN BMIND
- Asigna la vacante a uno de nuestros servicios.
PASO 4: GENERACIÓN DE ARGUMENTO DE VENTA (EL GANCHO)
- Redacta un breve "Pitch" explicando por qué contratar a Bmind es mejor.

FORMATO DE SALIDA (JSON REQUERIDO):
{
  "is_opportunity": true,
  "confidence_score": 85,
  "job_role_detected": "DBA Oracle Senior",
  "bmind_service_match": "Gestión de Base de Datos y Servicios Administrados",
  "pain_point_analysis": "La empresa necesita estabilidad en sus bases de datos...",
  "sales_pitch_hook": "En lugar de contratar un solo DBA, Bmind ofrece una celda...",
  "keywords_found": ["Oracle", "RMAN"]
}
`;

/**
 * Clasificar vacante usando Groq AI con System Prompt Avanzado
 */
export async function classifyVacancy(vacancy, groqApiKey) {
    const title = vacancy.title?.toLowerCase() || '';

    // Verificar si es relevante (filtro base de keywords negativas)
    if (!isRelevantVacancy(title)) {
        return null;
    }

    // Si hay API key, usar la IA con el Prompt Avanzado
    if (groqApiKey) {
        try {
            const groq = new Groq({ apiKey: groqApiKey });

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `VACANTE: ${vacancy.title}\nDESCRIPCIÓN: ${vacancy.title}` }
                ],
                model: "llama3-70b-8192", // Modelo potente para razonamiento
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;
            const result = JSON.parse(content || '{}');

            if (result.is_opportunity === true && result.confidence_score >= 50) {
                return {
                    ...vacancy,
                    bmindService: result.bmind_service_match,
                    matchReason: result.pain_point_analysis,   // Usamos el análisis de dolor
                    salesPitch: result.sales_pitch_hook,       // NUEVO: Pitch de venta
                    score: result.confidence_score,
                    jobRole: result.job_role_detected,
                    matchedKeywords: result.keywords_found || [],
                    aiClassified: true,
                    id: `vacancy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    status: 'new'
                };
            } else {
                return null; // La IA decidió que NO es oportunidad o score bajo
            }

        } catch (error) {
            console.error('[Classifier] Error con Groq AI:', error.message);
            // Fallback a keywords si falla la IA
        }
    }

    // Fallback: Clasificación Clásica por Keywords (si no hay API o error)
    const keywordResult = classifyByKeywords(title);
    if (keywordResult.service) {
        return {
            ...vacancy,
            bmindService: keywordResult.service,
            matchReason: keywordResult.matchReason,
            matchedKeywords: keywordResult.matchedKeywords,
            score: 70, // Score base por keyword
            aiClassified: false,
            id: `vacancy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'new'
        };
    }

    return null;
}

/**
 * Clasificar por keywords y explicar el match
 */
function classifyByKeywords(title) {
    const matchedKeywords = [];
    let service = null;
    let matchReason = '';

    // Buscar todas las keywords que coinciden
    for (const [keyword, svc] of Object.entries(KEYWORD_TO_SERVICE_MAP)) {
        if (title.includes(keyword)) {
            matchedKeywords.push(keyword);
            if (!service) {
                service = svc;
            }
        }
    }

    // Generar razón del match
    if (matchedKeywords.length > 0 && service) {
        const keywords = matchedKeywords.join(', ').toUpperCase();
        matchReason = generateMatchReason(matchedKeywords[0], service);
    }

    return { service, matchReason, matchedKeywords };
}

/**
 * Generar explicación de por qué Bmind puede suplir esta necesidad
 */
function generateMatchReason(keyword, service) {
    const reasons = {
        'dba': `Necesitan DBA → Bmind ofrece ${service} con expertos certificados`,
        'oracle': `Requieren Oracle → Bmind tiene especialistas Oracle Gold Partner`,
        'sql server': `Necesitan SQL Server → Bmind administra +500 instancias SQL Server`,
        'mysql': `Requieren MySQL → Bmind ofrece administración MySQL 24/7`,
        'postgresql': `Necesitan PostgreSQL → Bmind tiene DBAs PostgreSQL certificados`,
        'mongodb': `Requieren MongoDB → Bmind ofrece gestión de bases NoSQL`,
        'aws': `Necesitan AWS → Bmind es AWS Partner con +100 proyectos cloud`,
        'azure': `Requieren Azure → Bmind tiene certificaciones Azure Expert`,
        'google cloud': `Necesitan GCP → Bmind ofrece operación multi-cloud`,
        'gcp': `Requieren GCP → Bmind ofrece operación multi-cloud`,
        'cloud': `Necesitan Cloud → Bmind opera infraestructura cloud 24/7`,
        'devops': `Requieren DevOps → Bmind implementa CI/CD, IaC y automatización`,
        'kubernetes': `Necesitan K8s → Bmind gestiona clusters Kubernetes en producción`,
        'docker': `Requieren Docker → Bmind tiene expertos en containerización`,
        'terraform': `Necesitan IaC → Bmind implementa Terraform/Ansible`,
        'sre': `Requieren SRE → Bmind ofrece Site Reliability Engineering`,
        'linux': `Necesitan Linux → Bmind administra +1000 servidores Linux`,
        'windows server': `Requieren Windows → Bmind gestiona infraestructura Microsoft`,
        'vmware': `Necesitan VMware → Bmind opera ambientes virtualizados`,
        'sysadmin': `Requieren SysAdmin → Bmind ofrece administración de sistemas 24/7`,
        'help desk': `Necesitan Help Desk → Bmind ofrece Mesa de Ayuda N1/N2/N3`,
        'soporte': `Requieren Soporte → Bmind tiene equipos de soporte dedicados`,
        'arquitecto': `Necesitan Arquitecto → Bmind ofrece consultoría en arquitectura`,
        'seguridad': `Requieren Seguridad → Bmind tiene especialistas en ciberseguridad`,
        'ciberseguridad': `Necesitan Ciberseguridad → Bmind ofrece servicios SOC`,
        'redes': `Requieren Redes → Bmind administra infraestructura de redes`,
        'cisco': `Necesitan Cisco → Bmind tiene ingenieros CCNP/CCIE`,
        'infraestructura': `Requieren Infraestructura → Bmind gestiona datacenters`,
    };

    return reasons[keyword] || `Detectado: ${keyword.toUpperCase()} → ${service}`;
}

/**
 * Calcular score basado en relevancia
 */
function calculateScore(vacancy) {
    let score = 50;
    const title = vacancy.title?.toLowerCase() || '';

    // Keywords de alta relevancia para servicios gestionados
    const highRelevance = ['senior', 'lead', 'principal', 'architect', 'manager', 'jefe', 'líder'];
    const medRelevance = ['dba', 'devops', 'cloud', 'aws', 'azure', 'kubernetes', 'oracle', 'sre'];
    const lowRelevance = ['junior', 'practicante', 'pasante', 'trainee'];

    for (const kw of highRelevance) {
        if (title.includes(kw)) score += 15;
    }

    for (const kw of medRelevance) {
        if (title.includes(kw)) score += 10;
    }

    for (const kw of lowRelevance) {
        if (title.includes(kw)) score -= 10;
    }

    return Math.min(Math.max(score, 20), 100);
}

/**
 * Clasificar usando Groq AI
 */
async function classifyWithGroq(vacancy, apiKey) {
    const groq = new Groq({ apiKey });

    const prompt = `Analiza esta vacante de empleo TI y clasifícala en UNO de estos servicios gestionados de Bmind:

1. Servicios Gestionados de Base de Datos (DBA, Oracle, SQL, etc)
2. Operación Cloud (AWS, Azure, GCP, infraestructura cloud)
3. Consultoría DevOps (CI/CD, Kubernetes, Docker, automatización)
4. Servicios Gestionados TI (Sysadmin, infraestructura, sistemas)
5. Mesa de Ayuda Gestionada (Help Desk, soporte técnico)
6. Consultoría en Arquitectura (Solution Architect, Enterprise Architect)
7. Consultoría en Seguridad (Ciberseguridad, pentesting, SOC)
8. Servicios Gestionados de Redes (Networking, Cisco, firewall)

Vacante: "${vacancy.title}"
Empresa: "${vacancy.company || 'No especificada'}"

Responde SOLO con este JSON:
{"service": "nombre exacto del servicio", "score": 75, "reason": "explicación breve"}`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-70b-versatile',
            temperature: 0.2,
            max_tokens: 150
        });

        const response = completion.choices[0]?.message?.content || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                service: parsed.service,
                score: parsed.score || 70,
                reason: parsed.reason
            };
        }
    } catch (error) {
        console.error('[Groq] Error:', error.message);
    }

    return { service: null, score: 50 };
}

export default { classifyVacancy, isRelevantVacancy };
