/**
 * Seed do Mesaí — Cantina 67
 * - RF-11 / RN-07: cria exatamente um Gerente padrão (isSeed = true), protegido contra rebaixamento.
 * - Configuração inicial do estabelecimento (taxa de entrega R$ 10,00 — RF-13).
 * - Com SEED_DEMO=true: categorias, pratos e usuários de demonstração (Colaborador e Cliente).
 * Idempotente: pode rodar a cada inicialização do container sem duplicar dados.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const GERENTE = {
  name: process.env.SEED_GERENTE_NAME ?? 'Gerente Cantina 67',
  email: (process.env.SEED_GERENTE_EMAIL ?? 'gerente@cantina67.com.br').toLowerCase(),
  password: process.env.SEED_GERENTE_PASSWORD ?? 'Mesai@2026',
  cpf: '52998224725', // CPF válido de demonstração
};

type Shape = 'pizza' | 'pasta' | 'bowl' | 'toast' | 'cake' | 'glass';

const CATEGORIES: { name: string; shape: Shape; bg: string }[] = [
  { name: 'Antipasti', shape: 'toast', bg: '#5C3A21' },
  { name: 'Massas', shape: 'pasta', bg: '#E86A24' },
  { name: 'Pizzas', shape: 'pizza', bg: '#252527' },
  { name: 'Risotos', shape: 'bowl', bg: '#D99B26' },
  { name: 'Sobremesas', shape: 'cake', bg: '#4A2C18' },
  { name: 'Bebidas', shape: 'glass', bg: '#1D1D1F' },
];

const DISHES: { cat: string; name: string; description: string; price: string; discount?: string }[] = [
  { cat: 'Antipasti', name: 'Bruschetta Pomodoro', description: 'Pão italiano tostado, tomate fresco, manjericão e azeite extravirgem.', price: '28.90' },
  { cat: 'Antipasti', name: 'Burrata da Casa', description: 'Burrata cremosa com tomates confitados, pesto e torradas.', price: '54.00', discount: '10' },
  { cat: 'Antipasti', name: 'Polpettine al Sugo', description: 'Almôndegas da nonna ao molho de tomate com parmesão.', price: '36.50' },
  { cat: 'Massas', name: 'Spaghetti alla Carbonara', description: 'Guanciale, gema, pecorino romano e pimenta-do-reino.', price: '62.00' },
  { cat: 'Massas', name: 'Lasanha da Nonna', description: 'Camadas de massa fresca, ragù de carne e bechamel gratinado.', price: '68.90', discount: '15' },
  { cat: 'Massas', name: 'Fettuccine Alfredo', description: 'Massa fresca na manteiga com creme de parmesão.', price: '58.00' },
  { cat: 'Massas', name: 'Ravioli de Abóbora', description: 'Recheio de abóbora assada, manteiga de sálvia e amêndoas.', price: '64.50' },
  { cat: 'Pizzas', name: 'Pizza Margherita', description: 'Molho de tomate, muçarela de búfala e manjericão.', price: '59.90' },
  { cat: 'Pizzas', name: 'Pizza Calabresa 67', description: 'Calabresa artesanal, cebola roxa e azeitonas pretas.', price: '64.90' },
  { cat: 'Pizzas', name: 'Pizza Quattro Formaggi', description: 'Muçarela, gorgonzola, parmesão e provolone.', price: '69.90', discount: '20' },
  { cat: 'Risotos', name: 'Risoto de Funghi', description: 'Arbório, cogumelos frescos e secos, finalizado com parmesão.', price: '72.00' },
  { cat: 'Risotos', name: 'Risoto de Limão Siciliano', description: 'Raspas de limão, camarões salteados e ervas finas.', price: '84.00' },
  { cat: 'Sobremesas', name: 'Tiramisù', description: 'Biscoito champagne, café, mascarpone e cacau.', price: '29.90' },
  { cat: 'Sobremesas', name: 'Panna Cotta', description: 'Creme de baunilha com calda de frutas vermelhas.', price: '24.50' },
  { cat: 'Bebidas', name: 'Soda Italiana Tangerina', description: 'Xarope de tangerina, água com gás e gelo.', price: '14.00' },
  { cat: 'Bebidas', name: 'Suco de Laranja', description: 'Natural, 400 ml.', price: '12.00' },
  { cat: 'Bebidas', name: 'Água Mineral', description: 'Com ou sem gás, 500 ml.', price: '6.00' },
];

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Ilustração vetorial "retrô" para os pratos de demonstração (substituível por foto real no painel do Gerente). */
function illustration(name: string, shape: Shape, bg: string) {
  const cream = '#F5EFE6';
  const ink = '#141415';
  const orange = '#E86A24';
  const mustard = '#D99B26';
  const brown = '#5C3A21';
  const shapes: Record<Shape, string> = {
    pizza: `<circle cx="200" cy="140" r="78" fill="${mustard}" stroke="${ink}" stroke-width="4"/>
      <circle cx="200" cy="140" r="64" fill="${orange}" stroke="${ink}" stroke-width="3"/>
      <path d="M200 76 L200 204 M136 140 L264 140 M155 95 L245 185 M245 95 L155 185" stroke="${ink}" stroke-width="3"/>
      <circle cx="178" cy="112" r="9" fill="${cream}" stroke="${ink}" stroke-width="2"/><circle cx="226" cy="118" r="9" fill="${cream}" stroke="${ink}" stroke-width="2"/>
      <circle cx="214" cy="166" r="9" fill="${cream}" stroke="${ink}" stroke-width="2"/><circle cx="170" cy="160" r="9" fill="${cream}" stroke="${ink}" stroke-width="2"/>`,
    pasta: `<ellipse cx="200" cy="150" rx="96" ry="58" fill="${cream}" stroke="${ink}" stroke-width="4"/>
      <path d="M130 140 q15 -30 30 0 t30 0 t30 0 t30 0 t30 0" fill="none" stroke="${mustard}" stroke-width="8" stroke-linecap="round"/>
      <path d="M140 160 q15 -30 30 0 t30 0 t30 0 t30 0" fill="none" stroke="${mustard}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="200" cy="128" r="14" fill="${orange}" stroke="${ink}" stroke-width="3"/>
      <g transform="rotate(20 280 110)" stroke="${ink}" stroke-linecap="round" fill="none">
        <path d="M280 120 L280 190" stroke-width="7"/>
        <path d="M268 60 L268 100 M280 60 L280 100 M292 60 L292 100" stroke-width="4"/>
        <path d="M268 100 Q268 120 280 120 Q292 120 292 100" stroke-width="5"/>
      </g>`,
    bowl: `<path d="M110 120 h180 a90 70 0 0 1 -180 0z" fill="${cream}" stroke="${ink}" stroke-width="4"/>
      <ellipse cx="200" cy="120" rx="90" ry="18" fill="${mustard}" stroke="${ink}" stroke-width="3"/>
      <circle cx="176" cy="116" r="7" fill="${brown}"/><circle cx="214" cy="120" r="8" fill="${brown}"/><circle cx="236" cy="113" r="6" fill="${brown}"/>
      <path d="M150 90 q10 -20 0 -40 M200 86 q10 -20 0 -40 M250 90 q10 -20 0 -40" fill="none" stroke="${cream}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`,
    toast: `<rect x="112" y="104" width="176" height="80" rx="18" fill="${mustard}" stroke="${ink}" stroke-width="4"/>
      <circle cx="160" cy="132" r="18" fill="${orange}" stroke="${ink}" stroke-width="3"/><circle cx="208" cy="150" r="18" fill="${orange}" stroke="${ink}" stroke-width="3"/>
      <circle cx="252" cy="128" r="16" fill="${orange}" stroke="${ink}" stroke-width="3"/>
      <path d="M180 112 l14 -14 l6 18z M232 152 l14 -12 l4 18z" fill="#3f7a3a" stroke="${ink}" stroke-width="2"/>`,
    cake: `<path d="M120 190 L280 190 L280 130 L120 100 Z" fill="${cream}" stroke="${ink}" stroke-width="4"/>
      <path d="M120 100 L280 130 L280 146 L120 116 Z" fill="${brown}" stroke="${ink}" stroke-width="3"/>
      <path d="M120 140 L280 166" stroke="${mustard}" stroke-width="8"/>
      <circle cx="200" cy="100" r="14" fill="${orange}" stroke="${ink}" stroke-width="3"/>`,
    glass: `<path d="M160 60 h80 l-12 150 h-56 z" fill="${cream}" stroke="${ink}" stroke-width="4"/>
      <path d="M166 100 h68 l-9 106 h-50 z" fill="${orange}" stroke="${ink}" stroke-width="3"/>
      <circle cx="190" cy="140" r="5" fill="${cream}"/><circle cx="208" cy="168" r="4" fill="${cream}"/><circle cx="198" cy="186" r="3" fill="${cream}"/>
      <path d="M226 40 L214 120" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
  };
  const label = esc(name.length > 26 ? `${name.slice(0, 25)}…` : name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="800" height="520">
  <rect width="400" height="260" fill="${bg}"/>
  <g opacity=".12">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 32} H400" stroke="${cream}" stroke-width="2" stroke-dasharray="8 8"/>`).join('')}</g>
  <circle cx="200" cy="140" r="104" fill="${bg}" stroke="${cream}" stroke-width="3" stroke-dasharray="6 6" opacity=".6"/>
  ${shapes[shape]}
  <rect x="0" y="222" width="400" height="38" fill="${ink}"/>
  <text x="200" y="247" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="17" fill="${cream}">${label}</text>
</svg>`;
}

async function seedGerente() {
  const existingSeed = await prisma.user.findFirst({ where: { isSeed: true } });
  if (existingSeed) {
    console.log(`[seed] Gerente padrão já existe (${existingSeed.email}).`);
    return;
  }
  const byEmail = await prisma.user.findUnique({ where: { email: GERENTE.email } });
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data: { role: 'GERENTE', isSeed: true } });
    console.log('[seed] Usuário existente promovido a Gerente padrão.');
    return;
  }
  await prisma.user.create({
    data: {
      name: GERENTE.name,
      email: GERENTE.email,
      phone: '(85) 99999-0067',
      cpf: GERENTE.cpf,
      cep: '60000000',
      number: '67',
      passwordHash: await bcrypt.hash(GERENTE.password, 10),
      role: 'GERENTE',
      isSeed: true,
    },
  });
  console.log(`[seed] Gerente padrão criado: ${GERENTE.email}`);
}

async function seedConfig() {
  await prisma.storeConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: 'Cantina 67',
      address: 'Rua da Cantina, 67 — Centro (endereço de demonstração; altere em Configurações)',
      deliveryFee: '10.00',
      estimatedMinutes: 45,
    },
  });
}

async function seedDemo() {
  if ((await prisma.category.count()) > 0) {
    console.log('[seed] Cardápio já existente — demonstração não recriada.');
    return;
  }
  const seedDir = path.join(UPLOAD_DIR, 'seed');
  fs.mkdirSync(seedDir, { recursive: true });

  const catIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.create({ data: { name: c.name, sortOrder: i } });
    catIds.set(c.name, cat.id);
  }
  for (const dsh of DISHES) {
    const cat = CATEGORIES.find((c) => c.name === dsh.cat)!;
    const file = `${slug(dsh.name)}.svg`;
    fs.writeFileSync(path.join(seedDir, file), illustration(dsh.name, cat.shape, cat.bg));
    await prisma.dish.create({
      data: {
        categoryId: catIds.get(dsh.cat)!,
        name: dsh.name,
        description: dsh.description,
        price: dsh.price,
        discountPercent: dsh.discount ?? null,
        photoUrl: `/uploads/seed/${file}`,
      },
    });
  }

  const demoPassword = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? 'Mesai@2026', 10);
  const demoUsers = [
    { name: 'Carlos Colaborador', email: 'colaborador@cantina67.com.br', cpf: '11144477735', role: 'COLABORADOR' as const, phone: '(85) 98888-1111' },
    { name: 'Mariana Costa', email: 'mariana.cliente@gmail.com', cpf: '39053344705', role: 'CLIENTE' as const, phone: '(85) 97777-2222' },
  ];
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, cep: '60165121', number: '1420', complement: 'Apto 302', reference: 'Próximo à praça', passwordHash: demoPassword },
    });
  }
  console.log(`[seed] Demonstração criada: ${CATEGORIES.length} categorias, ${DISHES.length} pratos, 2 usuários.`);
}

async function main() {
  await seedGerente();
  await seedConfig();
  if ((process.env.SEED_DEMO ?? 'true') === 'true') await seedDemo();
}

main()
  .catch((e) => {
    console.error('[seed] falhou:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
