// backend/controllers/confiGlobalController.js
import pool from "../db/db.js";

// ID Fijo para la configuración global (siempre será el 1)
const CONFIG_ID = 1;

export const getConfiguracionGlobal = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM configuracion_global WHERE id_config = $1", [CONFIG_ID]);

    if (result.rows.length === 0) {
      // Si no existe, intenta insertarla con valores por defecto
      await pool.query(
        `INSERT INTO configuracion_global (id_config) VALUES ($1) ON CONFLICT (id_config) DO NOTHING`,
        [CONFIG_ID]
      );
      // Vuelve a consultar para obtener la configuración recién creada/existente
      const freshResult = await pool.query("SELECT * FROM configuracion_global WHERE id_config = $1", [CONFIG_ID]);
      return res.json(freshResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al obtener configuración global:", err);
    res.status(500).json({ success: false, message: "Error al obtener configuración." });
  }
};


export const updateConfiguracionGlobal = async (req, res) => {
  const {
    tolerancia_min,
    descuento_min,
    tiempo_falta,
    hora_entrada,
    hora_salida,
    dia_descanso,
    hora_inicio_m, // Incluimos campos de turnos si los gestionas en este mismo formulario
    hora_fin_m,
    hora_inicio_t,
    hora_fin_t,
  } = req.body;

  // Validación básica para los campos críticos
  if (tolerancia_min === undefined || descuento_min === undefined || hora_entrada === undefined || hora_salida === undefined) {
    return res.status(400).json({ success: false, message: "Faltan datos obligatorios para la configuración." });
  }

  try {
    await pool.query(
      `UPDATE configuracion_global 
        SET tolerancia_min = $1, 
            descuento_min = $2, 
            tiempo_falta = $3, 
            hora_entrada = $4, 
            hora_salida = $5,
            dia_descanso = $6,
            hora_inicio_m = $7,
            hora_fin_m = $8,
            hora_inicio_t = $9,
            hora_fin_t = $10
        WHERE id_config = $11`,
      [
        tolerancia_min,
        descuento_min,
        tiempo_falta,
        hora_entrada,
        hora_salida,
        dia_descanso || 'Domingo', // Usar un valor por defecto si no viene
        hora_inicio_m,
        hora_fin_m,
        hora_inicio_t,
        hora_fin_t,
        CONFIG_ID
      ]
    );

    res.json({ success: true, message: "✅ Configuración global actualizada correctamente." });
  } catch (err) {
    console.error("❌ Error al actualizar configuración global:", err);
    res.status(500).json({ success: false, message: "Error al actualizar configuración." });
  }
};