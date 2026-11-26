// RF-02 — validação de CPF pelos dígitos verificadores
export function onlyDigits(v: string): string {
  return (v ?? '').replace(/\D/g, '');
}

export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais (ex.: 111.111.111-11)
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

// RNF-03 — CPF nunca é exibido por inteiro fora do próprio perfil
export function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return '***';
  return `***.${d.slice(3, 6)}.***-**`;
}
