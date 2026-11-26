// Configuração lida de variáveis de ambiente (nenhum segredo fica no código).
function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-troque-em-producao'),
  // RN-06 / RF-07 — logout por inatividade (minutos)
  inactivityMinutes: Number(process.env.INACTIVITY_MINUTES ?? 30),
  // RN-11 — validade do link de recuperação (minutos)
  resetTokenMinutes: Number(process.env.RESET_TOKEN_MINUTES ?? 30),
  appUrl: process.env.APP_URL ?? 'http://localhost:8080',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 1025),
    from: process.env.MAIL_FROM ?? 'Mesaí — Cantina 67 <nao-responda@cantina67.com.br>',
  },
};
