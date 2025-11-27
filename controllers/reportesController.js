// reportes.controller.js

import pool from "../db/db.js"; // Asegúrate de que esta ruta es correcta

/**
 * GET /api/reportes/consolidado
 * Genera un reporte consolidado (mensual o quincenal) de asistencias.
 */
export const getReporteConsolidado = async (req, res) => {
    try {
        const { mes, anio, tipoReporte, quincena, sede } = req.query;

        // 1. Validación básica de parámetros
        if (!mes || !anio || !tipoReporte) {
            return res.status(400).json({ 
                success: false, 
                message: "⚠️ Faltan datos: mes, año y tipoReporte son requeridos." 
            });
        }
        
        let sqlQuery = `
            SELECT
                u.nombre,
                u.apellidos,
                s.nombre AS sede_nombre,
                COUNT(a.id) AS total_registros, -- Usamos a.id de la tabla asistencia para el conteo
                SUM(CASE WHEN a.estado = 'PUNTUAL' THEN 1 ELSE 0 END) AS asistencias_puntuales,
                SUM(CASE WHEN a.estado = 'TARDE' THEN 1 ELSE 0 END) AS tardanzas,
                SUM(CASE WHEN a.estado = 'FALTA' THEN 1 ELSE 0 END) AS faltas,
                -- Agregando el total de descuento acumulado si usas esa columna en el reporte
                COALESCE(SUM(a.descuento), 0) AS total_descuento 
            FROM
                asistencia a -- ¡Tabla corregida a 'asistencia'!
            JOIN
                usuarios u ON a.usuario_id = u.id_usuario -- Referencia de usuario corregida
            JOIN
                sedes s ON u.sede_id = s.id_sede
            WHERE
                EXTRACT(MONTH FROM a.fecha) = $1 -- Usamos la columna 'fecha' para filtrar por mes
                AND EXTRACT(YEAR FROM a.fecha) = $2
        `;
        
        const params = [mes, anio];
        let paramIndex = 3;

        // 2. Filtrado por sede
        if (sede && sede !== 'todas') {
            sqlQuery += ` AND u.sede_id = $${paramIndex++}`;
            params.push(sede);
        }

        // 3. Filtrado por quincena
        if (tipoReporte === 'quincenal' && quincena) {
            if (quincena === '1') {
                sqlQuery += ` AND EXTRACT(DAY FROM a.fecha) <= 15`;
            } else if (quincena === '2') {
                sqlQuery += ` AND EXTRACT(DAY FROM a.fecha) > 15`;
            }
        }

        // 4. Agrupación y ordenación
        sqlQuery += `
            GROUP BY
                u.nombre, u.apellidos, s.nombre
            ORDER BY
                u.apellidos, u.nombre;
        `;
        
        const { rows } = await pool.query(sqlQuery, params);

        res.status(200).json({ 
            success: true, 
            data: rows,
            message: `Reporte consolidado generado para ${tipoReporte}.`
        });

    } catch (err) {
        console.error("❌ Error en getReporteConsolidado:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor al generar el reporte consolidado." 
        });
    }
};

// ---
export const getReporteTrabajador = async (req, res) => {
    try {
        const { mes, anio, sede } = req.query || {}; 
        
        // ... (Validación)

        // 🚨 CORRECCIÓN: Cambiar u.apellido a u.apellidos en SELECT y GROUP BY.
        let sqlQuery = `
            SELECT 
                u.nombre, u.apellidos, -- <--- CORREGIDO AQUÍ
                SUM(CASE WHEN a.estado = 'PUNTUAL' THEN 1 ELSE 0 END) AS puntualidad,
                SUM(CASE WHEN a.estado = 'TARDE' THEN 1 ELSE 0 END) AS tardanzas,
                SUM(CASE WHEN a.estado = 'FALTA' THEN 1 ELSE 0 END) AS faltas,
                u.id_usuario
            FROM 
                asistencia a
            JOIN 
                usuarios u ON a.usuario_id = u.id_usuario
            WHERE
                EXTRACT(MONTH FROM a.fecha) = $1
                AND EXTRACT(YEAR FROM a.fecha) = $2
        `;
        
        const params = [mes, anio];
        let paramIndex = 3;

        // ... (Filtrado dinámico por sede)
        if (sede && sede !== 'todas') {
            sqlQuery += ` AND u.sede_id = $${paramIndex++}`;
            params.push(sede);
        }

        // 🚨 CORRECCIÓN: Cambiar u.apellido a u.apellidos en GROUP BY.
        sqlQuery += `
            GROUP BY 
                u.nombre, u.apellidos, u.id_usuario -- <--- CORREGIDO AQUÍ
            ORDER BY 
                u.apellidos, u.nombre; -- <--- CORREGIDO AQUÍ
        `;
        
        // ... (Ejecución y respuesta)
        
    } catch (err) {
        console.error("ERROEES EN:",err);
        // ...
    }
};

/**
 * @route GET /api/reportes/desempeno
 * @desc Obtiene datos agregados (puntualidad, tardanzas, faltas) para el gráfico de desempeño.
 */
export const getGraficosDesempeno = async (req, res) => {
    try {
        const { sede } = req.query; // Recibimos el parámetro 'sede'

        // 1. Definición del Periodo (Mes/Año Actual)
        // Usamos el mes y año actual por defecto para los gráficos.
        const date = new Date();
        const currentMonth = date.getMonth() + 1; // getMonth() es base 0, necesitamos base 1
        const currentYear = date.getFullYear();

        let sqlQuery = `
            SELECT
                -- COALESCE asegura que si no hay filas o la suma es NULL, devuelva 0.
                COALESCE(SUM(CASE WHEN a.estado = 'PUNTUAL' THEN 1 ELSE 0 END), 0) AS puntualidad,
                COALESCE(SUM(CASE WHEN a.estado = 'TARDE' THEN 1 ELSE 0 END), 0) AS tardanzas,
                COALESCE(SUM(CASE WHEN a.estado = 'FALTA' THEN 1 ELSE 0 END), 0) AS faltas
            FROM
                asistencia a 
            JOIN
                usuarios u ON a.usuario_id = u.id_usuario 
            WHERE
                EXTRACT(MONTH FROM a.fecha) = $1
                AND EXTRACT(YEAR FROM a.fecha) = $2
        `;
        
        const params = [currentMonth, currentYear];
        let paramIndex = 3;

        // 2. Filtrado por sede
        if (sede && sede !== 'todas') {
            sqlQuery += ` AND u.sede_id = $${paramIndex++}`;
            params.push(sede);
        }
        
        const { rows } = await pool.query(sqlQuery, params);

        // 3. Formatear la respuesta
        // Si no hay filas, rows[0] será undefined. Usamos rows[0] o un objeto vacío.
        const data = rows[0] || {};
        
        // Convertir los valores a enteros (por si acaso el driver los devuelve como string)
        const desempenoData = {
            puntualidad: parseInt(data.puntualidad || 0),
            tardanzas: parseInt(data.tardanzas || 0),
            faltas: parseInt(data.faltas || 0),
        };

        res.status(200).json({ 
            success: true, 
            data: desempenoData,
            message: "Datos de desempeño cargados exitosamente."
        });

    } catch (err) {
        // 🚨 MUY IMPORTANTE: Imprimir el error exacto de PostgreSQL aquí para la depuración
        console.error("❌ Error en getGraficosDesempeno (Backend SQL):", err);
        
        // Retornamos el error 500
        res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor al cargar el gráfico de desempeño." 
        });
    }
};