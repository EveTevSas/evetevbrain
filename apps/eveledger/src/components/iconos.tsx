// Íconos inline estilo Lucide (§5): trazo 2px, terminales redondeados, 24px base.
// Los errores y estados siempre van con ícono + texto, nunca solo color (C5).

interface Props {
  className?: string;
}

function Base({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={24}
      height={24}
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconoError({ className }: Props) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </Base>
  );
}

export function IconoExito({ className }: Props) {
  return (
    <Base className={className}>
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </Base>
  );
}

export function IconoAlerta({ className }: Props) {
  return (
    <Base className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Base>
  );
}
