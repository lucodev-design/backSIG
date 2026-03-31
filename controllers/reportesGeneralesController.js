// ====================================
// backend/controllers/reportesGeneralesController.js
// ====================================

import pool from "../db/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE_PERU = "America/Lima";

const getFechaPeruFormateada = () => {
  const now = new Date();
  const zonedDate = toZonedTime(now, TIMEZONE_PERU);
  return format(zonedDate, "dd/MM/yyyy HH:mm:ss");
};

// ====================================
// HELPER: Condición de período para WHERE
// ====================================
const buildPeriodoWhere = (
  periodo,
  mes,
  anio,
  quincena,
  fechaInicio,
  fechaFin,
  campoFecha,
  paramOffset,
) => {
  let whereExtra = "";
  const params = [];
  let idx = paramOffset;

  if (periodo === "personalizado") {
    whereExtra = `AND ${campoFecha} BETWEEN $${idx++} AND $${idx++}`;
    params.push(fechaInicio, fechaFin);
  } else if (periodo === "quincenal") {
    const diaInicio = quincena === "1" ? 1 : 16;
    const diaFin =
      quincena === "1" ? 15 : new Date(Number(anio), Number(mes), 0).getDate();
    whereExtra = `
      AND EXTRACT(MONTH FROM ${campoFecha}) = $${idx++}
      AND EXTRACT(YEAR  FROM ${campoFecha}) = $${idx++}
      AND EXTRACT(DAY   FROM ${campoFecha}) BETWEEN $${idx++} AND $${idx++}`;
    params.push(mes, anio, diaInicio, diaFin);
  } else {
    whereExtra = `
      AND EXTRACT(MONTH FROM ${campoFecha}) = $${idx++}
      AND EXTRACT(YEAR  FROM ${campoFecha}) = $${idx++}`;
    params.push(mes, anio);
  }

  return { whereExtra, params };
};

// ====================================
// HELPER: Estadísticas globales
// ====================================
const calcularEstadisticas = (
  rows,
  campoPresente,
  campoTardanza,
  campoFalta,
) => {
  const total_asistencias = rows.reduce(
    (s, r) => s + (parseInt(r[campoPresente]) || 0),
    0,
  );
  const total_tardanzas = rows.reduce(
    (s, r) => s + (parseInt(r[campoTardanza]) || 0),
    0,
  );
  const total_faltas = rows.reduce(
    (s, r) => s + (parseInt(r[campoFalta]) || 0),
    0,
  );
  const total = total_asistencias + total_tardanzas + total_faltas;
  const porcentaje_asistencia =
    total > 0 ? ((total_asistencias / total) * 100).toFixed(2) : "0.00";
  return {
    total_asistencias,
    total_tardanzas,
    total_faltas,
    porcentaje_asistencia,
  };
};

// ====================================
// REPORTE CONSOLIDADO
// ====================================
export const generarReporteConsolidado = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin } = req.query;

    const { whereExtra, params } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "fecha",
      1,
    );

    const query = `
      SELECT
        s.nombre                                                      AS sede,
        COUNT(DISTINCT u.id_usuario)                                  AS total_trabajadores,
        -- ✅ Conteo real por estado
        COUNT(CASE WHEN asis.estado = 'Presente' THEN 1 END)         AS asistencias,
        COUNT(CASE WHEN asis.estado = 'Tardanza' THEN 1 END)         AS tardanzas,
        COUNT(CASE WHEN asis.estado = 'Falta'    THEN 1 END)         AS faltas,
        -- ✅ Porcentaje solo sobre registros reales de asistencia
        ROUND(
          COUNT(CASE WHEN asis.estado = 'Presente' THEN 1 END) * 100.0
          / NULLIF(
              COUNT(CASE WHEN asis.estado = 'Presente' THEN 1 END) +
              COUNT(CASE WHEN asis.estado = 'Tardanza' THEN 1 END) +
              COUNT(CASE WHEN asis.estado = 'Falta'    THEN 1 END),
            0), 2
        )                                                             AS porcentaje_asistencia
      FROM sedes s
      LEFT JOIN usuarios u ON u.sede_id = s.id_sede
      LEFT JOIN (
        SELECT * FROM asistencia WHERE 1=1 ${whereExtra}
      ) asis ON asis.usuario_id = u.id_usuario
      GROUP BY s.id_sede, s.nombre
      ORDER BY s.nombre
    `;

    const result = await pool.query(query, params);
    const estadisticas = calcularEstadisticas(
      result.rows,
      "asistencias",
      "tardanzas",
      "faltas",
    );

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReporteConsolidado:", error);
    res
      .status(500)
      .json({
        message: "Error al generar reporte consolidado",
        error: error.message,
      });
  }
};

// ====================================
// REPORTE POR SEDE
// ====================================
export const generarReportePorSede = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin, sedeId } =
      req.query;

    if (!sedeId)
      return res.status(400).json({ message: "Se requiere el ID de la sede." });

    const { whereExtra, params: periodoParams } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "fecha",
      2,
    );
    const params = [sedeId, ...periodoParams];

    const query = `
      SELECT
        u.nombre || ' ' || u.apellidos                                AS trabajador,
        u.dni,
        r.nombre                                                      AS rol,
        COUNT(CASE WHEN asis.estado = 'Presente'  THEN 1 END)        AS dias_presente,
        COUNT(CASE WHEN asis.estado = 'Tardanza'  THEN 1 END)        AS dias_tardanza,
        COUNT(CASE WHEN asis.estado = 'Falta'     THEN 1 END)        AS dias_falta,
        -- ✅ Porcentaje solo sobre registros reales
        ROUND(
          COUNT(CASE WHEN asis.estado = 'Presente' THEN 1 END) * 100.0
          / NULLIF(
              COUNT(CASE WHEN asis.estado = 'Presente' THEN 1 END) +
              COUNT(CASE WHEN asis.estado = 'Tardanza' THEN 1 END) +
              COUNT(CASE WHEN asis.estado = 'Falta'    THEN 1 END),
            0), 2
        )                                                             AS porcentaje_asistencia
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      LEFT JOIN (
        SELECT * FROM asistencia WHERE 1=1 ${whereExtra}
      ) asis ON asis.usuario_id = u.id_usuario
      WHERE u.sede_id = $1
      GROUP BY u.id_usuario, u.nombre, u.apellidos, u.dni, r.nombre
      ORDER BY trabajador
    `;

    const result = await pool.query(query, params);
    const estadisticas = calcularEstadisticas(
      result.rows,
      "dias_presente",
      "dias_tardanza",
      "dias_falta",
    );

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReportePorSede:", error);
    res
      .status(500)
      .json({
        message: "Error al generar reporte por sede",
        error: error.message,
      });
  }
};

// ====================================
// REPORTE POR TRABAJADOR
// ====================================
export const generarReportePorTrabajador = async (req, res) => {
  try {
    const { mes, anio, periodo, quincena, fechaInicio, fechaFin, usuarioId } =
      req.query;

    if (!usuarioId)
      return res
        .status(400)
        .json({ message: "Se requiere el ID del usuario." });

    const { whereExtra, params: periodoParams } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "a.fecha",
      2,
    );
    const params = [usuarioId, ...periodoParams];

    const query = `
      SELECT
        TO_CHAR(a.fecha,        'DD/MM/YYYY') AS fecha,
        a.estado,
        TO_CHAR(a.hora_entrada, 'HH24:MI:SS') AS hora_entrada,
        TO_CHAR(a.hora_salida,  'HH24:MI:SS') AS hora_salida
      FROM asistencia a
      WHERE a.usuario_id = $1
        ${whereExtra}
      ORDER BY a.fecha DESC
    `;

    const result = await pool.query(query, params);

    // ✅ Conteo correcto directo desde las filas retornadas
    const total_asistencias = result.rows.filter(
      (r) => r.estado === "Presente",
    ).length;
    const total_tardanzas = result.rows.filter(
      (r) => r.estado === "Tardanza",
    ).length;
    const total_faltas = result.rows.filter((r) => r.estado === "Falta").length;
    const total = total_asistencias + total_tardanzas + total_faltas;

    const estadisticas = {
      total_asistencias,
      total_tardanzas,
      total_faltas,
      porcentaje_asistencia:
        total > 0 ? ((total_asistencias / total) * 100).toFixed(2) : "0.00",
    };

    res.json({
      reporte: result.rows,
      estadisticas,
      fechaGeneracion: getFechaPeruFormateada(),
    });
  } catch (error) {
    console.error("Error en generarReportePorTrabajador:", error);
    res
      .status(500)
      .json({
        message: "Error al generar reporte por trabajador",
        error: error.message,
      });
  }
};

// ====================================
// HELPER INTERNO: Re-consultar DB para exportación
// ====================================
const obtenerDatosParaExportacion = async (
  tipoReporte,
  { mes, anio, periodo, quincena, fechaInicio, fechaFin, sedeId, usuarioId },
) => {
  let query, params;

  if (tipoReporte === "consolidado") {
    const { whereExtra, params: p } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "fecha",
      1,
    );
    query = `
      SELECT
        s.nombre AS sede,
        COUNT(DISTINCT u.id_usuario) AS total_trabajadores,
        COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) AS asistencias,
        COUNT(CASE WHEN asis.estado='Tardanza' THEN 1 END) AS tardanzas,
        COUNT(CASE WHEN asis.estado='Falta'    THEN 1 END) AS faltas,
        ROUND(
          COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) * 100.0
          / NULLIF(
              COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) +
              COUNT(CASE WHEN asis.estado='Tardanza' THEN 1 END) +
              COUNT(CASE WHEN asis.estado='Falta'    THEN 1 END),
            0), 2
        ) AS porcentaje_asistencia
      FROM sedes s
      LEFT JOIN usuarios u ON u.sede_id = s.id_sede
      LEFT JOIN (SELECT * FROM asistencia WHERE 1=1 ${whereExtra}) asis ON asis.usuario_id = u.id_usuario
      GROUP BY s.id_sede, s.nombre ORDER BY s.nombre
    `;
    params = p;
  } else if (tipoReporte === "sede") {
    const { whereExtra, params: pp } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "fecha",
      2,
    );
    query = `
      SELECT
        u.nombre||' '||u.apellidos AS trabajador,
        u.dni,
        r.nombre AS rol,
        COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) AS dias_presente,
        COUNT(CASE WHEN asis.estado='Tardanza' THEN 1 END) AS dias_tardanza,
        COUNT(CASE WHEN asis.estado='Falta'    THEN 1 END) AS dias_falta,
        ROUND(
          COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) * 100.0
          / NULLIF(
              COUNT(CASE WHEN asis.estado='Presente' THEN 1 END) +
              COUNT(CASE WHEN asis.estado='Tardanza' THEN 1 END) +
              COUNT(CASE WHEN asis.estado='Falta'    THEN 1 END),
            0), 2
        ) AS porcentaje_asistencia
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      LEFT JOIN (SELECT * FROM asistencia WHERE 1=1 ${whereExtra}) asis ON asis.usuario_id = u.id_usuario
      WHERE u.sede_id = $1
      GROUP BY u.id_usuario, u.nombre, u.apellidos, u.dni, r.nombre ORDER BY trabajador
    `;
    params = [sedeId, ...pp];
  } else {
    // ✅ Sin a.observaciones — columna no existe en la tabla
    const { whereExtra, params: pp } = buildPeriodoWhere(
      periodo,
      mes,
      anio,
      quincena,
      fechaInicio,
      fechaFin,
      "a.fecha",
      2,
    );
    query = `
      SELECT
        TO_CHAR(a.fecha,        'DD/MM/YYYY') AS fecha,
        a.estado,
        TO_CHAR(a.hora_entrada, 'HH24:MI:SS') AS hora_entrada,
        TO_CHAR(a.hora_salida,  'HH24:MI:SS') AS hora_salida
      FROM asistencia a
      WHERE a.usuario_id = $1 ${whereExtra}
      ORDER BY a.fecha DESC
    `;
    params = [usuarioId, ...pp];
  }

  const result = await pool.query(query, params);
  return result.rows;
};

// ====================================
// EXPORTAR A EXCEL
// ====================================
export const exportarReporteExcel = async (req, res) => {
  try {
    const {
      tipoReporte,
      mes,
      anio,
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      sedeId,
      usuarioId,
    } = req.body;

    const datos = await obtenerDatosParaExportacion(tipoReporte, {
      mes,
      anio,
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      sedeId,
      usuarioId,
    });

    if (datos.length === 0)
      return res.status(404).json({ message: "No hay datos para exportar." });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte");

    worksheet.columns = Object.keys(datos[0]).map((key) => ({
      header: key.replace(/_/g, " ").toUpperCase(),
      key,
      width: 22,
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;

    datos.forEach((row) => {
      worksheet.addRow(row).alignment = { vertical: "middle" };
    });

    const totalRows = datos.length + 1;
    const totalCols = worksheet.columns.length;
    for (let r = 1; r <= totalRows; r++) {
      for (let c = 1; c <= totalCols; c++) {
        worksheet.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    worksheet.addRow([]);
    worksheet.addRow([`Generado: ${getFechaPeruFormateada()}`]).font = {
      italic: true,
      color: { argb: "FF666666" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte_${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error en exportarReporteExcel:", error);
    res
      .status(500)
      .json({ message: "Error al exportar a Excel", error: error.message });
  }
};

// ====================================
// EXPORTAR A PDF
// ====================================
export const exportarReportePDF = async (req, res) => {
  try {
    const {
      tipoReporte,
      mes,
      anio,
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      sedeId,
      usuarioId,
    } = req.body;

    const datos = await obtenerDatosParaExportacion(tipoReporte, {
      mes,
      anio,
      periodo,
      quincena,
      fechaInicio,
      fechaFin,
      sedeId,
      usuarioId,
    });

    if (datos.length === 0)
      return res.status(404).json({ message: "No hay datos para exportar." });

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte_${Date.now()}.pdf`,
    );
    doc.pipe(res);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Reporte de Asistencias", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Generado: ${getFechaPeruFormateada()}`, { align: "right" });
    doc.fillColor("#000000").moveDown(0.8);

    const headers = Object.keys(datos[0]);
    const pageWidth = doc.page.width - 80;
    const colWidth = Math.floor(pageWidth / headers.length);
    const cellH = 18;
    const startX = 40;
    let curY = doc.y;

    const drawRow = (values, isBold = false, bgColor = null) => {
      if (bgColor) doc.rect(startX, curY, pageWidth, cellH).fill(bgColor);
      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .fillColor(isBold ? "#FFFFFF" : "#000000");
      values.forEach((val, i) => {
        doc.text(String(val ?? "—"), startX + i * colWidth + 3, curY + 4, {
          width: colWidth - 6,
          ellipsis: true,
          lineBreak: false,
        });
      });
      doc.rect(startX, curY, pageWidth, cellH).strokeColor("#CCCCCC").stroke();
      doc.fillColor("#000000");
      curY += cellH;
      if (curY > doc.page.height - 60) {
        doc.addPage();
        curY = 40;
      }
    };

    drawRow(
      headers.map((h) => h.replace(/_/g, " ").toUpperCase()),
      true,
      "#0070C0",
    );
    datos.forEach((row, idx) => {
      drawRow(
        headers.map((h) => row[h]),
        false,
        idx % 2 === 0 ? "#F5F8FF" : null,
      );
    });

    doc.end();
  } catch (error) {
    console.error("Error en exportarReportePDF:", error);
    res
      .status(500)
      .json({ message: "Error al exportar a PDF", error: error.message });
  }
};
