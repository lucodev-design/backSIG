// // testDB.js
// import pool from "./db/db.js";

// const verEsquemaTabla = async () => {
//   try {
//     console.log("📋 ESTRUCTURA DE LA TABLA 'asistencia'");

//     // 1️⃣ Columnas con tipos de datos
//     const columnas = await pool.query(`
//       SELECT 
//         column_name AS "columna",
//         data_type AS "tipo_dato",
//         is_nullable AS "permite_null",
//         column_default AS "valor_por_defecto"
//       FROM information_schema.columns
//       WHERE table_name = 'asistencia'
//       ORDER BY ordinal_position;
//     `);

//     console.log("\n🧱 Columnas:");
//     console.table(columnas.rows);

//     // 2️⃣ Claves primarias
//     const clavesPrimarias = await pool.query(`
//       SELECT 
//         kcu.column_name AS "columna_pk"
//       FROM information_schema.table_constraints tc
//       JOIN information_schema.key_column_usage kcu
//         ON tc.constraint_name = kcu.constraint_name
//       WHERE tc.table_name = 'asistencia' AND tc.constraint_type = 'PRIMARY KEY';
//     `);

//     console.log("\n🔑 Clave primaria:");
//     console.table(clavesPrimarias.rows);

//     // 3️⃣ Claves foráneas
//     const clavesForaneas = await pool.query(`
//       SELECT
//         kcu.column_name AS "columna_fk",
//         ccu.table_name AS "tabla_referenciada",
//         ccu.column_name AS "columna_referenciada"
//       FROM information_schema.table_constraints AS tc
//       JOIN information_schema.key_column_usage AS kcu
//         ON tc.constraint_name = kcu.constraint_name
//       JOIN information_schema.constraint_column_usage AS ccu
//         ON ccu.constraint_name = tc.constraint_name
//       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'asistencia';
//     `);

//     console.log("\n🔗 Claves foráneas:");
//     console.table(clavesForaneas.rows);

//     // 4️⃣ Restricciones adicionales
//     const restricciones = await pool.query(`
//       SELECT
//         constraint_name AS "nombre_restriccion",
//         constraint_type AS "tipo"
//       FROM information_schema.table_constraints
//       WHERE table_name = 'asistencia';
//     `);

//     console.log("\n🧩 Restricciones:");
//     console.table(restricciones.rows);

//   } catch (error) {
//     console.error("❌ Error al obtener el esquema:", error);
//   } finally {
//     pool.end(); // cerrar conexión
//   }
// };

// verEsquemaTabla();
// para ver una tabla en especifico
// testDB.js
import pool from "./db/db.js";

const verUsuarios = async () => {
  try {
    console.log("📋 REGISTROS DE LA TABLA 'usuarios'");

    const resultado = await pool.query("SELECT * FROM usuarios;");

    if (resultado.rows.length === 0) {
      console.log("⚠️ No hay registros en la tabla 'usuarios'.");
    } else {
      console.table(resultado.rows);
    }
  } catch (error) {
    console.error("❌ Error al obtener los usuarios:", error);
  } finally {
    pool.end(); // cerrar conexión
  }
};

verUsuarios();
