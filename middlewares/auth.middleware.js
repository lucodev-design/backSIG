// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

// Middleware para verificar si el usuario está autenticado
export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No se proporcionó token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretKey");
    req.user = decoded; // guardamos los datos del usuario en req.user
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

// Middleware para verificar si el usuario es administrador
export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.rol === "admin") {
      next(); // ✅ Es admin, continúa
    } else {
      return res.status(403).json({ message: "Acceso denegado: Solo administradores" });
    }
  });
};
