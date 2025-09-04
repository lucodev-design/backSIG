import bcrypt from "bcrypt";

const password = "admin123"; // tu contraseña de prueba
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("Hash generado:", hash);
});
