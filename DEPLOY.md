# Deploying Tetris Beats (free, no home-IP exposure)

Architecture:

```
Friend's browser ──► https://<you>.github.io/tetris-beats/   (static — GitHub Pages)
                                  │
                                  └──► https://tetris-beats.<sub>.workers.dev
                                       (API + WebSocket — Cloudflare Worker)
                                                  │
                                                  ├── KV: SCORES (leaderboard JSON)
                                                  └── Durable Object: Room (PvP rooms)
```

Cost: $0/month. No port-forwarding. Your home IP never appears anywhere public.

Local development is unchanged: `node server.js` + open `http://localhost:8765/`. The
`api-base` meta tag in `index.html` stays empty for local checkouts, so the client
hits the local Express server. The GitHub Action substitutes the Worker URL into
the meta tag at deploy time.

---

## One-time setup (~25 min)

### 1. GitHub repo
1. Create a new public repo on github.com (e.g. `tetris-beats`).
2. Push this folder:
   ```sh
   cd ~/alfred-workspace/projects/tetris-hiphop
   git remote add origin git@github.com:<you>/tetris-beats.git
   git add -A && git commit -m "Initial commit"
   git push -u origin main
   ```
3. **Settings → Pages → Source: GitHub Actions** (not "Deploy from branch").

### 2. Cloudflare account
1. Sign up at https://dash.cloudflare.com/sign-up (free, no card).
2. Install wrangler locally and log in:
   ```sh
   npm install -g wrangler
   wrangler login              # opens browser, authorize once
   ```

### 3. Create the KV namespace
```sh
cd worker
wrangler kv:namespace create SCORES
```
Copy the returned `id` (e.g. `abc123…`) into `worker/wrangler.toml`, replacing
both `REPLACE_WITH_KV_ID` placeholders.

### 4. First deploy (manual, to test)
```sh
cd worker
wrangler deploy
```
Wrangler prints the live URL — something like
`https://tetris-beats.<your-cf-subdomain>.workers.dev`. Save it.

Sanity-check:
```sh
curl https://tetris-beats.<sub>.workers.dev/api/health
# → {"ok":true}
```

### 5. Wire the GitHub Action
1. Create a Cloudflare API token at
   https://dash.cloudflare.com/profile/api-tokens → **Create Token** → *Edit
   Cloudflare Workers* template. Copy the token.
2. In GitHub: **Settings → Secrets and variables → Actions**:
   - New **secret**: `CF_API_TOKEN` = the token from step 1
   - New **variable**: `WORKER_URL` = `https://tetris-beats.<sub>.workers.dev`
3. Push a trivial commit (or click *Run workflow* on the Actions tab) to trigger
   the first automated deploy. Both jobs should go green.

### 6. Migrate your existing scores (optional, one-time)
```sh
# From the project root with the local server NOT running:
for entry in $(jq -c '.[]' ~/.openclaw/data/tetris-scores.json); do
  curl -X POST https://tetris-beats.<sub>.workers.dev/api/scores \
    -H 'Content-Type: application/json' -d "$entry"
done
```

---

## Day-to-day

After all of the above is done, your only loop is:

```sh
# Edit index.html, audio/, tiles/, etc.
git add -A && git commit -m "<change>" && git push
```

The GitHub Action redeploys both Pages and Worker in ~30s. Hard-refresh the
github.io URL to bypass Pages' aggressive cache.

If you only changed `worker/index.js`, the deploy still works the same way —
the Action redeploys both pieces unconditionally. That's fine, it's cheap.

---

## Local dev unchanged

`node server.js` still works. The local Express server reads/writes
`~/.openclaw/data/tetris-scores.json`, runs the WS lobby in-memory, and the
client (with empty `api-base`) talks to it on the same origin. Deploy
state and local state are independent — feel free to wipe local scores
without affecting prod.

To preview the prod build locally without deploying:
```sh
cd worker && wrangler dev   # runs Worker on http://localhost:8787
# Then in another tab edit index.html: <meta name="api-base" content="http://localhost:8787">
# Open via `python3 -m http.server` from the repo root, NOT via Express.
```

---

## Troubleshooting

**"Cannot reach server" in the lobby on prod.** The `api-base` meta tag wasn't
substituted. Check the Pages workflow log for the `sed` step, and confirm
`vars.WORKER_URL` is set under repo *Variables* (not *Secrets*).

**Worker deploys but `/api/scores` returns "KV not bound".** The `id` in
`wrangler.toml` is still the placeholder. Run `wrangler kv:namespace list`,
copy the real id in.

**Friend says VS FRIEND lobby spins forever.** Check `wrangler tail` while they
click — you'll see the WS connect attempt and any error. Most common cause:
their browser blocks `wss://` to a `.workers.dev` cert (very rare, only on
heavy enterprise filtering).

**Pages serves stale audio.** Bump a query string on the asset URL or wait ~10
min for Pages' edge cache to flush.
