import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token no proporcionado" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto123");

    if (decoded.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado: solo administradores" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token inválido" });
  }
};
