// Creacion de los datos iniciales 
// roles y sedes
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_qcvae3Voth4s@ep-proud-resonance-ad53twba-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    // Insertar roles si no existen
    const roles = [
      { nombre: "admin", descripcion: "Administrador con todos los permisos" },
      { nombre: "usuario", descripcion: "Usuario con permisos limitados" },
    ];

    for (const rol of roles) {
      const res = await pool.query(
        "SELECT id FROM roles WHERE nombre = $1",
        [rol.nombre]
      );
      if (res.rows.length === 0) {
        await pool.query(
          "INSERT INTO roles (nombre, descripcion) VALUES ($1, $2)",
          [rol.nombre, rol.descripcion]
        );
        console.log(`✅ Rol '${rol.nombre}' creado.`);
      } else {
        console.log(`ℹ️ Rol '${rol.nombre}' ya existe.`);
      }
    }

    // Insertar sede si no existe
    const sedeNombre = "Sede Central";
    const sedeDireccion = "Av. Principal 123 - Huancayo";

    const sedeRes = await pool.query(
      "SELECT id FROM sedes WHERE nombre = $1",
      [sedeNombre]
    );
    if (sedeRes.rows.length === 0) {
      await pool.query(
        "INSERT INTO sedes (nombre, direccion) VALUES ($1, $2)",
        [sedeNombre, sedeDireccion]
      );
      console.log(`✅ Sede '${sedeNombre}' creada.`);
    } else {
      console.log(`ℹ️ Sede '${sedeNombre}' ya existe.`);
    }
  } catch (err) {
    console.error("❌ Error en setup:", err.message);
  } finally {
    await pool.end();
  }
}

main();
