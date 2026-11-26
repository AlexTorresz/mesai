// RNF-01 — bcrypt gera um salt aleatório por senha e o embute no hash.
import bcrypt from 'bcryptjs';
export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const checkPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
