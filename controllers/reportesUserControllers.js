// controllers/reportesUser.controller.js
import pool from '../db/db.js';

/**
 * Obtener el último reporte generado de un usuario específico
 * GET /api/reportes/ultimo/:id_usuario
 */
export const getUltimoReporteUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;

    if (!id_usuario) {
      return res.status(400).json({ 
        error: 'El ID del usuario es requerido' 
      });
    }

    // PostgreSQL usa result.rows en lugar de destructuring
    // eviando el mal uso dl los reportes
    const result = await pool.query(
      `SELECT 
        id_reporte,
        id_usuario,
        tipo_reporte,
        fecha_inicio,
        fecha_fin,
        nombre_archivo,
        total_registros,
        fecha_generacion
      FROM reportes_asistencia 
      WHERE id_usuario = $1 
      ORDER BY fecha_generacion DESC 
      LIMIT 1`,
      [id_usuario]
    );

    // Si no hay reportes, devolver null
    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener último reporte:', error);
    res.status(500).json({ 
      error: 'Error al obtener el último reporte',
      detalle: error.message 
    });
  }
};

/**
 * Guardar un nuevo reporte generado
 * POST /api/reportes
 */
export const guardarReporte = async (req, res) => {
  try {
    const { 
      id_usuario, 
      tipo_reporte, 
      fecha_inicio, 
      fecha_fin, 
      nombre_archivo, 
      total_registros 
    } = req.body;

    // Validaciones
    if (!id_usuario || !tipo_reporte || !fecha_inicio || !fecha_fin || !nombre_archivo) {
      return res.status(400).json({ 
        error: 'Faltan campos obligatorios',
        campos_requeridos: ['id_usuario', 'tipo_reporte', 'fecha_inicio', 'fecha_fin', 'nombre_archivo']
      });
    }

    if (!['PDF', 'EXCEL'].includes(tipo_reporte)) {
      return res.status(400).json({ 
        error: 'Tipo de reporte inválido. Debe ser PDF o EXCEL' 
      });
    }

    // Insertar el reporte y devolver el registro insertado (PostgreSQL con RETURNING)
    const result = await pool.query(
      `INSERT INTO reportes_asistencia 
       (id_usuario, tipo_reporte, fecha_inicio, fecha_fin, nombre_archivo, total_registros) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id_usuario, 
        tipo_reporte, 
        fecha_inicio, 
        fecha_fin, 
        nombre_archivo, 
        total_registros || 0
      ]
    );

    res.status(201).json({
      mensaje: 'Reporte guardado exitosamente',
      reporte: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error al guardar reporte:', error);
    res.status(500).json({ 
      error: 'Error al guardar el reporte',
      detalle: error.message 
    });
  }
};

/**
 * Obtener todos los reportes de un usuario (historial completo)
 * GET /api/reportes/usuario/:id_usuario
 */
export const getReportesUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { limite = 10 } = req.query;

    if (!id_usuario) {
      return res.status(400).json({ 
        error: 'El ID del usuario es requerido' 
      });
    }

    const result = await pool.query(
      `SELECT 
        id_reporte,
        id_usuario,
        tipo_reporte,
        fecha_inicio,
        fecha_fin,
        nombre_archivo,
        total_registros,
        fecha_generacion
      FROM reportes_asistencia 
      WHERE id_usuario = $1 
      ORDER BY fecha_generacion DESC 
      LIMIT $2`,
      [id_usuario, parseInt(limite)]
    );

    res.json({
      total: result.rows.length,
      reportes: result.rows
    });

  } catch (error) {
    console.error('❌ Error al obtener reportes del usuario:', error);
    res.status(500).json({ 
      error: 'Error al obtener reportes del usuario',
      detalle: error.message 
    });
  }
};

/**
 * Obtener todos los reportes (para administradores)
 * GET /api/reportes
 */
export const getTodosReportes = async (req, res) => {
  try {
    const { limite = 50 } = req.query;

    const result = await pool.query(
      `SELECT 
        r.id_reporte,
        r.id_usuario,
        r.tipo_reporte,
        r.fecha_inicio,
        r.fecha_fin,
        r.nombre_archivo,
        r.total_registros,
        r.fecha_generacion,
        CONCAT(u.nombre, ' ', u.apellidos) as nombre_completo
      FROM reportes_asistencia r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      ORDER BY r.fecha_generacion DESC 
      LIMIT $1`,
      [parseInt(limite)]
    );

    res.json({
      total: result.rows.length,
      reportes: result.rows
    });

  } catch (error) {
    console.error('❌ Error al obtener todos los reportes:', error);
    res.status(500).json({ 
      error: 'Error al obtener todos los reportes',
      detalle: error.message 
    });
  }
};

/**
 * Eliminar un reporte específico
 * DELETE /api/reportes/:id_reporte
 */
export const eliminarReporte = async (req, res) => {
  try {
    const { id_reporte } = req.params;

    if (!id_reporte) {
      return res.status(400).json({ 
        error: 'El ID del reporte es requerido' 
      });
    }

    const result = await pool.query(
      'DELETE FROM reportes_asistencia WHERE id_reporte = $1 RETURNING *',
      [id_reporte]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Reporte no encontrado' 
      });
    }

    res.json({ 
      mensaje: 'Reporte eliminado exitosamente',
      id_reporte 
    });

  } catch (error) {
    console.error('❌ Error al eliminar reporte:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el reporte',
      detalle: error.message 
    });
  }
};