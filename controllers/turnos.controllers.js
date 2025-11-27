import pool from "../db/db.js";

// 📌 Crear un turno
export const createTurno = async (req, res) => {
  try {
    const { nombre_turno, hora_inicio, hora_fin } = req.body;

    if (!nombre_turno || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    const result = await pool.query(
      "INSERT INTO turnos (nombre_turno, hora_inicio, hora_fin) VALUES ($1, $2, $3) RETURNING id_turno",
      [nombre_turno, hora_inicio, hora_fin]
    );

    res.status(201).json({
      success: true,
      message: "Turno registrado exitosamente",
      id_turno: result.rows[0].id_turno,
    });
  } catch (error) {
    console.error("Error al crear turno:", error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
};

// 📋 Listar todos los turnos
export const getTurnos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM turnos ORDER BY id_turno ASC");
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener turnos",
    });
  }
};

// 📝 Obtener un turno por ID
export const getTurnoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "SELECT * FROM turnos WHERE id_turno = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Turno no encontrado" 
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener turno:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener turno",
    });
  }
};

// ✏️ Actualizar un turno
export const updateTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_turno, hora_inicio, hora_fin } = req.body;

    // Validar que se envíen los datos necesarios
    if (!nombre_turno || !hora_inicio || !hora_fin) {
      return res.status(400).json({ 
        success: false, 
        message: "Faltan datos obligatorios (nombre_turno, hora_inicio, hora_fin)" 
      });
    }

    // Verificar que el turno existe antes de actualizar
    const checkResult = await pool.query(
      "SELECT * FROM turnos WHERE id_turno = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Turno no encontrado" 
      });
    }

    // Actualizar el turno
    const result = await pool.query(
      `UPDATE turnos 
       SET nombre_turno = $1, 
           hora_inicio = $2, 
           hora_fin = $3 
       WHERE id_turno = $4 
       RETURNING *`,
      [nombre_turno, hora_inicio, hora_fin, id]
    );

    res.json({
      success: true,
      message: "Turno actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar turno:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor al actualizar turno" 
    });
  }
};

// 🗑️ Eliminar turno
export const deleteTurno = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay usuarios asignados a este turno
    const checkUsuarios = await pool.query(
      "SELECT COUNT(*) as total FROM usuarios WHERE turno_id = $1",
      [id]
    );

    const totalUsuarios = parseInt(checkUsuarios.rows[0].total);

    if (totalUsuarios > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede eliminar el turno. Hay ${totalUsuarios} usuario(s) asignado(s) a este turno.` 
      });
    }

    const result = await pool.query(
      "DELETE FROM turnos WHERE id_turno = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Turno no encontrado" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Turno eliminado correctamente" 
    });
  } catch (error) {
    console.error("Error al eliminar turno:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor" 
    });
  }
};