// tabla.js
import pool from "./db/db.js";  // <-- Ajusta la ruta si tu archivo está en otra carpeta

const verTablaAdmins = async () => {
  try {
    console.log("📌 Conectando a la base de datos...\n");

    // 1. Mostrar columnas de la tabla admins
    console.log("📋 ESTRUCTURA DE LA TABLA 'admins':");
    const estructura = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'admins'
      ORDER BY ordinal_position;
    `);

    console.table(estructura.rows);

    // 2. Listar datos actuales de la tabla admins
    console.log("\n📌 REGISTROS EN LA TABLA 'admins':");
    const datos = await pool.query(`SELECT * FROM admins ORDER BY id ASC;`);

    console.table(datos.rows);

    process.exit(0); // cerrar proceso
  } catch (error) {
    console.error("❌ Error al consultar la tabla admins:", error);
    process.exit(1);
  }
};

verTablaAdmins();
