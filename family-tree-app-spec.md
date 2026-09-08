# Family Tree App — Build Specification

> This document is a complete technical + product spec intended to be handed to an AI coding assistant (e.g. Claude Code, Cursor, GitHub Copilot Workspace) to scaffold and build the full application. It covers architecture, database schema, API design, UI requirements, and a phased build plan.

---

## 1. Project Overview

Build a modern, web-based family tree application that lets families collaboratively document their genealogy: people, relationships, life events, photos, documents, and stories. Target scale: ~2000 registered users, modest concurrent load (50-200 concurrent peak).

**Core value proposition:** An intuitive, visual, interactive family tree builder with rich per-person profiles, flexible relationship modeling (adoption, remarriage, step-family), and collaborative editing with role-based access.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Tree visualization | React Flow (custom node/edge types) |
| Backend | Node.js + NestJS (or Express if simpler is preferred) |
| Database | PostgreSQL |
| ORM | Prisma |
| File storage | Cloudflare R2 or AWS S3 (S3-compatible) |
| Cache / Queue | Redis (sessions, tree-graph cache, background jobs via BullMQ) |
| Auth | Auth.js (NextAuth) — email/password + Google OAuth |
| Image processing | Sharp (resize/thumbnail) |
| Audio/video processing | ffmpeg (transcode, thumbnail/waveform generation) |
| Hosting | Single VPS (4 vCPU / 8GB RAM) — e.g. Hetzner, DigitalOcean, or Railway/Render |
| CDN | Cloudflare in front of static assets and media |

Deploy as a **modular monolith** — do not split into microservices. This scale does not need it.

---

## 3. Database Schema

Use PostgreSQL with Prisma. Key design principle: relationships are modeled as a **flexible edge table**, not hardcoded `mother_id`/`father_id` columns — this supports adoption, step-parents, same-sex parents, and multiple marriages cleanly. Ancestry, descendants, and siblings are *derived* via recursive queries, not duplicated data.

```sql
-- Users (app accounts)
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Family trees (a user can own/collaborate on multiple trees)
family_trees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
)

tree_members (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('owner','editor','viewer')),
  invited_at TIMESTAMPTZ,
  UNIQUE(tree_id, user_id)
)

-- People (the tree nodes)
people (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  first_name TEXT NOT NULL,
  last_name TEXT,
  maiden_name TEXT,
  nicknames TEXT[],
  gender TEXT,
  birth_date DATE,
  birth_date_precision TEXT, -- 'exact','year_only','approx','unknown'
  birth_place TEXT,
  death_date DATE,
  death_date_precision TEXT,
  death_place TEXT,
  is_living BOOLEAN DEFAULT true,
  bio TEXT,
  occupation TEXT,
  religion TEXT,
  nationality TEXT,
  languages TEXT[],
  cause_of_death TEXT,
  burial_place TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Relationships (flexible edges between people)
relationships (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  person_a_id UUID REFERENCES people(id),
  person_b_id UUID REFERENCES people(id),
  type TEXT CHECK (type IN ('parent-child','spouse','sibling','adopted','guardian')),
  start_date DATE,   -- e.g. marriage date
  end_date DATE,     -- e.g. divorce date
  status TEXT,       -- 'married','divorced','engaged','widowed'
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Life events (timeline entries)
life_events (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES people(id),
  type TEXT, -- 'education','military','migration','career','religious','other'
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  place TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Media (photos, documents, audio, video)
media (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  person_id UUID REFERENCES people(id),
  uploaded_by UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('photo','document','audio','video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Sources (provenance / fact-checking)
sources (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  title TEXT NOT NULL,
  type TEXT, -- 'document','oral_history','official_record','external_link'
  file_url TEXT,
  notes TEXT,
  confidence TEXT CHECK (confidence IN ('confirmed','likely','family_legend')),
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Many-to-many: link facts (person fields, relationships, events) to sources
fact_sources (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES sources(id),
  target_type TEXT CHECK (target_type IN ('person','relationship','life_event')),
  target_id UUID NOT NULL
)

-- Stories / anecdotes
stories (
  id UUID PRIMARY KEY,
  tree_id UUID REFERENCES family_trees(id),
  person_id UUID REFERENCES people(id),
  title TEXT,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Ancestry queries (recursive CTE example)

```sql
WITH RECURSIVE ancestors AS (
  SELECT person_a_id AS id FROM relationships
  WHERE person_b_id = $1 AND type = 'parent-child'
  UNION
  SELECT r.person_a_id FROM relationships r
  JOIN ancestors a ON r.person_b_id = a.id
  WHERE r.type = 'parent-child'
)
SELECT * FROM people WHERE id IN (SELECT id FROM ancestors);
```

Cache computed tree graphs (nodes + edges for a given tree_id) in Redis, invalidated on any write to `people` or `relationships` for that tree.

---

## 4. API Endpoints

RESTful JSON API. All endpoints (except auth) require a valid session and tree-membership check.

```
Auth
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

Trees
POST   /trees                          create a tree
GET    /trees                          list trees user belongs to
GET    /trees/:id                      tree metadata
PATCH  /trees/:id                      rename/update tree
DELETE /trees/:id                      delete tree (owner only)
POST   /trees/:id/members              invite member (email + role)
PATCH  /trees/:id/members/:userId      change role
DELETE /trees/:id/members/:userId      remove member
GET    /trees/:id/graph                full graph: all people + relationships for rendering

People
POST   /trees/:id/people               add person
GET    /people/:id                     get person detail (profile, events, media, stories)
PATCH  /people/:id                     edit person
DELETE /people/:id                     delete person (cascades relationships/events/media refs)

Relationships
POST   /relationships                  create relationship
PATCH  /relationships/:id              edit (dates, status)
DELETE /relationships/:id              remove relationship

Life Events
POST   /people/:id/events              add life event
PATCH  /events/:id                     edit event
DELETE /events/:id                     delete event

Media
POST   /people/:id/media               upload photo/document/audio/video
DELETE /media/:id                      delete media
GET    /trees/:id/media                gallery view across whole tree

Stories
POST   /people/:id/stories             add story/anecdote
PATCH  /stories/:id                    edit story
DELETE /stories/:id                    delete story

Sources
POST   /trees/:id/sources              add source
POST   /sources/:id/link               link source to a fact (person/relationship/event)
DELETE /sources/:id                    delete source

Export
GET    /trees/:id/export?format=gedcom
GET    /trees/:id/export?format=pdf
```

---

## 5. Access Control

- Roles per tree: **owner** (full control incl. delete tree, manage members), **editor** (add/edit people, relationships, events, media — cannot delete tree or manage members), **viewer** (read-only).
- Invitations sent via emailed link scoped to a specific `tree_id` + role.
- **Living-person privacy rule**: when `people.is_living = true`, hide `birth_date`, `birth_place`, and `bio` fields from users with `viewer` role who are outside the immediate family (configurable privacy setting per tree, default: viewers see names/relationships only for living people, full detail for deceased).

---

## 6. UI / UX Requirements

### Design language
- Warm, modern, heritage-appropriate: soft neutral palette (cream/warm-gray backgrounds, muted accent colors — terracotta, sage, or navy), generous whitespace, rounded cards.
- Typography: a serif or humanist font for names/headers (warmth), clean sans-serif for body text.
- Avoid a cold "corporate SaaS" feel — this is a personal, emotional product.

### Key screens

1. **Tree canvas view** (primary screen)
   - Interactive pan/zoom graph built with React Flow.
   - Each person = a card node (photo thumbnail, name, birth-death years).
   - Relationship edges: solid line for parent-child, different style/color for spouse.
   - Click a node → opens person detail panel (slide-over from right, not full navigation away).
   - Toolbar: add person, search/jump to person, zoom controls, layout toggle (horizontal pedigree vs. vertical).

2. **Person detail panel** (slide-over or modal)
   - Tabs: Overview | Timeline | Photos & Documents | Stories | Sources
   - Overview: name, dates, places, bio, occupation, religion, nationality — inline-editable for editors.
   - Timeline: chronological life events, add/edit inline.
   - Photos & Documents: grid gallery with lightbox viewer, drag-drop upload.
   - Stories: list of anecdotes with author attribution.
   - Sources: linked source list with confidence badges (✅ confirmed / 🟡 likely / 📖 family legend).

3. **Add relationship flow**
   - From a person node: contextual "+" button → "Add Parent / Add Spouse / Add Child / Add Sibling".
   - Opens a small form (existing person search-and-link, or create new person inline).
   - Tree auto-repositions/animates to include the new node.

4. **Tree/member management**
   - List of trees the user belongs to (dashboard/home).
   - Per-tree settings: rename, manage members & roles, privacy settings, export.

5. **Mobile view**
   - Tree canvas collapses to a vertical pedigree/list view on small screens (full graph pan/zoom is hard on mobile).
   - Person detail becomes a full-screen view instead of a slide-over.

### Component library
Use shadcn/ui components (cards, dialogs, tabs, forms, dropdowns) as the base, themed with Tailwind custom colors to match the warm palette above.

---

## 7. Infrastructure & Deployment

- **Server**: single VPS, 4 vCPU / 8GB RAM (e.g. Hetzner CX41 or DigitalOcean equivalent) — sufficient for ~2000 users / 50-200 concurrent.
- **Database**: managed PostgreSQL if budget allows (e.g. Neon, Supabase, or DO Managed DB) for automated backups; otherwise self-hosted Postgres with daily `pg_dump` cron to object storage.
- **Object storage**: Cloudflare R2 (no egress fees) or S3, for photos/documents/audio/video.
- **CDN**: Cloudflare in front of the app and media bucket.
- **Redis**: for session cache, tree-graph cache, and background job queue (BullMQ) for thumbnail/transcode jobs.
- **Backups**: daily Postgres dump + versioned object storage bucket. This data is emotionally irreplaceable — treat backup reliability as a first-class requirement, not an afterthought.
- **Environment separation**: staging + production, even at this scale, to avoid testing schema migrations directly on real family data.

---

## 8. Nice-to-Have Features (post-MVP)

- **GEDCOM import/export** — industry-standard genealogy format, enables migration from Ancestry.com/MyHeritage.
- **Audio/video story recordings** — record or upload relatives telling stories, attached to their profile; ffmpeg for transcoding + waveform/thumbnail generation.
- **PDF export** — printable family tree chart or full person report.
- **DNA match integration** — later-stage, optional, likely out of scope for MVP.
- **Family recipes / traditions** — freeform "story" entries tagged as recipes/traditions, linked to a person.
- **Coat of arms / crest upload** — simple media attachment to the tree itself (not a person).

---

## 9. Phased Build Plan

### Phase 1 — MVP
- Auth (register/login)
- Create tree, invite members with roles
- Add/edit/delete people (core identity fields only)
- Create relationships (parent-child, spouse)
- Tree canvas visualization (React Flow, basic node/edge rendering)
- Person detail panel: Overview tab only

### Phase 2 — Rich profiles
- Life events / timeline tab
- Photo/document upload + gallery (lightbox)
- Stories tab
- Living-person privacy rules

### Phase 3 — Provenance & polish
- Sources + confidence badges, fact-linking
- Mobile-responsive vertical tree view
- Search/jump-to-person
- Export: GEDCOM + PDF

### Phase 4 — Nice-to-haves
- Audio/video recordings
- Family recipes/traditions
- Coat of arms upload
- DNA match integration (if pursued)

---

## 10. Instructions for the AI Builder

When implementing this spec:
1. Scaffold the Next.js frontend and NestJS (or Express) backend as separate packages in a monorepo (e.g. using pnpm workspaces or Turborepo), or a single Next.js app with API routes if a simpler setup is preferred.
2. Set up Prisma with the schema in Section 3 first, and run initial migrations before building any UI.
3. Build Phase 1 features end-to-end (auth → tree creation → people → relationships → basic canvas) before touching Phase 2+ features.
4. Use React Flow for the tree canvas from the start — do not build a custom SVG graph renderer from scratch.
5. Implement the recursive-CTE ancestry queries in Section 3 as reusable backend service functions, not inline in route handlers.
6. Apply the warm/modern design language from Section 6 consistently — avoid default shadcn/ui gray theme without customization.
7. Enforce role-based access control (Section 5) at the API layer, not just hidden in the UI.
8. Set up daily automated backups (Section 7) before allowing real user data into the system.
