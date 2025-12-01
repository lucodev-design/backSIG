// ====================================
// backend/controllers/reportesGeneralesController.js
// ====================================

import pool from "../db/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE_PERU = "America/Lima";

// ====================================
// HELPER: Obtener fecha en hora de Perú
// ====================================
const getFechaPeruFormateada = () => {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE_PERU);
  return format(zonedDate, "dd/MM/yyyy HH:mm:ss");
};

// ====================================
// REPORTE CONSOLIDADO (TODAS LAS SEDES)
// ====================================
export const generarReporteConsolidado = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin } = req.query;

    let whereClause = "";
    let params = [];

    if (periodo === "personalizado") {
      whereClause = "WHERE a.fecha BETWEEN $1 AND $2";
      params = [fechaInicio, fechaFin];
    } else if (periodo === "quincenal") {
      const diaInicio = quincena === "1" ? 1 : 16;
      const diaFin = quincena === "1" ? 15 : new Date(anio, mes, 0).getDate();
      whereClause = `WHERE EXTRACT(MONTH FROM a.fecha) = $1 
                     AND EXTRACT(YEAR FROM a.fecha) = $2 
                     AND EXTRACT(DAY FROM a.fecha) BETWEEN $3 AND $4`;
      params = [mes, anio, diaInicio, diaFin];
    } else {
      whereClause = `WHERE EXTRACT(MONTH FROM a.fecha) = $1 
                     AND EXTRACT(YEAR FROM a.fecha) = $2`;
      params = [mes, anio];
    }

    const query = `
      SELECT 
        s.nombre AS sede,
        COUNT(DISTINCT u.id_usuario) AS total_trabajadores,
        COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END) AS asistencias,
        COUNT(CASE WHEN a.estado = 'Tardanza' THEN 1 END) AS tardanzas,
        COUNT(CASE WHEN a.estado = 'Falta' THEN 1 END) AS faltas,
        ROUND(
          (COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(*), 0)), 
          2
        ) AS porcentaje_asistencia
      FROM asistencias a
      INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
      INNER JOIN sedes s ON u.sede_id = s.id_sede
      ${whereClause}
      GROUP BY s.nombre
      ORDER BY s.nombre
    `;

    const result = await pool.query(query, params);

    // Calcular estadísticas globales
    const estadisticas = {
      total_asistencias: result.rows.reduce((sum, r) => sum + parseInt(r.asistencias), 0),
      total_tardanzas: result.rows.reduce((sum, r) => sum + parseInt(r.tardanzas), 0),
      total_faltas: result.rows.reduce((sum, r) => sum + parseInt(r.faltas), 0),
    };

    const total = estadisticas.total_asistencias + estadisticas.total_tardanzas + estadisticas.total_faltas;
    estadisticas.porcentaje_asistencia = total > 0 
      ? ((estadisticas.total_asistencias / total) * 100).toFixed(2) 
      : 0;

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReporteConsolidado:", error);
    res.status(500).json({ 
      message: "Error al generar reporte consolidado",
      error: error.message 
    });
  }
};

// ====================================
// REPORTE POR SEDE ESPECÍFICA
// ====================================
export const generarReportePorSede = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin, sedeId } = req.query;

    if (!sedeId) {
      return res.status(400).json({ message: "Se requiere el ID de la sede" });
    }

    let whereClause = "WHERE u.sede_id = $1";
    let params = [sedeId];

    if (periodo === "personalizado") {
      whereClause += " AND a.fecha BETWEEN $2 AND $3";
      params.push(fechaInicio, fechaFin);
    } else if (periodo === "quincenal") {
      const diaInicio = quincena === "1" ? 1 : 16;
      const diaFin = quincena === "1" ? 15 : new Date(anio, mes, 0).getDate();
      whereClause += ` AND EXTRACT(MONTH FROM a.fecha) = $2 
                       AND EXTRACT(YEAR FROM a.fecha) = $3 
                       AND EXTRACT(DAY FROM a.fecha) BETWEEN $4 AND $5`;
      params.push(mes, anio, diaInicio, diaFin);
    } else {
      whereClause += ` AND EXTRACT(MONTH FROM a.fecha) = $2 
                       AND EXTRACT(YEAR FROM a.fecha) = $3`;
      params.push(mes, anio);
    }

    const query = `
      SELECT 
        u.nombre || ' ' || u.apellidos AS trabajador,
        u.dni,
        r.nombre AS rol,
        COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END) AS dias_presente,
        COUNT(CASE WHEN a.estado = 'Tardanza' THEN 1 END) AS dias_tardanza,
        COUNT(CASE WHEN a.estado = 'Falta' THEN 1 END) AS dias_falta,
        ROUND(
          (COUNT(CASE WHEN a.estado = 'Presente' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(*), 0)), 
          2
        ) AS porcentaje_asistencia
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      LEFT JOIN asistencias a ON u.id_usuario = a.id_usuario
      ${whereClause}
      GROUP BY u.id_usuario, u.nombre, u.apellidos, u.dni, r.nombre
      ORDER BY trabajador
    `;

    const result = await pool.query(query, params);

    // Calcular estadísticas
    const estadisticas = {
      total_asistencias: result.rows.reduce((sum, r) => sum + parseInt(r.dias_presente), 0),
      total_tardanzas: result.rows.reduce((sum, r) => sum + parseInt(r.dias_tardanza), 0),
      total_faltas: result.rows.reduce((sum, r) => sum + parseInt(r.dias_falta), 0),
    };

    const total = estadisticas.total_asistencias + estadisticas.total_tardanzas + estadisticas.total_faltas;
    estadisticas.porcentaje_asistencia = total > 0 
      ? ((estadisticas.total_asistencias / total) * 100).toFixed(2) 
      : 0;

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReportePorSede:", error);
    res.status(500).json({ 
      message: "Error al generar reporte por sede",
      error: error.message 
    });
  }
};

// ====================================
// REPORTE POR TRABAJADOR
// ====================================
export const generarReportePorTrabajador = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin, usuarioId } = req.query;

    if (!usuarioId) {
      return res.status(400).json({ message: "Se requiere el ID del usuario" });
    }

    let whereClause = "WHERE a.id_usuario = $1";
    let params = [usuarioId];

    if (periodo === "personalizado") {
      whereClause += " AND a.fecha BETWEEN $2 AND $3";
      params.push(fechaInicio, fechaFin);
    } else if (periodo === "quincenal") {
      const diaInicio = quincena === "1" ? 1 : 16;
      const diaFin = quincena === "1" ? 15 : new Date(anio, mes, 0).getDate();
      whereClause += ` AND EXTRACT(MONTH FROM a.fecha) = $2 
                       AND EXTRACT(YEAR FROM a.fecha) = $3 
                       AND EXTRACT(DAY FROM a.fecha) BETWEEN $4 AND $5`;
      params.push(mes, anio, diaInicio, diaFin);
    } else {
      whereClause += ` AND EXTRACT(MONTH FROM a.fecha) = $2 
                       AND EXTRACT(YEAR FROM a.fecha) = $3`;
      params.push(mes, anio);
    }

    const query = `
      SELECT 
        TO_CHAR(a.fecha, 'DD/MM/YYYY') AS fecha,
        a.estado,
        TO_CHAR(a.hora_entrada, 'HH24:MI:SS') AS hora_entrada,
        TO_CHAR(a.hora_salida, 'HH24:MI:SS') AS hora_salida,
        a.observaciones
      FROM asistencias a
      ${whereClause}
      ORDER BY a.fecha DESC
    `;

    const result = await pool.query(query, params);

    // Calcular estadísticas
    const estadisticas = {
      total_asistencias: result.rows.filter(r => r.estado === 'Presente').length,
      total_tardanzas: result.rows.filter(r => r.estado === 'Tardanza').length,
      total_faltas: result.rows.filter(r => r.estado === 'Falta').length,
    };

    const total = result.rows.length;
    estadisticas.porcentaje_asistencia = total > 0 
      ? ((estadisticas.total_asistencias / total) * 100).toFixed(2) 
      : 0;

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReportePorTrabajador:", error);
    res.status(500).json({ 
      message: "Error al generar reporte por trabajador",
      error: error.message 
    });
  }
};

// ====================================
// EXPORTAR A EXCEL
// ====================================
export const exportarReporteExcel = async (req, res) => {
  try {
    const { tipoReporte, datos } = req.body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte");

    // Configurar columnas según los datos
    if (datos.length > 0) {
      worksheet.columns = Object.keys(datos[0]).map(key => ({
        header: key.toUpperCase().replace(/_/g, " "),
        key: key,
        width: 20
      }));

      // Agregar filas
      worksheet.addRows(datos);

      // Estilo del encabezado
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0070C0' }
      };

      // Agregar fecha de generación
      worksheet.addRow([]);
      worksheet.addRow([`Generado: ${getFechaPeruFormateada()}`]);
    }

    // Enviar archivo
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error en exportarReporteExcel:", error);
    res.status(500).json({ 
      message: "Error al exportar a Excel",
      error: error.message 
    });
  }
};

// ====================================
// EXPORTAR A PDF
// ====================================
export const exportarReportePDF = async (req, res) => {
  try {
    const { tipoReporte, datos } = req.body;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte_${Date.now()}.pdf`
    );

    doc.pipe(res);

    // Título
    doc.fontSize(20).text("Reporte de Asistencias", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${getFechaPeruFormateada()}`, { align: "right" });
    doc.moveDown();

    // Datos en formato tabla simple
    if (datos.length > 0) {
      const headers = Object.keys(datos[0]);
      
      // Headers
      doc.fontSize(10).font('Helvetica-Bold');
      let yPosition = doc.y;
      headers.forEach((header, i) => {
        doc.text(header.toUpperCase(), 50 + (i * 100), yPosition, { width: 90 });
      });

      doc.moveDown();
      doc.font('Helvetica');

      // Filas
      datos.forEach((row) => {
        yPosition = doc.y;
        headers.forEach((header, i) => {
          doc.text(String(row[header] || '-'), 50 + (i * 100), yPosition, { width: 90 });
        });
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error en exportarReportePDF:", error);
    res.status(500).json({ 
      message: "Error al exportar a PDF",
      error: error.message 
    });
  }
};