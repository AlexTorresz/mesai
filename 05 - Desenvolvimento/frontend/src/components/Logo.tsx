/** Assinatura oficial: "mesaí" em caixa baixa, com o "í" (e acento) em Laranja Brasa. */
export function Logo({ className = '', light }: { className?: string; light?: boolean }) {
  return (
    <span className={`font-display font-black tracking-[-0.02em] ${light ? 'text-cream' : 'text-on-app'} ${className}`} aria-label="mesaí">
      mesa<span className="text-primary">í</span>
    </span>
  );
}
