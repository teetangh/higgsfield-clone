# Seedream Studio

A local Higgsfield-style image generator that calls **ByteDance Seedream APIs directly** — no Higgsfield markup. Supports text-to-image and multi-reference image generation with **Seedream 5.0 Pro** and **Seedream 4.5**, with all prompts and images stored locally in SQLite.

## Features

- Text-to-image generation
- Multi-reference image + text (up to 10 reference images)
- Model switching: Seedream 5.0 Pro / Seedream 4.5
- Local SQLite database for generation history
- Local file storage for reference and output images
- BytePlus (international) or Volcengine (China) via env config
- Dark Higgsfield-inspired UI

## Prerequisites

1. **Node.js 18+**
2. A **BytePlus ModelArk** or **Volcengine Ark** API key
3. **Activate models** in your console before first use:
   - [BytePlus ModelArk Console](https://console.byteplus.com/modelark) → Model activation → enable **Seedream 4.5** and **Seedream 5.0 Pro**
   - [Volcengine Console](https://console.volcengine.com/ark) (China) — same models

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and add your API key
cp .env.example .env

# 3. Edit .env
# ARK_PROVIDER=byteplus        # or "volcengine"
# ARK_API_KEY=your_key_here

# 4. Run database migration (first time)
npm run db:migrate

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ARK_PROVIDER` | No | `byteplus` (default) or `volcengine` |
| `ARK_API_KEY` | Yes | Your Ark/ModelArk API key |
| `ARK_BASE_URL` | No | Override API base URL |
| `DATABASE_URL` | No | SQLite path (default: `file:./dev.db`) |

### Provider endpoints

| Provider | Base URL | Seedream 5.0 Pro | Seedream 4.5 |
|---|---|---|---|
| BytePlus | `https://ark.ap-southeast.bytepluses.com/api/v3` | `dola-seedream-5-0-pro-260628` | `seedream-4-5-251128` |
| Volcengine | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seedream-5-0-pro-260628` | `doubao-seedream-4-5-251128` |

## Usage

1. Enter a text prompt in the bottom dock
2. Optionally upload reference images (drag-drop or click +)
3. Select model and resolution
4. Click **Generate** or press `⌘ + Enter`
5. View past generations in **History**

## Project Structure

```
app/
  api/                   Thin API route handlers
  page.tsx               Main generator
  history/page.tsx       Generation history
components/              UI components
lib/
  types/                 Shared domain types (model-agnostic)
  config/                UI-facing model configuration
  providers/
    models/              Per-model definitions & capabilities
    ark/                 ByteDance Ark provider (config, client, request builder)
  services/              Business logic (generation pipeline)
  storage/               Local file persistence
  db/                    Prisma client
prisma/                  Schema & migrations (DB file is gitignored)
storage/                 Local images (gitignored)
```

## Privacy & Git Safety

The following are **gitignored** and will never be pushed:

- `.env` and all env variants (API keys)
- `storage/` (your generated images and reference uploads)
- `prisma/*.db` (your prompts and generation history)
- `assets/` (local screenshots/attachments)
- `app/generated/` (rebuilt on `npm install`)

Only commit `.env.example` — never your real `.env`.

## Adding a New Model

1. Create `lib/providers/models/your-model.ts` with a `ModelDefinition`
2. Register it in `lib/providers/models/index.ts`
3. UI and API pick it up automatically via the model registry

## Cost

You pay ByteDance directly (no Higgsfield fees):

- Seedream 4.5: ~$0.03/image
- Seedream 5.0 Pro: ~$0.05–0.10/image (resolution-dependent)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Troubleshooting

| Error | Fix |
|---|---|
| `ARK_API_KEY is not configured` | Add key to `.env` |
| `Invalid API key` | Verify key in BytePlus/Volcengine console |
| `Model not activated` | Enable Seedream models in ModelArk console |
| `Image file not found on disk` | Check `storage/` directory exists |

## License

Private / local use.
