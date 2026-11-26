import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, prisma, newUserData, registerAndLogin, genCpf } from './helpers.js';

describe('CT-01 — cadastro completo e incompleto (RF-01)', () => {
  it('cria Cliente com todos os obrigatórios e opcionais vazios', async () => {
    const r = await request(app).post('/api/auth/register').send(newUserData());
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe('CLIENTE');
  });
  for (const field of ['name', 'phone', 'email', 'password', 'cpf', 'cep', 'number']) {
    it(`recusa cadastro sem ${field}`, async () => {
      const data = newUserData();
      delete (data as Record<string, unknown>)[field];
      const r = await request(app).post('/api/auth/register').send(data);
      expect(r.status).toBe(400);
      expect(r.body.error.message).toBeTruthy();
    });
  }
});

describe('CT-02 — CPF válido, inválido e repetido (RF-02)', () => {
  it('recusa 111.111.111-11', async () => {
    const r = await request(app).post('/api/auth/register').send(newUserData({ cpf: '111.111.111-11' }));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('CPF_INVALIDO');
  });
  it('recusa dígito verificador inválido', async () => {
    const r = await request(app).post('/api/auth/register').send(newUserData({ cpf: '529.982.247-24' }));
    expect(r.body.error.code).toBe('CPF_INVALIDO');
  });
});

describe('CT-03 — e-mail e CPF duplicados (RF-03)', () => {
  it('recusa e-mail já cadastrado', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const r = await request(app).post('/api/auth/register').send({ ...newUserData(), email: d.email.toUpperCase() });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('EMAIL_DUPLICADO');
  });
  it('recusa CPF já cadastrado', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const r = await request(app).post('/api/auth/register').send({ ...newUserData(), cpf: d.cpf });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CPF_DUPLICADO');
  });
});

describe('CT-04 — login correto e incorreto (RF-04)', () => {
  it('abre sessão com e-mail e com CPF; mensagem genérica no erro; logout encerra', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const a = request.agent(app);
    expect((await a.post('/api/auth/login').send({ login: d.email, password: d.password })).status).toBe(200);
    expect((await a.get('/api/auth/me')).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ login: d.cpf, password: d.password })).status).toBe(200);

    const wrongPass = await request(app).post('/api/auth/login').send({ login: d.email, password: 'errada123' });
    const wrongUser = await request(app).post('/api/auth/login').send({ login: 'naoexiste@x.com', password: d.password });
    expect(wrongPass.status).toBe(401);
    expect(wrongPass.body.error.message).toBe(wrongUser.body.error.message);

    const b = request.agent(app);
    await b.post('/api/auth/login').send({ login: d.email, password: d.password });
    expect((await b.post('/api/auth/logout')).status).toBe(200);
    expect((await b.get('/api/auth/me')).status).toBe(401);
  });

  it('RNF-01 — senha não é guardada em texto puro', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const u = await prisma.user.findUniqueOrThrow({ where: { email: d.email } });
    expect(u.passwordHash).not.toContain(d.password);
    expect(u.passwordHash.startsWith('$2')).toBe(true);
  });
});

describe('CT-05 — link de recuperação válido, reutilizado e expirado (RF-05)', () => {
  it('redefine uma vez; reutilização falha', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const f = await request(app).post('/api/auth/forgot-password').send({ email: d.email });
    const token = f.body.devToken as string;
    expect(token).toBeTruthy();
    const r1 = await request(app).post('/api/auth/reset-password').send({ token, password: 'NovaSenha@1' });
    expect(r1.status).toBe(200);
    const r2 = await request(app).post('/api/auth/reset-password').send({ token, password: 'OutraSenha@1' });
    expect(r2.body.error.code).toBe('LINK_USADO');
    expect((await request(app).post('/api/auth/login').send({ login: d.email, password: 'NovaSenha@1' })).status).toBe(200);
  });
  it('link após 30 minutos é recusado', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const f = await request(app).post('/api/auth/forgot-password').send({ email: d.email });
    const u = await prisma.user.findUniqueOrThrow({ where: { email: d.email } });
    await prisma.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r = await request(app).post('/api/auth/reset-password').send({ token: f.body.devToken, password: 'NovaSenha@1' });
    expect(r.body.error.code).toBe('LINK_EXPIRADO');
  });
  it('e-mail inexistente recebe a mesma resposta genérica', async () => {
    const r = await request(app).post('/api/auth/forgot-password').send({ email: 'ninguem@teste.com' });
    expect(r.status).toBe(200);
    expect(r.body.devToken).toBeUndefined();
  });
});

describe('CT-06 — segundo login derruba o primeiro (RF-06)', () => {
  it('máquina A perde a sessão quando B entra', async () => {
    const d = newUserData();
    await request(app).post('/api/auth/register').send(d);
    const A = request.agent(app);
    const B = request.agent(app);
    await A.post('/api/auth/login').send({ login: d.email, password: d.password });
    expect((await A.get('/api/auth/me')).status).toBe(200);
    await B.post('/api/auth/login').send({ login: d.email, password: d.password });
    const r = await A.get('/api/auth/me');
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('SESSAO_SUBSTITUIDA');
    expect((await B.get('/api/auth/me')).status).toBe(200);
  });
});

describe('CT-07 — logout por inatividade (RF-07)', () => {
  it('após 30 min sem atividade a próxima ação exige novo login', async () => {
    const { agent, user } = await registerAndLogin();
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { lastActivityAt: new Date(Date.now() - 31 * 60_000) } });
    const r = await agent.get('/api/cart');
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('SESSAO_EXPIRADA');
  });
  it('atualização automática (polling) não conta como atividade', async () => {
    const { agent, user } = await registerAndLogin();
    const old = new Date(Date.now() - 10 * 60_000);
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { lastActivityAt: old } });
    await agent.get('/api/orders/mine').set('X-Mesai-Background', '1');
    const s = await prisma.session.findFirstOrThrow({ where: { userId: user.id, revokedAt: null } });
    expect(s.lastActivityAt.getTime()).toBe(old.getTime());
  });
});

describe('CT-09 — edição de dados e unicidade do e-mail (RF-09)', () => {
  it('edita dados, mantém CPF, exige senha atual e respeita unicidade', async () => {
    const other = newUserData();
    await request(app).post('/api/auth/register').send(other);
    const { agent, data } = await registerAndLogin();
    const base = { name: 'Nome Alterado Silva', phone: '(85) 98888-7777', email: data.email, cep: '60000-000', number: '9', complement: 'Casa', reference: '' };
    const ok = await agent.put('/api/me').send(base);
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe('Nome Alterado Silva');
    expect(ok.body.user.cpf).toBe(data.cpf);

    expect((await agent.put('/api/me').send({ ...base, email: other.email })).body.error.code).toBe('EMAIL_DUPLICADO');
    expect((await agent.put('/api/me').send({ ...base, cpf: genCpf() })).status).toBe(400);

    expect((await agent.put('/api/me/password').send({ currentPassword: 'errada', newPassword: 'Nova@12345' })).body.error.code).toBe('SENHA_ATUAL_INCORRETA');
    expect((await agent.put('/api/me/password').send({ currentPassword: data.password, newPassword: 'Nova@12345' })).status).toBe(200);
  });
});
