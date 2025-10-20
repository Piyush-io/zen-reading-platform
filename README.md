# Zen Reading Platform

A personal reading platform for uploading, organizing, and annotating documents with AI-powered insights.

## Features

- Upload and store documents (PDF, text files)
- Annotate and highlight text with custom colors
- AI-generated explanations for selected text
- Text search and browsing
- User authentication
- Personal article library management

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Convex (database & serverless functions)
- **AI:** Groq API (text explanations), Mistral AI
- **Auth:** Clerk (JWT-based authentication via issuer domain)
- **File Upload:** UploadThing
- **UI:** Radix UI components

## Prerequisites

- Node.js 18+ and pnpm
- Convex account (https://convex.dev)
- Clerk account (https://clerk.com)
- Groq API key (https://console.groq.com)
- UploadThing account (https://uploadthing.com)

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/Piyush-io/zen-reading-platform.git
cd zen-reading-platform
pnpm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
CLERK_SECRET_KEY=<your-clerk-secret>
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-domain>
UPLOADTHING_TOKEN=<your-uploadthing-token>
```

Create `convex/.env.local`:

```env
GROQ_API_KEY=<your-groq-api-key>
MISTRAL_API_KEY=<your-mistral-api-key>
```

### 3. Set Up Convex

```bash
npx convex deploy
```

Follow the prompts to create a Convex project and link your backend.

### 4. Configure Clerk

1. Go to Clerk dashboard
2. Create a new application
3. Add your development URL (http://localhost:3000)
4. Copy publishable key and secret key to `.env.local`
5. Find your JWT issuer domain in Clerk settings under API Keys
6. Add `CLERK_JWT_ISSUER_DOMAIN` to `.env.local`

### 5. Get API Keys

**Groq API:**
- Sign up at https://console.groq.com
- Create API key in Settings
- Add to `convex/.env.local`

**UploadThing:**
- Sign up at https://uploadthing.com
- Create app and copy token
- Add to `.env.local`

### 6. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Usage

### Upload Documents

1. Click "Upload" in the navigation
2. Select PDF or text file
3. Document appears in your library

### Read and Annotate

1. Open a document from your library
2. Highlight text to create annotations
3. Choose color for highlight
4. Click "Explain" for AI insights on selected text

### Manage Annotations

- View all annotations in the sidebar
- Delete annotations with the trash icon
- Highlights persist across sessions

## Project Structure

```
.
├── app/               # Next.js app directory
├── components/        # React components
│   └── ui/           # Radix UI primitives
├── convex/           # Convex backend functions
├── lib/              # Utilities and helpers
└── public/           # Static assets
```

## Development

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## Notes

- AI explanations use Groq API via `convex/ai.ts`
- All API keys stored locally in `.env.local` files (not in version control)
- Annotations stored in Convex database
- PDF processing handles base64 encoding/decoding

## Troubleshooting

**"Buffer is not defined" error:** Convex runtime uses browser-compatible APIs. PDFs are processed using base64 encoding with `atob()`.

**Annotations not saving:** Ensure Convex deployment is active and API keys are correctly configured.

**AI explanations failing:** Verify Groq API key has sufficient credits and is active.

## License

Personal project
