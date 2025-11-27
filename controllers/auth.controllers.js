import pool from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Realizamos la importacion de moment para usarlo en el controlador de las asistencias
// import moment from "moment-timezone";



// lo ponemos en registroUserController.js ==> regiterUser
// Creamos sus Rutas dentro de routes con "registroUser.routes.js"
// Y lo agregamos dentro del server.js --> para su correcta inportacion a la api del frontend --> Conectarlo de 
// forma correcta para evitar errores de coneccion






// ============== SEDES =========================
// ---------------- CREAR SEDE ----------------
export const createSede = async (req, res) => {
  try {
    const { nombre, direccion } = req.body;
    if (!nombre || !direccion)
      return res.status(400).json({ success: false, message: "Faltan datos" });

    const { rows } = await pool.query(
      "INSERT INTO sedes (nombre, direccion) VALUES ($1, $2) RETURNING id_sede, nombre, direccion",
      [nombre, direccion]
    );

    res.json({ success: true, sede: rows[0] });
  } catch (err) {
    console.error("Error en createSede:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};// ---------------- LISTAR SEDES ----------------
export const getSedes = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id_sede, nombre, direccion FROM sedes ORDER BY id_sede");
    res.json(rows);
  } catch (err) {
    console.error("Error en getSedes:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};
// ---------------- EDITAR SEDE ----------------
export const updateSede = async (req, res) => {
  try {
    const { id_sede } = req.params;
    const { nombre, direccion } = req.body;

    if (!nombre || !direccion) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios",
      });
    }

    const { rows } = await pool.query(
      `UPDATE sedes 
       SET nombre = $1, direccion = $2 
       WHERE id_sede = $3 
       RETURNING id_sede, nombre, direccion`,
      [nombre, direccion, id_sede]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "La sede no existe" });
    }

    res.json({ success: true, sede: rows[0] });
  } catch (err) {
    console.error("Error en updateSede:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};
// ---------------- ELIMINAR SEDE ----------------
export const deleteSede = async (req, res) => {
  try {
    const { id_sede } = req.params;

    const { rowCount } = await pool.query(
      "DELETE FROM sedes WHERE id_sede = $1",
      [id_sede]
    );

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "La sede no existe",
      });
    }

    res.json({ success: true, message: "Sede eliminada correctamente" });
  } catch (err) {
    console.error("Error en deleteSede:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};



// ---------------- LOGIN USUARIO ----------------
// // ---------------- LOGIN USUARIO ----------------
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validar datos
//     if (!email || !password) {
//       console.log("Login fallido: faltan credenciales");
//       return res
//         .status(400)
//         .json({ success: false, message: "Faltan credenciales" });
//     }

//     // Buscar usuario y su rol
//     const query = `
//       SELECT 
//         u.id_usuario,
//         u.nombre,
//         u.apellidos,
//         u.email,
//         u.password,
//         u.rol_id,
//         r.nombre AS rol,
//         u.sede_id,
//         s.nombre AS sede
//       FROM usuarios u
//       JOIN roles r ON u.rol_id = r.id_rol
//       JOIN sedes s ON u.sede_id = s.id_sede
//       WHERE u.email = $1
//     `;

//     const { rows } = await pool.query(query, [email]);

//     if (rows.length === 0) {
//       console.log(`Login fallido: usuario no encontrado (${email})`);
//       return res
//         .status(401)
//         .json({ success: false, message: "Usuario no encontrado" });
//     }

//     const user = rows[0];

//     // Comparar contraseñas
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       console.log(`Login fallido: contraseña incorrecta (${email})`);
//       return res
//         .status(401)
//         .json({ success: false, message: "Contraseña incorrecta" });
//     }

//     // Crear token JWT
//     const token = jwt.sign(
//       {
//         id: user.id_usuario,
//         email: user.email,
//         rol: user.rol,    
//         rol_id: user.rol_id,
//         sede_id: user.sede_id,
//       },
//       process.env.JWT_SECRET || "secretkey",
//       { expiresIn: "2h" }
//     );

//     console.log(`Login exitoso: ${user.nombre} (${user.rol})`);

//     // Responder
//     res.json({
//       success: true,
//       message: `Login exitoso. Bienvenido ${user.nombre}`,
//       token,
//       user: {
//         id: user.id_usuario,
//         nombre: user.nombre,
//         apellidos: user.apellidos,
//         email: user.email,
//         rol_id: user.rol_id,
//         rol: user.rol,
//         sede_id: user.sede_id,
//         sede: user.sede,
//       },
//     });
//   } catch (err) {
//     // Captura de errores inesperados
//     console.error("Error inesperado en loginUser:", err);
//     res
//       .status(500)
//       .json({ success: false, message: "Error en el servidor", error: err.message });
//   }
// };

// alternativa para usar las tablas de Admins y usuarios para el login
// ---------------- LOGIN USUARIO / ADMIN ----------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Faltan credenciales",
      });
    }

    // -------------------------------
    // 1️⃣ BUSCAR EN TABLA ADMINS
    // -------------------------------
    const queryAdmin = `
      SELECT 
        id,
        nombre,
        apellidos,
        email,
        password,
        rol,
        sede_id,
        activo
      FROM admins
      WHERE email = $1 AND activo = true
      LIMIT 1
    `;

    const adminResult = await pool.query(queryAdmin, [email]);

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];

      // Comparar contraseñas
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Contraseña incorrecta",
        });
      }

      // Crear token JWT
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          rol: admin.rol,
          tipo: "admin",
          sede_id: admin.sede_id,
        },
        process.env.JWT_SECRET || "secretkey",
        { expiresIn: "3h" }
      );

      // Respuesta para Admin
      return res.json({
        success: true,
        message: `Bienvenido administrador ${admin.nombre}`,
        token,
        user: {
          id: admin.id, // Para el admin, el ID principal es 'id'
          nombre: admin.nombre,
          apellidos: admin.apellidos,
          email: admin.email,
          rol: admin.rol,
          sede_id: admin.sede_id,
          tipo: "admin",
        },
      });
    }

    // -------------------------------
    // 2️⃣ BUSCAR EN TABLA USUARIOS (TRABAJADORES)
    // -------------------------------
    const queryUser = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellidos,
        u.email,
        u.password,
        u.rol_id,
        r.nombre AS rol,
        u.sede_id,
        s.nombre AS sede
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id_rol
      JOIN sedes s ON u.sede_id = s.id_sede
      WHERE u.email = $1
    `;

    const userResult = await pool.query(queryUser, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const user = userResult.rows[0];

    // Comparar contraseñas
    const isMatchUser = await bcrypt.compare(password, user.password);
    if (!isMatchUser) {
      return res.status(401).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    // Token JWT trabajador
    const tokenTrabajador = jwt.sign(
      {
        id: user.id_usuario,
        email: user.email,
        rol: user.rol,
        rol_id: user.rol_id,
        sede_id: user.sede_id,
        tipo: "usuario",
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "3h" }
    );

    // Respuesta para Trabajador (Usuario)
    return res.json({
      success: true,
      message: `Bienvenido ${user.nombre}`,
      token: tokenTrabajador,
      user: {
        // 🔥 CORRECCIÓN: Agregar id_usuario explícitamente
        id_usuario: user.id_usuario, 
        id: user.id_usuario, // Mantenemos 'id' para consistencia si es necesario
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        rol: user.rol,
        rol_id: user.rol_id,
        sede_id: user.sede_id,
        sede: user.sede,
        tipo: "usuario",
      },
    });

  } catch (err) {
    console.error("Error en loginUser:", err);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: err.message,
    });
  }
};




// // ---------------- GET USERS ----------------
// export const getUsers = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT 
//         u.id_usuario, 
//         u.nombre, 
//         u.apellidos, 
//         u.dni, 
//         u.email, 
//         r.nombre AS rol, 
//         s.nombre AS sede, 
//         u.qr_code,
//         t.id_turno,
//         t.nombre_turno
//        FROM usuarios u
//        JOIN roles r ON u.rol_id = r.id_rol
//        JOIN sedes s ON u.sede_id = s.id_sede
//        LEFT JOIN turnos t ON u.turno_id = t.id_turno
//        ORDER BY u.id_usuario ASC`
//     );

//     res.json(result.rows);
//   } catch (error) {
//     console.error("❌ Error en getUsers:", error);
//     res.status(500).json({ message: "Error al obtener usuarios" });
//   }
// };



// // Eliminar usuario
// export const deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params; // viene de la URL /users/:id

//     // Eliminamos el usuario
//     const result = await pool.query(
//       "DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *",
//       [id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Usuario no encontrado" });
//     }

//     // Respuesta con el usuario eliminado
//     res.json({
//       message: "✅ Usuario eliminado correctamente",
//       usuario: result.rows[0],
//     });
//   } catch (err) {
//     console.error("❌ Error al eliminar usuario:", err.message);
//     res.status(500).json({ message: "Error interno del servidor" });
//   }
// };

// // Actualizar usuario
// export const updateUser = async (req, res) => {
//   try {
//     const { id } = req.params; // viene de la URL /users/:id
//     const { nombre, apellidos, dni, email, rol_id, sede_id, turno_id } = req.body;

//     const result = await pool.query(
//       `UPDATE usuarios 
//        SET nombre = $1, apellidos = $2, dni = $3, email = $4, rol_id = $5, sede_id = $6, turno_id = $7
//        WHERE id_usuario = $8 RETURNING *`,
//       [nombre, apellidos, dni, email, rol_id, sede_id, turno_id || null, id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Usuario no encontrado" });
//     }

//     res.json({
//       message: "✅ Usuario actualizado correctamente",
//       usuario: result.rows[0],
//     });
//   } catch (err) {
//     console.error("❌ Error al actualizar usuario:", err);
//     res.status(500).json({ message: "Error interno del servidor" });
//   }
// };



//  ____________________________________________________
// |___________________________________________________|
// ------------- Para administradores ------------------
// // 🔹 Registrar un nuevo admin
// export const registerAdmin = async (req, res) => {
//   try {
//     const { nombre, apellidos, correo, contrasena, rol, sede_id } = req.body;
//     if (!nombre || !correo || !contrasena || !rol) {
//       return res.status(400).json({ mensaje: "Faltan datos obligatorios" });
//     }

//     const hash = await bcrypt.hash(contrasena, 10);
//     const query = `
//       INSERT INTO admins (nombre, apellidos, correo, contrasena, rol, sede_id)
//       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, correo, rol;
//     `;
//     const values = [nombre, apellidos, correo, hash, rol, sede_id || null];
//     const result = await pool.query(query, values);

//     res.status(201).json({ mensaje: "✅ Admin registrado correctamente", admin: result.rows[0] });
//   } catch (error) {
//     console.error("❌ Error al registrar admin:", error);
//     res.status(500).json({ mensaje: "Error interno del servidor" });
//   }
// };

// // 🔹 Login de admin
// export const loginAdmin = async (req, res) => {
//   try {
//     const { correo, contrasena } = req.body;
//     if (!correo || !contrasena) {
//       return res.status(400).json({ mensaje: "Faltan datos" });
//     }

//     const query = "SELECT * FROM admins WHERE correo = $1 AND activo = TRUE";
//     const result = await pool.query(query, [correo]);

//     if (result.rowCount === 0)
//       return res.status(404).json({ mensaje: "Admin no encontrado" });

//     const admin = result.rows[0];
//     const coincide = await bcrypt.compare(contrasena, admin.contrasena);
//     if (!coincide)
//       return res.status(401).json({ mensaje: "Contraseña incorrecta" });

//     const token = jwt.sign(
//       { id: admin.id, rol: admin.rol },
//       process.env.JWT_SECRET,
//       { expiresIn: "8h" }
//     );

//     res.json({ mensaje: " Login exitoso", token, admin });
//   } catch (error) {
//     console.error("❌ Error en login:", error);
//     res.status(500).json({ mensaje: "Error interno del servidor" });
//   }
// };

// 🔹 Listar todos los admins
// export const getAdmins = async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, nombre, apellidos, correo, rol, activo, creado_en FROM admins ORDER BY id ASC");
//     res.json(result.rows);
//   } catch (error) {
//     console.error("❌ Error al obtener admins:", error);
//     res.status(500).json({ mensaje: "Error interno del servidor" });
//   }
// };


// =====================================================
// =============== CONFIGURACIONES ADMIN ===============
// =====================================================

// === 🔹 FERIADOS ===
export const addFeriado = async (req, res) => {
  try {
    const { fecha, descripcion } = req.body;

    if (!fecha || !descripcion) {
      return res.status(400).json({ mensaje: " Faltan datos (fecha o descripción)" });
    }

    const result = await pool.query(
      `INSERT INTO feriados (fecha, descripcion)
       VALUES ($1, $2)
       RETURNING id_feriado, fecha, descripcion`,
      [fecha, descripcion]
    );

    res.status(201).json({
      mensaje: " Feriado agregado correctamente",
      feriado: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error en addFeriado:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

export const getFeriados = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id_feriado, fecha, descripcion
       FROM feriados
       ORDER BY fecha ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getFeriados:", error);
    res.status(500).json({ mensaje: "Error al obtener feriados" });
  }
};

export const deleteFeriado = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM feriados WHERE id_feriado = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: "Feriado no encontrado" });
    }
    res.json({ mensaje: " Feriado eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error en deleteFeriado:", error);
    res.status(500).json({ mensaje: "Error al eliminar feriado" });
  }
};

// === 🔹 TURNOS ===
export const addTurno = async (req, res) => {
  try {
    const { nombre_turno, hora_inicio, hora_fin } = req.body;

    if (!nombre_turno || !hora_inicio || !hora_fin) {
      return res.status(400).json({ mensaje: "⚠️ Faltan datos obligatorios" });
    }

    const result = await pool.query(
      `INSERT INTO turnos (nombre_turno, hora_inicio, hora_fin)
       VALUES ($1, $2, $3)
       RETURNING id_turno, nombre_turno, hora_inicio, hora_fin`,
      [nombre_turno, hora_inicio, hora_fin]
    );

    res.status(201).json({
      mensaje: " Turno agregado correctamente",
      turno: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error en addTurno:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// export const getTurnos = async (req, res) => {
//   try {
//     const { rows } = await pool.query(
//       "SELECT id_turno, nombre_turno, hora_inicio, hora_fin FROM turnos ORDER BY id_turno ASC"
//     );
//     res.json(rows);
//   } catch (error) {
//     console.error(" Error en getTurnos:", error);
//     res.status(500).json({ mensaje: "Error al obtener turnos" });
//   }
// };

export const deleteTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM turnos WHERE id_turno = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: "Turno no encontrado" });
    }
    res.json({ mensaje: " Turno eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error en deleteTurno:", error);
    res.status(500).json({ mensaje: "Error al eliminar turno" });
  }
};

// === 🔹 CONFIGURACIÓN GLOBAL ===
// === CONFIGURACIÓN GLOBAL ===

// // Obtener configuración global
// export const getConfig = async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM configuracion_global WHERE id_config = 1");
//     if (result.rows.length === 0)
//       return res.status(404).json({ mensaje: "Configuración no encontrada" });
//     res.json(result.rows[0]);
//     console.log("error");
//   } catch (err) {
//     console.error("Error al obtener configuración:", err);
//     res.status(500).json({ mensaje: "Error al obtener configuración" });
    
//   }
// };

// Actualizar configuración global
// Actualizar configuración global
export const updateConfig = async (req, res) => {
  const {
    tolerancia_min,
    descuento_min,
    hora_inicio_m,
    hora_fin_m,
    hora_inicio_t,
    hora_fin_t,
    dia_descanso,
    hora_entrada,
    hora_salida,
  } = req.body;

  try {
    await pool.query(
      `UPDATE configuracion_global 
       SET tolerancia_min = $1, descuento_min = $2, hora_inicio_m = $3, hora_fin_m = $4, 
           hora_inicio_t = $5, hora_fin_t = $6, dia_descanso = $7,
           hora_entrada = $8, hora_salida = $9
       WHERE id_config = 1`,
      [
        tolerancia_min,
        descuento_min,
        hora_inicio_m,
        hora_fin_m,
        hora_inicio_t,
        hora_fin_t,
        dia_descanso,
        hora_entrada,
        hora_salida,
      ]
    );
    res.json({ mensaje: " Configuración actualizada correctamente" });
  } catch (err) {
    console.error("Error al actualizar configuración:", err);
    res.status(500).json({ mensaje: "Error al actualizar configuración" });
  }
};

// // ============ TURNOS CONFIURACIONES ===================
// export const updateTurno = async (req, res) => {
//   const { id_turno } = req.params;
//   const { hora_inicio, hora_fin } = req.body;

//   try {
//     await pool.query(
//       "UPDATE turnos SET hora_inicio = $1, hora_fin = $2 WHERE id_turno = $3",
//       [hora_inicio, hora_fin, id_turno]
//     );
//     res.status(200).json({ mensaje: " Turno actualizado correctamente" });
//   } catch (error) {
//     console.error(" Error al actualizar turno:", error.message);
//     res.status(500).json({ mensaje: "Error al actualizar turno" });
//   }
// };



// // ------------------ CONFIGURACIÓN GLOBAL ------------------
// export const getConfiguracionGlobal = async (req, res) => {
//   try {
//     const [rows] = await pool.query("SELECT * FROM configuracion_global LIMIT 1");
//     res.json(rows[0]);
//   } catch (error) {
//     console.error(" Error al obtener configuración global:", error);
//     res.status(500).json({ message: "Error al obtener configuración global" });
//   }
// };

export const updateConfiguracionGlobal = async (req, res) => {
  try {
    const {
      tolerancia_min,
      descuento_min,
      dia_descanso,
      tiempo_falta,
    } = req.body;

    await pool.query(
      `UPDATE configuracion_global 
       SET tolerancia_min=?, descuento_min=?, dia_descanso=?, tiempo_falta=? 
       WHERE id_config=1`,
      [tolerancia_min, descuento_min, dia_descanso, tiempo_falta]
    );

    res.json({ message: "Configuración global actualizada correctamente" });
  } catch (error) {
    console.error(" Error al actualizar configuración global:", error);
    res.status(500).json({ message: "Error al actualizar configuración global" });
  }
};

// ------------------ TURNOS ------------------
export const getTurnos = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM turnos");
    res.json(rows);
  } catch (error) {
    console.error(" Error al obtener turnos:", error);
    res.status(500).json({ message: "Error al obtener turnos" });
  }
};

export const updateTurno = async (req, res) => {
  try {
    const { id_turno, nombre_turno, hora_inicio, hora_fin } = req.body;

    if (!id_turno || !hora_inicio || !hora_fin)
      return res.status(400).json({ message: "Datos incompletos" });

    await pool.query(
      `UPDATE turnos 
       SET nombre_turno=?, hora_inicio=?, hora_fin=? 
       WHERE id_turno=?`,
      [nombre_turno, hora_inicio, hora_fin, id_turno]
    );

    res.json({ message: "Turno actualizado correctamente" });
  } catch (error) {
    console.error(" Error al actualizar turno:", error);
    res.status(500).json({ message: "Error al actualizar turno" });
  }
};
