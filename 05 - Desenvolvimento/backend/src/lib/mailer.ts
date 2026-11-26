import nodemailer from 'nodemailer';
import { env } from '../env.js';

const transport = env.smtp.host
  ? nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: false })
  : null;

/** Envia e-mail. Sem SMTP configurado (ex.: testes), apenas devolve o conteúdo sem registrá-lo em log (RNF-03). */
export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!transport) return { sent: false };
  await transport.sendMail({ from: env.smtp.from, to, subject, html, text });
  return { sent: true };
}
