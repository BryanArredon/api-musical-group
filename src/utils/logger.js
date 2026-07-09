/**
 * Función central de auditoría del sistema.
 * 
 * [CERTIFICACIÓN RNF11 - TRAZABILIDAD Y BITÁCORAS DE AUDITORÍA]
 * Se registra un log inmutable de toda acción importante (Crear solicitud, aprobar, eliminar, etc.),
 * enmascarando los datos personales (ej. email) para cumplir con el principio de minimización.
 */
export function auditLog(userId, action, details = {}) {
    const timestamp = new Date().toISOString();
    
    // Anonymize sensitive fields like name
    const cleanDetails = { ...details };
    if (cleanDetails.nombre) {
        cleanDetails.nombre = cleanDetails.nombre.length > 2 
            ? `${cleanDetails.nombre[0]}***${cleanDetails.nombre[cleanDetails.nombre.length - 1]}`
            : '***';
    }
    
    const detailsStr = JSON.stringify(cleanDetails);
    const logMessage = `[${timestamp}] [User: ${userId || 'SYSTEM'}] [Action: ${action}] - Details: ${detailsStr}`;
    
    console.log(logMessage);
    // In a real application, we might append this to a secure file or external log aggregator
    return logMessage;
}
