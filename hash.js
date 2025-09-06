import bcrypt from "bcrypt";

// aqui realizamos la encripatcion del texto plano
const password = "admin123"; 
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("Hash generado:", hash);
});
