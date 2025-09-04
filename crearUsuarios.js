import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://gestion_empresarial_db_user:hyJ8K3CH1f3HyGqZS3JIBqUduRaKkAX6@dpg-d2rk3bffte5s738dcfpg-a.virginia-postgres.render.com/gestion_empresarial_db",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Insertar un nuevo admin
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES 
        ('Admin', 'admin@gmail.com', '$2b$10$iXP4P2rVRp2YTZe5pB5j/OMe81RvxZkaKAEqsPZw4FBG1LckGuLm.', 'admin')
      ON CONFLICT (email) DO NOTHING
    `);

    console.log("✅ Nuevo admin creado con éxito");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
