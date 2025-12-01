export const esSuperAdmin = (req, res, next) => {
  // Asumiendo que el token decodificado está en req.usuario
  if (req.usuario.rol !== "Super Administrador") {
    return res.status(403).json({ 
      error: "Acceso denegado. Se requiere rol de Super Administrador" 
    });
  }
  next();
};

export const esAdmin = (req, res, next) => {
  const rolesPermitidos = ["Administrador", "Super Administrador"];
  
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ 
      error: "Acceso denegado. Se requiere rol de Administrador" 
    });
  }
  next();
};