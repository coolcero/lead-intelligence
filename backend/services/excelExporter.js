import fs from 'fs';
import path from 'path';

/**
 * Servicio para exportar resultados a Excel (CSV compatible con Excel)
 * VERSIÓN COMPLETA - Con TODOS los datos de contacto
 */

/**
 * Generar reporte CSV COMPLETO con todos los datos de contacto
 */
export function generateExcelReport(results, companies, outputPath) {
    console.log(`\n📊 Generando reporte Excel COMPLETO...`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `Lead_Intelligence_COMPLETO_${timestamp}.csv`;
    const filepath = path.join(outputPath, filename);

    // BOM para Excel reconozca UTF-8
    const BOM = '\uFEFF';

    // Headers COMPLETOS
    const headers = [
        'Empresa',
        'NIT',
        'Vacante',
        'Por qué Bmind puede suplir',
        'Servicio Bmind',
        'Score',
        'Portal',
        'URL Vacante',
        // Contacto decisor
        'Decisor Nombre',
        'Decisor Cargo',
        'Decisor LinkedIn',
        // Emails (múltiples)
        'Email 1',
        'Email 2',
        'Email 3',
        // Teléfonos (múltiples)
        'Teléfono 1',
        'Teléfono 2',
        // Datos empresa
        'Dirección',
        'Fuentes de Datos',
        'Confianza',
        'Fecha Detección'
    ];

    // Filas de datos
    const rows = results.map(r => {
        // Obtener el mejor contacto
        const bestContact = r.contacts?.find(c => c.aiValidated) || r.contacts?.[0] || {};

        // Arrays de emails y teléfonos (del enriquecimiento de datos)
        const emails = bestContact.emails || [bestContact.email].filter(Boolean);
        const phones = bestContact.phones || [bestContact.phone].filter(Boolean);

        return [
            escapeCSV(r.companyName || ''),
            escapeCSV(bestContact.companyNit || ''),
            escapeCSV(r.title || ''),
            escapeCSV(r.matchReason || ''),
            escapeCSV(r.bmindService || ''),
            r.score || 0,
            escapeCSV(r.source || ''),
            escapeCSV(r.url || ''),
            // Contacto decisor
            escapeCSV(bestContact.name || ''),
            escapeCSV(bestContact.title || bestContact.detectedRole || ''),
            escapeCSV(bestContact.url || ''),
            // Emails
            escapeCSV(emails[0] || ''),
            escapeCSV(emails[1] || ''),
            escapeCSV(emails[2] || ''),
            // Teléfonos
            escapeCSV(phones[0] || ''),
            escapeCSV(phones[1] || ''),
            // Datos empresa
            escapeCSV(bestContact.companyAddress || ''),
            escapeCSV((bestContact.dataSources || []).join(', ')),
            escapeCSV(bestContact.confidence || ''),
            escapeCSV(r.dateDetected || new Date().toISOString())
        ];
    });

    // Construir CSV
    let csv = BOM;
    csv += headers.join(',') + '\n';
    csv += rows.map(row => row.join(',')).join('\n');

    // Agregar resumen
    csv += '\n\n';
    csv += '"RESUMEN DEL ESCANEO"\n';
    csv += `"Total Empresas Escaneadas",${companies.length}\n`;
    csv += `"Total Vacantes TI Encontradas",${results.length}\n`;
    csv += `"Vacantes con Emails",${results.filter(r => r.contacts?.some(c => c.emails?.length > 0 || c.email)).length}\n`;
    csv += `"Vacantes con Teléfono",${results.filter(r => r.contacts?.some(c => c.phones?.length > 0 || c.phone)).length}\n`;
    csv += `"Fecha de Generación","${new Date().toLocaleString('es-CO')}"\n`;

    // Servicios más demandados
    csv += '\n"SERVICIOS BMIND MÁS DEMANDADOS"\n';
    const serviceCounts = {};
    results.forEach(r => {
        serviceCounts[r.bmindService] = (serviceCounts[r.bmindService] || 0) + 1;
    });
    Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([service, count]) => {
            csv += `"${service}",${count}\n`;
        });

    // Guardar archivo
    fs.writeFileSync(filepath, csv, 'utf8');

    console.log(`   ✅ Reporte COMPLETO guardado: ${filepath}`);
    console.log(`   📈 ${results.length} vacantes con datos de contacto exportadas`);

    return {
        filepath,
        filename,
        totalResults: results.length,
        totalCompanies: companies.length
    };
}

/**
 * Escapar valores para CSV
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
}

/**
 * Generar reporte de empresas
 */
export function generateCompaniesReport(companies, results, outputPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `Empresas_Escaneadas_${timestamp}.csv`;
    const filepath = path.join(outputPath, filename);

    const BOM = '\uFEFF';

    const headers = [
        'ID',
        'Razón Social',
        'NIT',
        'Sector',
        'Vacantes Encontradas',
        'Última Vacante',
        'Email Encontrado',
        'Teléfono Encontrado',
        'Estado'
    ];

    // Info de vacantes por empresa
    const vacanciesByCompany = {};
    results.forEach(r => {
        const companyId = r.companyId || r.companyName;
        if (!vacanciesByCompany[companyId]) {
            vacanciesByCompany[companyId] = { count: 0, lastVacancy: '', email: '', phone: '' };
        }
        vacanciesByCompany[companyId].count++;
        vacanciesByCompany[companyId].lastVacancy = r.title;

        // Guardar emails/teléfonos
        const contact = r.contacts?.[0];
        if (contact?.emails?.[0]) vacanciesByCompany[companyId].email = contact.emails[0];
        if (contact?.phones?.[0]) vacanciesByCompany[companyId].phone = contact.phones[0];
    });

    const rows = companies.map((c, index) => {
        const companyId = c.id || c.razonSocial || c.name;
        const info = vacanciesByCompany[companyId] || { count: 0, lastVacancy: '', email: '', phone: '' };

        return [
            escapeCSV(index + 1),
            escapeCSV(c.razonSocial || c.name || ''),
            escapeCSV(c.nit || ''),
            escapeCSV(c.sector || ''),
            info.count,
            escapeCSV(info.lastVacancy),
            escapeCSV(info.email),
            escapeCSV(info.phone),
            info.count > 0 ? '"CON VACANTES TI"' : '"Sin vacantes"'
        ];
    });

    let csv = BOM;
    csv += headers.join(',') + '\n';
    csv += rows.map(row => row.join(',')).join('\n');

    fs.writeFileSync(filepath, csv, 'utf8');

    console.log(`   📋 Reporte de empresas guardado: ${filepath}`);

    return { filepath, filename };
}

export default { generateExcelReport, generateCompaniesReport };
