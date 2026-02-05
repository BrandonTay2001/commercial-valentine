# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on code in this repository.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

Required environment variables:
- `VITE_MAPBOX_TOKEN` - Mapbox GL access token
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_GOOGLE_PLACES_KEY` - Google Places API key

For Stripe integration (Edge Function):
- Set `STRIPE_SECRET_KEY` via Supabase secrets (not in `.env`)

**Fresh Supabase Project Setup**:
1. Create a new Supabase project at dashboard.supabase.com
2. Run `supabase db push` to apply `supabase/migrations/20250205_initial_schema.sql`
3. Create a storage bucket named `memories` in Supabase Dashboard
4. Deploy Edge Function: `supabase functions deploy validate-stripe-session --no-verify-jwt`

## Architecture Overview

### Multi-User Design

This is a multi-tenant application where each couple gets their own unique site at `/:path`. Data is isolated at the couple level via `couple_id` foreign keys and RLS policies.

**Key Concepts:**
- **Couples**: Each registered couple has a unique `path` (URL slug) and `couple_id`
- **Auth**: Supabase Auth with email/password. Users belong to exactly one couple.
- **Data Scoping**: All checkpoints, memories, and settings are scoped to `couple_id`
- **Public Sites**: `/:path` routes are publicly viewable (no auth required)
- **Admin Dashboard**: `/admin` requires auth and shows only the user's couple data

### Database Schema

```
couples (id, user_id, path, couple_name, stripe_subscription_id, ..., is_active)
  ├── checkpoints (id, couple_id FK, title, latitude, longitude, ...)
  │   └── memories (id, couple_id FK, checkpoint_id FK, image_url, ...)
  └── Settings (hero_*, map_*, footer_* columns merged into couples)
```

**Migration**: For a brand new Supabase project, run `supabase/migrations/20250205_initial_schema.sql` to set up the schema from scratch.

**Note**: The old migration `20250205_add_multi_user_support.sql` was for migrating an existing database and should not be used for fresh projects.

**Entry & Routing:**
- `src/main.jsx` - React entry with error boundaries
- `src/App.jsx` - React Router setup with routes: `/`, `/album`, `/login`, `/onboarding`, `/:path`, `/admin`

**Pages:**
- `src/pages/Home.jsx` - Landing page (uses demo couple data)
- `src/pages/Album.jsx` - Photo album display
- `src/pages/Login.jsx` - Supabase Auth sign in
- `src/pages/Onboarding.jsx` - Two-step flow: account creation → couple name & path selection
- `src/pages/CoupleSite.jsx` - Dynamic route component for `/:path` - renders couple-specific site
- `src/pages/Admin.jsx` - Protected admin dashboard for managing couple's content

**Contexts:**
- `src/contexts/CoupleContext.jsx` - Provides couple state (couple, coupleId, loading, error, fetchCoupleByPath, createCouple, updateCouple, checkPathAvailability)

**Key Components:**
- `src/components/StoryMap.jsx` - Interactive Mapbox globe with location markers (accepts `coupleId` prop)
- `src/components/PhotoJournal.jsx` - Photo journal interface (accepts `coupleId` prop)
- `src/components/HeroSection.jsx` - Hero section with animations
- `src/components/ProtectedRoute.jsx` - Route wrapper requiring Supabase Auth session

**Admin Components:**
- `src/components/admin/Sidebar.jsx` - Admin sidebar with checkpoint list (accepts `couple`, `onLogout` props)
- `src/components/admin/SiteSettings.jsx` - Site settings editor (accepts `couple` prop)
- `src/components/admin/LocationEditor.jsx` - Checkpoint editor (accepts `coupleId` prop)
- `src/components/admin/MemoriesEditor.jsx` - Photo/note editor (accepts `coupleId` prop)

## Tech Stack

- **React 19** + **Vite**
- **React Router DOM 7** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Mapbox GL + react-map-gl** - Interactive 3D globe mapping
- **Supabase** - Backend/auth/database with Row Level Security (RLS)

## Stripe Integration

**Edge Function**: `supabase/functions/validate-stripe-session/index.ts`
- Validates Stripe checkout sessions before allowing account creation
- Deployed via: `supabase functions deploy validate-stripe-session --no-verify-jwt`

**Stripe Success Redirect URL**: `https://your-domain.com/onboarding?session_id={CHECKOUT_SESSION_ID}`

**Flow**: Stripe Payment Link → redirect to `/onboarding?session_id=xxx` → validate session → create account → choose path → redirect to `/admin` (not their site)

Users land on the admin dashboard after signup, where they can add content before viewing their site at `/:path`.

## Linting

ESLint is configured in `eslint.config.js` with a custom rule:
- `no-unused-vars` ignores constants starting with `^[A-Z_]` (allows uppercase-only constants)

## Design System

Dark Valentine aesthetic with:
- Deep maroon/black background (`bg-[#0f0505]`)
- Glass-morphism cards with backdrop blur
- Red/rose accent colors
- Font families: Inter (body), Playfair Display (headings), Instrument Serif (display)

## Important Notes

- All data queries MUST filter by `couple_id` (passed via props or from CoupleContext)
- When creating new checkpoints or memories, always include `couple_id`
- The `/:path` route is public - no auth required to view a couple's site
- The `/admin` route requires Supabase Auth and only shows the authenticated user's couple data
- The landing page at `/` uses the "demo" couple (path='demo') for showcase content
