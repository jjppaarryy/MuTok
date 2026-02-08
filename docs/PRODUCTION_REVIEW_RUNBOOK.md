# TikTok production review runbook

Do these steps **in this exact order** before submitting for production review.

---

## 1) Deploy the site at the root you’ll submit

**Goal:** Reviewer clicks the Website URL and can navigate to:

- Home  
- How it works  
- Demo  
- Support  
- Terms  
- Privacy  

**Non-negotiables:**

- No 404s anywhere  
- No placeholders like “coming soon”  
- No auth gate  
- Footer shows Terms/Privacy without a menu (already in place)  

TikTok explicitly rejects “unfinished/testing” looking submissions.

**Action:** Deploy `public/landing/` so the site root serves `index.html` and the nav works. Recommended: GitHub Pages from a `gh-pages` branch (see below).

### Deploy to GitHub Pages (gh-pages branch)

1. **Create a `gh-pages` branch** whose root contains only the site files:
   - `index.html`, `how-it-works.html`, `demo.html`, `support.html`, `styles.css`, `icon.png`, `.nojekyll`
   - **No `README.md`** in the gh-pages root (the steps below copy only `public/landing/*`, so the repo README is never deployed).

2. **In GitHub:** Repo → Settings → Pages → Source: **Deploy from a branch** → Branch: **gh-pages** → Folder: **/(root)** → Save.

3. **Your website root becomes:** `https://jjppaarryy.github.io/MuTok/`  
   Set this as **Website URL** in the TikTok Developer Portal (and Terms/Privacy to your existing URLs).

**Fast way to publish from repo root (run from project root):**

```bash
git checkout -b gh-pages
git rm -rf .
git checkout main -- public/landing
mv public/landing/* .
mv public/landing/.nojekyll . 2>/dev/null || true
rmdir -p public/landing 2>/dev/null || true
git add .
git commit -m "Deploy review site"
git push -u origin gh-pages
git checkout main
```

After this, GitHub Pages serves the root of `gh-pages` as the site. To update the site later, checkout `gh-pages`, replace files from `public/landing/`, commit, push, then checkout `main`.

### What to set in the TikTok Developer Portal

- **Web/Desktop URL (Website URL):** `https://jjppaarryy.github.io/MuTok/` (site root)
- **Terms URL:** your existing terms URL (e.g. `https://jjppaarryy.github.io/mutok-legal/terms`)
- **Privacy URL:** your existing privacy URL (e.g. `https://jjppaarryy.github.io/mutok-legal/privacy`)

Ensure those load publicly and the footer links on every page work.

### Final pre-submit checklist (before you submit)

- [ ] Replace the demo placeholder with a real Loom/YouTube embed  
- [ ] Replace placeholder support email with a real inbox you monitor  
- [ ] Click through nav + footer on mobile (reviewers often check on mobile)  
- [ ] Confirm the site root loads instantly and doesn’t 404  

### 30-second sanity check (incognito)

Open the root URL in an incognito window and confirm:

- Home loads  
- Nav links work  
- Footer Terms/Privacy visible without a menu  
- No placeholders like “coming soon”  
- Demo video actually plays  

When the site is live, paste the final root URL here for a reviewer-style pass on wording and click-paths.

### If the root (/) still shows README or "Single-User MVP"

**Cause:** GitHub is serving `/` from the wrong source. The **gh-pages** branch root contains only: `index.html`, `how-it-works.html`, `demo.html`, `support.html`, `styles.css`, `icon.png`, `.nojekyll` — **no README.md**. So `/` must be served from **gh-pages**, not main.

**Fix (no ambiguity):**

1. Repo → **Settings → Pages** → Build and deployment.
2. Set **Source:** **Deploy from a branch**.
3. Set **Branch:** **gh-pages** (not main). Set **Folder:** **/(root)**. Save.
4. Wait 1–2 minutes, then open `https://jjppaarryy.github.io/MuTok/` in an **incognito** window (or add `?v=123`). Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) if needed.

If Branch was **main**, GitHub was serving the repo root from main (README becomes the index). Once it’s **gh-pages** and **/(root)**, `/` and `/index.html` will both show the landing page.

**Do this in GitHub (the real fix):**

1. Repo → **Settings → Pages**.
2. Set **Source:** Deploy from a branch.
3. Set **Branch:** **gh-pages**. Set **Folder:** **/(root)**. **Save.**
4. Wait until the Pages status shows “Your site is live” (green tick / updated timestamp).
5. Force cold checks: open in **incognito**  
   - `https://jjppaarryy.github.io/MuTok/?v=123`  
   - `https://jjppaarryy.github.io/MuTok/index.html?v=123`  
   When fixed, both show the same black hero landing page.

**Fallback (only if Pages won’t stick today):** In the TikTok Developer Portal, set **Website URL** to `https://jjppaarryy.github.io/MuTok/index.html` temporarily. Prefer fixing `/` so reviewers get the root URL as the site home.

**Once `/` is fixed,** the only review hygiene left: add your real demo video embed on the Demo page, and swap `support@mutok.app` for an inbox you monitor.

---

## 2) Replace placeholders with real artefacts

- Replace the support email on **Support** with a real inbox you’ll monitor (e.g. in `public/landing/support.html`).  
- Embed the real Loom or YouTube demo video in **Demo** (`public/landing/demo.html`).  

Do not submit with `support@mutok.app` or an empty demo embed if they’re not real.

---

## 3) Decide your v1 scope set and stick to it

**Option A (recommended if you can demo analytics cleanly):**

- `user.info.basic`  
- `video.upload`  
- `video.list`  

**Option B (fastest approval if analytics is at all shaky):**

- `user.info.basic`  
- `video.upload`  

(Remove `video.list` for v1 and add it in v2.)

TikTok expect what you request to be used and demonstrated. The app already requests Option A; if you choose B, remove `video.list` from the scope string in `apps/web/app/api/tiktok/connect/route.ts` before reconnect.

---

## 4) Reconnect TikTok after scope changes

Do a fresh OAuth connect in the app so the granted scopes match the scopes you’re submitting. Existing tokens may still have old scopes.

---

## 5) Record the demo video (follow the shot list exactly)

Use the shot list on the Demo page. Two extra tips:

- When you show the TikTok inbox, narrate: *“This is where TikTok delivers the uploaded video for completion.”*  
- If you keep `video.list`, show analytics working on a real posted video (even a test post).  

**Trust signal (include in demo and on How it works):**  
Say or show the line: *"MuTok only accesses data for the authenticated account that explicitly authorises access via TikTok Login."* (Already added to the How it works page.)

TikTok explicitly require a demo video for review.

**Trap:** If you request `video.list` but only demo in sandbox, reviewers may still approve only if the demo clearly shows it running in **production** mode. If you can’t show that, use Option B (drop `video.list` for v1).

---

## 6) Submit with reviewer-friendly copy in the portal

Use short, factual copy:

- Uploads to inbox; user completes in TikTok  
- No engagement automation  
- Analytics only for the authorised user (if you include `video.list`)  

**Trap:** Website URL in the portal must point to the **root** where the nav works. Terms and Privacy links must work and load quickly (no broken or slow links).

---

## Scope justification text (paste into portal)

Choose the block that matches your v1 scope set.

### Option A: `user.info.basic`, `video.upload`, `video.list`

**What the app does:**  
“MuTok is a creator studio for artists and producers that plans and renders music-first TikTok posts locally and uploads them to the user’s TikTok inbox using the Content Posting API. The user completes editing and posts from inside the TikTok app. MuTok can also fetch the user’s video performance metrics to help them learn what content works.”

**Scopes justification:**

- **user.info.basic:** Identify the authorised user and show connection status.  
- **video.upload:** Upload video drafts to the user’s TikTok inbox.  
- **video.list:** Fetch the user’s posted videos and metrics to populate analytics and learning screens.  

**What the app does not do:**  
“MuTok does not publish directly to the feed and does not automate engagement actions (likes, follows, comments, messages).”

---

### Option B: `user.info.basic`, `video.upload` only

**What the app does:**  
“MuTok is a creator studio for artists and producers that plans and renders music-first TikTok posts locally and uploads them to the user’s TikTok inbox using the Content Posting API. The user completes editing and posts from inside the TikTok app.”

**Scopes justification:**

- **user.info.basic:** Identify the authorised user and show connection status.  
- **video.upload:** Upload video drafts to the user’s TikTok inbox.  

**What the app does not do:**  
“MuTok does not publish directly to the feed and does not automate engagement actions (likes, follows, comments, messages).”

---

## Sanity-check before submit

Once the site is live:

1. Paste the **final live root URL** and have someone (or an LLM) do a reviewer-style pass:  
   - Do all nav links work?  
   - Are Terms/Privacy visible and correct?  
   - Does the copy align with the scopes you chose?  
   - Does anything read “personal tool” or “automation bot”?  

2. Confirm the **Website URL** in the TikTok portal is that root (not a subpath or a different repo than where Terms/Privacy are hosted).
