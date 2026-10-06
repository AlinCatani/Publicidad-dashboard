# Service account propia, de solo lectura

**Decidido 2026-10-06, paso 3 del plan `planes/2026-10-06-sitio-de-tableros-vercel.md`.**

El sitio lee BigQuery con **`tableros-lectura@gtm-pvkx9p9-ndk3z.iam.gserviceaccount.com`**, no con
`looker-bigquery@`.

- **Por qué no `looker-bigquery@`:** tiene rol `Editor` en todo el proyecto. Su llave va a vivir
  en Vercel, expuesta a internet; si se filtra, quien la tenga puede borrar o cambiar datos.
- **Qué puede `tableros-lectura@`:** `bigquery.dataViewer` + `bigquery.jobUser` a nivel
  **proyecto**. Lee todos los datasets de Advertising, no escribe nada.
- **Por qué todo el proyecto y no solo `looker_dashboard`:** lo pidió Alin — cada tablero va a
  usar datos distintos y no quiere tener que dar un permiso nuevo por tablero. El plan original
  decía solo `looker_dashboard`. Reabrir si algún día un dataset de Advertising guarda datos que
  no deben llegar a un tablero.

## Cómo se creó, y por qué así

**No desde la Mac.** Alin usa cuentas de Google distintas por cliente; hacer `gcloud auth login`
con la cuenta de Ingenes en la máquina revuelve clientes. Se creó desde **Cloud Shell** (crear la
SA y `jobUser`) y la **consola** (IAM → lápiz → `dataViewer`).

- `bq add-iam-policy-binding -d` (permiso por dataset) **no funciona en este proyecto**: responde
  *"This feature requires allowlisting"*. El permiso por dataset se da desde la consola
  (BigQuery → dataset → Compartir).
- Justo después de crear la SA, darle permisos falla con *"does not exist"*: Google tarda unos
  segundos en propagarla. Reintentar.

## Login: dos barreras

El cliente OAuth «Tableros Ingenes» tiene público **Interno**: Google mismo rechaza cuentas fuera
de la organización (probado: `@gmail.com` → 403 `org_internal`). Detrás, `esIngenes()` en
`auth.ts` vuelve a exigir `@ingenes.com` — por si un día alguien cambia el público a Externo.
