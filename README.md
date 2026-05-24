# SketchFlow

Hand-drawn sketch app with checkpoint timeline, visual diff, and AI-powered change descriptions.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase and (optional) OpenAI keys
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Supabase

Apply the schema in `supabase/schema.sql` to your Supabase project.

Required env vars (Vite requires the `VITE_` prefix):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
