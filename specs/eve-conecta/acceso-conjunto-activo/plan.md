# Plan técnico

- Módulo compartido `lib/auth/resolve-membership.ts`: consulta de membresías activas
  ordenadas por antigüedad y selección de la membresía activa (cookie válida o la más
  antigua) con validación de rol.
- `lib/supabase/proxy.ts` (middleware), `lib/auth/access.ts` (layouts) y
  `lib/demo/store.ts` (API) consumen el módulo compartido; ninguna capa reimplementa la
  selección.
- El middleware lee la cookie del request; las demás capas usan `cookies()` del servidor.
- Pruebas unitarias del selector: cookie válida, cookie ajena, sin cookie, sin membresías
  y rol inválido.
