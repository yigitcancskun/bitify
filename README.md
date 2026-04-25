# AI Fitness Avatar Evolution MVP

Hackathon MVP for an anonymous AI-powered fitness avatar loop.

## Ports

- Frontend: `http://localhost:5558`
- Backend: `http://localhost:7778`

## Setup

```bash
make install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Fill Supabase and Wiro values in the env files.

For 3D-like avatar generation, keep Wiro pointed at an image-edit model:

```bash
WIRO_AVATAR_MODEL_OWNER=wiro
WIRO_AVATAR_MODEL_SLUG=image-edit-general
WIRO_FALLBACK_MODEL_OWNER=google
WIRO_FALLBACK_MODEL_SLUG=nano-banana
```

Avoid `wiro/cartoonify` for this MVP because it produces a flatter 2D cartoon look.

Photo-based score generation requires:

```bash
WIRO_SCORE_MODEL_OWNER=google
WIRO_SCORE_MODEL_SLUG=gemini-3-flash
```

## Run

```bash
make fe
make be
```

## Review

```bash
make review
```

## Supabase

Run `backend/sql/schema.sql` in the Supabase SQL editor, then create the storage buckets described there.
# bitify
