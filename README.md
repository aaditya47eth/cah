# Terrible hooman

A web-based party game hub for up to 12 players. Pick a game, create a room, share the code, and play on any device.

## Games

- **Terrible hooman** — fill-in-the-blank (in the style of Cards Against Humanity), everyone votes.
- **Dirty Minds** — five dirty-sounding clues, one innocent answer. No scoring. Play online (one player per card is the Reader, sees the answer and reveals clues; everyone shouts guesses) or **pass & play** on one phone.

### Adding Dirty Minds cards

Append to `cards` in `src/data/dirty-minds.json`:

```json
{"id": 31, "answer": "Umbrella", "clues": ["clue 1", "clue 2", "clue 3", "clue 4", "clue 5"]}
```

Each card needs a unique `id`, an `answer`, and 3 to 5 `clues` (dirtiest first, most obvious last). `npm test` checks the format.

## Terrible hooman features

- Real-time multiplayer via Supabase Realtime (no database tables needed)
- Room codes and shareable invite links (`?room=CODE`)
- No judge: everyone plays a card, then everyone votes; the most-voted card scores (ties all score), first to 7 wins
- 2–12 players
- Hardcore mode (18+: decks are half normal, half extreme cards)
- Optional round timer (30/45/60 s) — missing cards are auto-played, missing votes skipped
- Per-round hand exchanges (swap all 6 cards for new ones)
- Vote kick (strict majority of the other players)
- Custom question and answer cards
- Session persistence on refresh (30s reconnect grace period)
- Emoji avatars; name and avatar remembered per browser
- Game history recap
- PWA support

Run `npm test` for the unit tests (game rules and decks).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Supabase](https://supabase.com/) project (free tier works)

## Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd cah

# Install dependencies
npm install

# Copy env file and fill in your Supabase credentials
cp .env.example .env
```

Edit `.env` with your Supabase project URL and anon key. You can find these in your Supabase dashboard under **Settings > API**.

> **Note:** This app only uses Supabase Realtime (Broadcast + Presence). No database tables or migrations are needed.

```bash
# Start dev server
npm run dev
```

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and click **"New Project"**
3. Import your GitHub repository
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**

Vercel auto-detects Vite. No extra configuration needed.

## Deploy to GitHub Pages

1. Update `vite.config.js` — add your repo name as the base path:

   ```js
   export default defineConfig({
     base: '/<repo-name>/',
     plugins: [react()],
   })
   ```

2. Install the deploy plugin:

   ```bash
   npm install -D gh-pages
   ```

3. Add a deploy script to `package.json`:

   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. Since GitHub Pages can't use server-side env vars, you have two options:

   **Option A: Hardcode in a `.env.production` file (don't commit secrets)**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   **Option B: Use GitHub Actions** — Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       permissions:
         pages: write
         id-token: write
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm install
         - run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
   Then add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets in **Settings > Secrets and variables > Actions**.

5. Deploy:
   ```bash
   npm run deploy
   ```

## Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and click **"Add new site" > "Import an existing project"**
3. Select your GitHub repo
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables under **Site settings > Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy

## Tech Stack

- React 18 + Vite
- Supabase Realtime (Broadcast + Presence)
- CSS animations
- Vitest for unit tests
- PWA with service worker
