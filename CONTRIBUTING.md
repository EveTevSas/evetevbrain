# Contribuir a evetev

La constitución manda: [`docs/ESTANDARES_INGENIERIA.md`](docs/ESTANDARES_INGENIERIA.md).
Aquí solo lo operativo del día a día.

## Identidad de commits (hazlo una vez por clon)

Todos los commits de este repo salen bajo la identidad de **Evetev**, no con el
correo personal ni el de otra empresa. Al clonar, configura tu git **local** del repo:

```bash
git config user.name "Evetev"
git config user.email "contacto@evetev.com"
```

O usa el atajo:

```bash
./scripts/setup-git.sh
```

> Es config **local** (solo este repo); no afecta tu git global. Ojo: un `git rebase`
> re-sella el _committer_ con esta config, así que déjala puesta.

## Flujo de trabajo (§3, §8)

- **Trunk-based**: rama corta por feature (vida < 2–3 días), PR pequeño.
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`…
- **Nada se mergea a `main` sin PR**, y el PR no se mezcla hasta que el check
  **«CI completo»** esté en verde. Lo aplica el ruleset «Proteger main», no la
  buena voluntad: `main` tampoco se puede borrar ni reescribir con un push
  forzado. Squash, merge y rebase están los tres permitidos.
- **La aprobación no está exigida hoy** (`required_approving_review_count: 0`).
  El §3 de la constitución pide 1 aprobación _de otra persona_, y ese sigue
  siendo el objetivo; mientras el repo tenga un solo committer humano, exigirla
  bloquearía todos los PR —GitHub no deja aprobar el propio— sin añadir una
  segunda mirada que no existe. **Cuando entre la segunda persona, hay que subir
  el contador a 1**; si no, la revisión se queda en costumbre y se olvida el día
  que haya prisa.
- `main` siempre desplegable.

## Antes de dar un PR por listo

- Cumple el **Definition of Done** (§6) — la plantilla de PR ya lo trae.
- Si es EvePay/vertical con reglas de dinero, tenant o RBAC: **spec primero** (§9,
  `specs/<feature>/`).
- Calidad local en verde:

```bash
corepack pnpm install
corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test
```
