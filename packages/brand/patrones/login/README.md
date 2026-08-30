# Patrón de Login — Evetev

Guía de referencia para construir la pantalla de inicio de sesión en cualquier app Evetev.
Aplicado en **EveLedger** y **EveConecta**.

---

## Anatomía visual

```
┌─────────────────────────────────────────────────────────┐
│  FONDO: blanco + degradado lila arriba-derecha + grid   │
│  (opcional: imagen de ilustración con opacity 0.13)     │
│                                                         │
│                  ┌─────────────────┐                    │
│                  │  [  Isotipo  ]  │                    │
│                  │   Nombre App    │                    │
│                  │  Subtítulo gris │                    │
│                  │─────────────────│                    │
│                  │  Correo         │                    │
│                  │  [___________]  │                    │
│                  │  Contraseña     │                    │
│                  │  [_________👁]  │                    │
│                  │       Recuperar acceso →             │
│                  │  [  Entrar a <App>  ]                │
│                  │  (error/info message)                │
│                  │─────────────────│                    │
│                  │  Pie de seguridad · texto gris       │
│                  └─────────────────┘                    │
│                    Card glassmorphism                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tokens de color

| Token               | Valor                    | Uso                                        |
| ------------------- | ------------------------ | ------------------------------------------ |
| `accent-primary`    | `#4b3075`                | Botón de recuperar, mensajes info, activos |
| `navy-deep`         | `#0a2540`                | Títulos, gradiente botón (inicio)          |
| `navy-text`         | `#0A2540`                | Texto de inputs y títulos                  |
| `slate-label`       | `#334155`                | Labels de campos                           |
| `slate-placeholder` | `#64748B`                | Subtítulo card                             |
| `slate-muted`       | `#94A3B8`                | Pie de seguridad, ícono de contraseña      |
| `input-border`      | `#E2E8F0`                | Borde de inputs en reposo                  |
| `lila-gradient`     | `rgba(196,181,253,0.55)` | Degradado radial superior-derecho          |

---

## Fondo — Soft Pastel Blend

Tres capas apiladas (ver `soft-pastel-blend.tsx`):

1. **Base blanca** — `backgroundColor: "#ffffff"`
2. **Imagen opcional** — ilustración de la categoría de la app, `opacity: 0.13`, `backgroundSize: "cover"`
3. **Degradado lila** — `radial-gradient(ellipse 70% 80% at 100% 0%, rgba(196,181,253,0.55) …)`
4. **Grid sutil** — líneas `rgba(180,180,200,0.18)` cada `80px`

La imagen va **debajo** del degradado lila para que el color sea uniforme aunque la imagen varíe.

### Ilustraciones disponibles en CDN

| Aplicación | Ilustración                           | URL CDN                                  |
| ---------- | ------------------------------------- | ---------------------------------------- |
| EveConecta | `conjunto-residencial-calle.webp`     | `/marca/conjunto-residencial-calle.webp` |
| EveLedger  | _(sin imagen; solo degradado y grid)_ | —                                        |
| EvePay     | Pendiente                             | —                                        |

---

## Card glassmorphism

```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.9);
border-radius: 20px;
padding: 2.5rem;
box-shadow: 0 8px 40px rgba(10, 37, 64, 0.1);
max-width: 420px;
width: 100%;
```

---

## Botón principal

```css
background: linear-gradient(135deg, #0a2540 0%, #4b3075 100%);
color: #ffffff;
border: none;
border-radius: 10px;
padding: 0.8rem;
font-size: 0.9rem;
font-weight: 700;
letter-spacing: 0.02em;
box-shadow: 0 4px 20px rgba(75, 48, 117, 0.35);
```

Estado deshabilitado (cargando):

```css
background: rgba(10, 37, 64, 0.4);
box-shadow: none;
cursor: not-allowed;
```

---

## Mensajes de feedback

```tsx
// Error
background: rgba(239, 68, 68, 0.08);
border: 1px solid rgba(239, 68, 68, 0.25);
color: #B91C1C;

// Info / éxito
background: rgba(75, 48, 117, 0.07);
border: 1px solid rgba(75, 48, 117, 0.2);
color: #4b3075;
```

---

## Estructura de archivos a copiar

```
components/
  ui/
    soft-pastel-blend.tsx   ← fondo (con o sin imagen)
app/
  login/
    page.tsx                ← copiado de login-page.tsx
```

Archivos de referencia en este directorio:

- [`soft-pastel-blend.tsx`](./soft-pastel-blend.tsx) — componente de fondo
- [`login-page.tsx`](./login-page.tsx) — plantilla completa lista para copiar

---

## Checklist al implementar

- [ ] Importar `GradientBackground` en el layout unauthenticated (o en la página directamente)
- [ ] El `<main>` del layout NO centra en estado no autenticado — la página de login controla su propio `minHeight: 100vh`
- [ ] Usar el isotipo correcto para la app (ver `assets/isotipos/`)
- [ ] Cambiar el texto del botón: `"Entrar a <NombreApp>"`
- [ ] Ajustar el pie de seguridad según la tecnología de autenticación usada
- [ ] Si la app tiene imagen ilustrativa, agregarla a la capa 2 del fondo con `opacity: 0.13`
- [ ] Verificar que `.env.local` esté en `.gitignore` antes de hacer commit
