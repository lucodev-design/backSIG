// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

// ====================================
// VERIFICAR TOKEN (Base para todas las rutas protegidas)
// ====================================
export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No se proporcionó token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded; // guardamos los datos del usuario en req.user
    
    console.log("✅ Token verificado, usuario:", req.user); // Para debugging
    
    next();
  } catch (error) {
    console.error("❌ Error al verificar token:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

// Alias para compatibilidad
export const verificarToken = verifyToken;

// ====================================
// VERIFICAR ADMINISTRADOR
// ====================================
export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  const rol = req.user.rol;
  const rolesPermitidos = ["admin", "Administrador", "Super Administrador"];

  console.log("🔍 Verificando Admin - Rol:", rol); // Para debugging

  if (rolesPermitidos.includes(rol)) {
    next();
  } else {
    return res.status(403).json({ 
      message: `Acceso denegado: Solo administradores. Tu rol: ${rol}` 
    });
  }
};

// ====================================
// VERIFICAR SUPER ADMINISTRADOR
// ====================================
export const verifySuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  const rol = req.user.rol;

  console.log("🔍 Verificando Super Admin - Rol:", rol); // Para debugging

  // IMPORTANTE: Ajusta estos valores según lo que guardes en la BD
  const rolesPermitidos = [
    "Super Administrador",
    "SuperAdministrador",
    "super_admin",
    "superadmin"
  ];

  // Comparación case-insensitive
  if (rolesPermitidos.some(r => r.toLowerCase() === (rol || "").toLowerCase())) {
    console.log("✅ Super Admin verificado");
    next();
  } else {
    console.log("❌ Acceso denegado - Rol actual:", rol);
    return res.status(403).json({ 
      message: `Acceso denegado: Solo Super Administradores. Tu rol actual: ${rol}` 
    });
  }
};

// Alias
export const esSuperAdmin = verifySuperAdmin;

// ====================================
// VERIFICAR ADMIN O SUPER ADMIN
// ====================================
export const verifyAdminOrSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }

  const rol = req.user.rol;
  const rolesPermitidos = [
    "admin",
    "Administrador",
    "Super Administrador",
    "SuperAdministrador",
    "super_admin"
  ];

  if (rolesPermitidos.some(r => r.toLowerCase() === (rol || "").toLowerCase())) {
    next();
  } else {
    return res.status(403).json({ 
      message: `Acceso denegado: Requiere permisos de administrador. Tu rol: ${rol}` 
    });
  }
};