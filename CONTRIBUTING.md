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
> re-sella el *committer* con esta config, así que déjala puesta.

## Flujo de trabajo (§3, §8)

- **Trunk-based**: rama corta por feature (vida < 2–3 días), PR pequeño.
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`…
- **Nada se mergea a `main` sin PR** y **1 aprobación**, con **CI en verde**
  (`lint` · `typecheck` · `test`).
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
