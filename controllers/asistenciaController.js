// backend/controllers/asistenciaController.js
import pool from "../db/db.js";
import moment from "moment-timezone";

// ---------------------------------------------
// 🧭 Funciones auxiliares para CÁLCULO DE MINUTOS
// ---------------------------------------------

/**
 * Calcula el estado de la entrada y los minutos de retraso fuera de la tolerancia.
 * @param {Date} horaActual - Hora actual como objeto Date
 * @param {string} horaEntradaConfig - Hora configurada (formato "HH:mm")
 * @param {number} toleranciaMinutos - Minutos de tolerancia
 * @returns {object} { estado: string, minutosDescuento: number }
 */
const calcularMinutosRetrasoEntrada = (horaActual, horaEntradaConfig, toleranciaMinutos) => {
  // ✅ Convertir horaActual a moment con zona horaria de Lima
  const momentActual = moment(horaActual).tz("America/Lima");
  
  // ✅ Crear la hora configurada usando la fecha actual de Lima
  const [hConfig, mConfig] = horaEntradaConfig.split(":").map(Number);
  const momentConfig = moment.tz("America/Lima")
    .hours(hConfig)
    .minutes(mConfig)
    .seconds(0)
    .milliseconds(0);

  // ✅ Calcular límite de tolerancia
  const momentLimiteTolerancia = momentConfig.clone().add(toleranciaMinutos, 'minutes');

  console.log("🕐 Hora actual:", momentActual.format("HH:mm:ss"));
  console.log("🕐 Hora entrada config:", momentConfig.format("HH:mm:ss"));
  console.log("🕐 Límite tolerancia:", momentLimiteTolerancia.format("HH:mm:ss"));

  // ✅ Comparaciones con moment
  if (momentActual.isSameOrBefore(momentConfig)) {
    return { estado: "A Tiempo", minutosDescuento: 0 };
  }
  
  if (momentActual.isSameOrBefore(momentLimiteTolerancia)) {
    return { estado: "Tolerancia", minutosDescuento: 0 };
  }

  // ✅ Calcular minutos de retraso
  const minutosRetraso = Math.ceil(momentActual.diff(momentLimiteTolerancia, 'minutes', true));

  console.log(`⏱️ Minutos de retraso: ${minutosRetraso}`);

  return { estado: "Tarde/Descuento", minutosDescuento: minutosRetraso };
};

/**
 * Calcula el estado de la salida y los minutos de adelanto fuera de la tolerancia.
 * @param {Date} horaActual - Hora actual como objeto Date
 * @param {string} horaSalidaConfig - Hora configurada (formato "HH:mm")
 * @param {number} toleranciaMinutos - Minutos de tolerancia
 * @returns {object} { estado: string, minutosDescuento: number }
 */
const calcularMinutosAdelantoSalida = (horaActual, horaSalidaConfig, toleranciaMinutos) => {
  // ✅ Convertir horaActual a moment con zona horaria de Lima
  const momentActual = moment(horaActual).tz("America/Lima");
  
  // ✅ Crear la hora configurada usando la fecha actual de Lima
  const [hConfig, mConfig] = horaSalidaConfig.split(":").map(Number);
  const momentConfig = moment.tz("America/Lima")
    .hours(hConfig)
    .minutes(mConfig)
    .seconds(0)
    .milliseconds(0);

  // ✅ Calcular límite de tolerancia (antes de la hora de salida)
  const momentLimiteTolerancia = momentConfig.clone().subtract(toleranciaMinutos, 'minutes');

  console.log("🕐 Hora actual:", momentActual.format("HH:mm:ss"));
  console.log("🕐 Hora salida config:", momentConfig.format("HH:mm:ss"));
  console.log("🕐 Límite tolerancia:", momentLimiteTolerancia.format("HH:mm:ss"));

  // ✅ Comparaciones con moment
  if (momentActual.isSameOrAfter(momentConfig)) {
    return { estado: "Salida Normal", minutosDescuento: 0 };
  }
  
  if (momentActual.isSameOrAfter(momentLimiteTolerancia)) {
    return { estado: "Salida Tolerada", minutosDescuento: 0 };
  }

  // ✅ Calcular minutos de adelanto
  const minutosAdelanto = Math.ceil(momentLimiteTolerancia.diff(momentActual, 'minutes', true));

  console.log(`⏱️ Minutos de adelanto: ${minutosAdelanto}`);

  return { estado: "Salida Temprana/Descuento", minutosDescuento: minutosAdelanto };
};

// ---------------------------------------------
// 🔑 Función principal: marcarAsistencia
// ---------------------------------------------
export const marcarAsistencia = async (req, res) => {
  try {
    const { qr_code, turno } = req.body;
    console.log("📥 [INFO] Solicitud de marcar asistencia:", req.body);

    if (!qr_code || !turno) {
      return res.status(400).json({ 
        success: false, 
        message: "Faltan datos obligatorios (qr_code o turno)" 
      });
    }

    // 1️⃣ Buscar usuario con su turno asignado
    const userResult = await pool.query(
      `SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellidos, 
        u.dni,
        u.turno_id,
        t.nombre_turno
      FROM usuarios u
      LEFT JOIN turnos t ON u.turno_id = t.id_turno
      WHERE u.qr_code = $1`,
      [qr_code]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado para el QR proporcionado" 
      });
    }

    const usuario = userResult.rows[0];
    const usuario_id = usuario.id_usuario;
    const nombreUsuario = usuario.nombre;
    const apellidosUsuario = usuario.apellidos;
    const dniUsuario = usuario.dni;
    const turnoAsignado = usuario.nombre_turno;

    console.log("👤 Usuario encontrado:", {
      nombre: nombreUsuario,
      turnoAsignado: turnoAsignado,
      turnoQR: turno
    });

    // 2️⃣ Validar que el usuario tenga turno asignado
    if (!turnoAsignado) {
      return res.status(400).json({
        success: false,
        message: `❌ El usuario ${nombreUsuario} no tiene un turno asignado. Contacte al administrador.`,
        usuario: {
          nombre: nombreUsuario,
          apellidos: apellidosUsuario,
          dni: dniUsuario,
          turno: turno,
          estado: "Sin turno asignado"
        }
      });
    }

    // Normalizar nombres de turnos para comparación
    const turnoAsignadoNormalizado = turnoAsignado.toLowerCase().trim();

    console.log("🔍 Turno asignado del usuario:", turnoAsignadoNormalizado);

    // 3️⃣ DETERMINAR SI ES TIEMPO COMPLETO
    const esTiempoCompleto = turnoAsignadoNormalizado.includes('completo') || 
                             turnoAsignadoNormalizado.includes('tiempo');

    console.log("⏰ ¿Es tiempo completo?", esTiempoCompleto);

    // 4️⃣ Obtener configuración global CON horarios de turnos
    const configResult = await pool.query(
      `SELECT 
        tolerancia_min, 
        descuento_min,
        hora_entrada,
        hora_salida,
        hora_inicio_m,
        hora_fin_m,
        hora_inicio_t,
        hora_fin_t
      FROM configuracion_global 
      LIMIT 1`
    );

    if (configResult.rows.length === 0) {
      return res.status(500).json({ 
        success: false, 
        message: "No se encontró la configuración del administrador" 
      });
    }

    const config = configResult.rows[0];
    const toleranciaMinutos = parseInt(config.tolerancia_min || 5);
    const costoPorMinuto = parseFloat(config.descuento_min || 0);

    // 5️⃣ DETERMINAR HORARIOS SEGÚN EL TURNO ASIGNADO DEL USUARIO
    let horaEntradaTurno, horaSalidaTurno;

    if (esTiempoCompleto) {
      horaEntradaTurno = config.hora_entrada || "07:00";
      horaSalidaTurno = config.hora_salida || "19:00";
      console.log("📋 Usando horarios de TIEMPO COMPLETO (globales)");
    } else if (turnoAsignadoNormalizado === 'mañana') {
      horaEntradaTurno = config.hora_inicio_m || "07:00";
      horaSalidaTurno = config.hora_fin_m || "14:00";
      console.log("📋 Usando horarios de MAÑANA");
    } else if (turnoAsignadoNormalizado === 'tarde') {
      horaEntradaTurno = config.hora_inicio_t || "14:00";
      horaSalidaTurno = config.hora_fin_t || "20:00";
      console.log("📋 Usando horarios de TARDE");
    } else {
      horaEntradaTurno = config.hora_entrada || "07:00";
      horaSalidaTurno = config.hora_salida || "19:00";
      console.log("📋 Usando horarios FALLBACK (globales)");
    }

    console.log(`📋 Turno: ${turnoAsignado} | Entrada: ${horaEntradaTurno} | Salida: ${horaSalidaTurno}`);

    // ✅ OBTENER FECHA Y HORA ACTUAL DE LIMA
    const momentLima = moment().tz("America/Lima");
    const fechaActual = momentLima.format("YYYY-MM-DD");
    const horaActual = momentLima.toDate();

    console.log("📅 Fecha actual (Lima):", fechaActual);
    console.log("⏰ Hora actual (Lima):", momentLima.format("YYYY-MM-DD HH:mm:ss"));

    // 6️⃣ Verificar asistencia existente
    const asistenciaResult = await pool.query(
      "SELECT * FROM asistencia WHERE usuario_id = $1 AND fecha = $2",
      [usuario_id, fechaActual]
    );

    // ----------------------------------------------------
    // --- LÓGICA DE ENTRADA (No hay registro previo) ---
    // ----------------------------------------------------
    if (asistenciaResult.rows.length === 0) {
      const { estado, minutosDescuento } = calcularMinutosRetrasoEntrada(
        horaActual,
        horaEntradaTurno,
        toleranciaMinutos
      );

      const descuentoMonetario = minutosDescuento * costoPorMinuto; 

      await pool.query(
        `INSERT INTO asistencia 
          (usuario_id, fecha, hora_entrada, estado, turno, descuento) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [usuario_id, fechaActual, horaActual, estado, turnoAsignado, descuentoMonetario]
      );

      console.log(`✅ Ingreso registrado para: ${nombreUsuario} - Turno: ${turnoAsignado} - Estado: ${estado}. Descuento: S/${descuentoMonetario.toFixed(2)}`);
      
      return res.json({ 
        success: true, 
        message: `✅ Ingreso registrado para ${nombreUsuario}. Estado: ${estado}`,
        usuario: {
          nombre: nombreUsuario,
          apellidos: apellidosUsuario,
          dni: dniUsuario,
          turno: turnoAsignado,
          estado: estado,
          descuento: descuentoMonetario.toFixed(2)
        }
      });
    }

    // ----------------------------------------------------
    // --- LÓGICA DE SALIDA (Registro de entrada existente) ---
    // ----------------------------------------------------
    const registro = asistenciaResult.rows[0];

    if (registro.hora_salida) {
      return res.status(400).json({ 
        success: false, 
        message: "❌ El usuario ya registró su salida hoy.",
        usuario: {
          nombre: nombreUsuario,
          apellidos: apellidosUsuario,
          dni: dniUsuario,
          turno: turnoAsignado,
          estado: "Ya registrado"
        }
      });
    }

    const { estado: estadoSalida, minutosDescuento: minutosDescuentoSalida } = calcularMinutosAdelantoSalida(
      horaActual,
      horaSalidaTurno,
      toleranciaMinutos
    );

    const descuentoSalidaMonetario = minutosDescuentoSalida * costoPorMinuto;
    const descuentoAnterior = parseFloat(registro.descuento || 0);
    const descuentoFinalSalida = descuentoAnterior + descuentoSalidaMonetario;

    await pool.query(
      "UPDATE asistencia SET hora_salida = $1, estado = $2, descuento = $3 WHERE id = $4",
      [horaActual, estadoSalida, descuentoFinalSalida, registro.id]
    );

    console.log(`✅ Salida registrada para: ${nombreUsuario} - Turno: ${turnoAsignado} - Estado: ${estadoSalida}. Descuento total: S/${descuentoFinalSalida.toFixed(2)}`);
    
    return res.json({ 
      success: true, 
      message: `✅ Salida registrada para ${nombreUsuario}. Estado: ${estadoSalida}`,
      usuario: {
        nombre: nombreUsuario,
        apellidos: apellidosUsuario,
        dni: dniUsuario,
        turno: turnoAsignado,
        estado: estadoSalida,
        descuento: descuentoFinalSalida.toFixed(2)
      }
    });

  } catch (error) {
    console.error("❌ Error al marcar asistencia:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al registrar la asistencia" 
    });
  }
};

// ----------- LISTAR LA ASISTENCIA DE CADA TRABAJADOR ------------------
export const getAsistenciaByUser = async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const result = await pool.query(
      `SELECT 
          a.id,
          a.fecha,
          a.hora_entrada,
          a.hora_salida,
          a.estado,
          a.descuento,
          a.turno,
          u.nombre,
          u.apellidos,
          t.nombre_turno
        FROM asistencia a
        INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
        LEFT JOIN turnos t ON u.turno_id = t.id_turno
        WHERE a.usuario_id = $1
        ORDER BY a.fecha DESC`,
      [id_usuario]
    );

    const turnoUsuario = result.rows.length > 0 ? result.rows[0].nombre_turno : null;

    res.json({
      asistencias: result.rows,
      nombre_turno: turnoUsuario
    });

  } catch (error) {
    console.error("❌ Error al obtener asistencias:", error);
    res.status(500).json({ error: "Error al obtener asistencias" });
  }
};

// ----------- OBTENER CONTEO DIARIO DE ASISTENCIAS ------------------
export const getConteoDiario = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    console.log(`📊 Obteniendo conteo de asistencias para la fecha: ${fecha}`);

    const result = await pool.query(
      `SELECT COUNT(*) as total 
       FROM asistencia 
       WHERE fecha = $1`,
      [fecha]
    );

    const total = parseInt(result.rows[0].total) || 0;

    console.log(`✅ Total de asistencias encontradas: ${total}`);

    res.json({ 
      success: true, 
      fecha: fecha,
      total: total 
    });

  } catch (error) {
    console.error("❌ Error al obtener conteo diario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener el conteo de asistencias",
      total: 0
    });
  }
};