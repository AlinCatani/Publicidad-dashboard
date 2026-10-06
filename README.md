# Publicidad-dashboard

Tableros de publicidad de Ingenes. Next.js + Auth.js (Google, solo `@ingenes.com`), publicado en Vercel.
Los datos se leen en vivo desde BigQuery en el servidor: **ningún dato va en este repo**.

```bash
cp .env.example ../.env.local   # fuera del repo; y llenar
ln -s ../.env.local .env.local   # Next solo lee su propia carpeta
npm install
npm run dev
```
