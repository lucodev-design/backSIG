import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // Correo y contraseña
    user: process.env.MAIL_USER, // Gmail
    pass: process.env.MAIL_PASS, // contraseña de aplicación
  },
});