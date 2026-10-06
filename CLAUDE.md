# dashboards (Ingenes)

El **sitio de tableros** de Ingenes: Next.js + React, código en GitHub, publicado en Vercel. Solo
entran correos `@ingenes.com`. Cada tablero es una página; se van acumulando. El primero es
«Funnel Ingenes Monterrey». Nació del plan `../planes/2026-10-06-sitio-de-tableros-vercel.md`.

## Las tres declaraciones

- **Qué hace:** sirve tableros de lectura sobre BigQuery a la gente de Ingenes, con inicio de
  sesión de Google limitado al dominio `@ingenes.com` (verificado en el servidor).
- **Con qué datos:** lee **en vivo** BigQuery del proyecto Advertising (`gtm-pvkx9p9-ndk3z`) desde el servidor, con
  una service account **de solo lectura** propia de este proyecto (no `looker-bigquery@`, que es
  `Editor`). Sus llaves: `secretos/` en local y variables de entorno en Vercel.
- **Qué NO puede hacer:**
  - **Ningún dato de cliente en el código ni en el repo**: ni cortes de BigQuery escritos en el
    código, ni CSV, ni JSON de resultados (`claude-code/CLAUDE.md` § 4.4). Un tablero se trae como
    **consultas**, nunca como números. Ver `../memory/tableros-en-sitio-propio-no-en-artefactos.md`.
  - **No escribe en BigQuery** ni en ninguna plataforma de ads.
  - **No publica sin OK.** Con Vercel, `push` a `main` = publicar en internet (§ 5.7).

## Repo y publicación

- **Repo propio**, privado: `AlinCatani/Publicidad-dashboard`, rama `main`. Está fuera del repo
  de `01-ingenes/` (excluido en su `.gitignore`), porque Vercel publica todo lo que hay en el repo.
- **Vercel:** equipo `Ingenes-ADS` (Hobby), proyecto `publicidad-dashboard`.
- **Acceso de escritura a GitHub:** una **deploy key** por máquina, solo para este repo, con el
  nombre de la máquina como título. Nunca una llave en el usuario de GitHub de Alin.
- **Correo de autor:** en Hobby, Vercel solo publica commits con un correo verificado en el GitHub
  de Alin. `user.name` lleva la máquina: `Alin Catani (<máquina>)`.
- **Antes de cada `push`:** revisar por nombre de archivo que no vaya ningún secreto ni archivo de
  datos.

## Cómo está armado

**Next.js 16** (App Router). Ojo: `middleware` ahora se llama **`proxy`** — leer la doc en
`node_modules/next/dist/docs/` antes de escribir código (lo pide `AGENTS.md`, abajo).

| Archivo | Qué hace |
|---|---|
| `auth.ts` | Auth.js v5 + Google. `esIngenes()` es **la** regla de acceso: correo verificado, `hd = ingenes.com` y termina en `@ingenes.com`. El `hd` de la URL solo filtra la pantalla de Google |
| `proxy.ts` | Barrera 1: sin sesión → `/entrar` |
| `lib/sesion.ts` | Barrera 2: `requerirSesion()`, **toda página nueva la llama** al inicio |
| `lib/tableros.ts` | Índice de tableros (solo metadatos). Tablero nuevo = carpeta en `app/` + fila aquí |
| `lib/bigquery.ts` | Cliente de BigQuery: `BQ_KEYFILE` en local, `BQ_CREDENCIALES` en Vercel. Memoria de 5 min por consulta |
| `app/monterrey/` | Primer tablero. `consultas.ts` = SQL (servidor); `pintar.js` + `marcado.ts` = el pintado del artefacto, sin datos |
| `.env.example` | Variables que hacen falta. Los valores van en `.env.local` (ignorado) y en Vercel |

**Las 3 máquinas se llaman Alin, Daniela y Estefany** (decidido por Alin, 2026-10-06). Ese
nombre va en `user.name` (`Alin Catani (Daniela)`) y en el título de la deploy key.

Llave SSH de esta máquina (**Alin**): `~/.ssh/publicidad_dashboard_ed25519`, alias
`github-publicidad-dashboard` en `~/.ssh/config`. Otra máquina genera la suya con el mismo alias.

## Estado

Carpeta creada por `/coordinador` el 2026-10-06. Pasos 2 (esqueleto + repo) y 3 (service account
+ OAuth) y 4 (Monterrey, en `app/monterrey/`) hechos el 2026-10-06. Paso 5 (Vercel), pendiente.

| En `secretos/` (local, nunca al repo) | Qué es |
|---|---|
| `tableros-lectura.json` | Llave de `tableros-lectura@`: lee **todo** BigQuery de Advertising, sin escribir |
| `oauth-tableros.json` | Cliente OAuth «Tableros Ingenes», público **Interno**. De aquí sale `.env.local` |

El por qué, en `memory/00-Índice.md`.

@AGENTS.md
