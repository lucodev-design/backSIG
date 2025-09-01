import bcrypt from "bcrypt";

const password = "123"; // tu contraseña de prueba
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("Hash generado:", hash);
});
