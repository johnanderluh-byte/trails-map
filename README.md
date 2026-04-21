# Great American Backpacking Trails — An Interactive Atlas

An interactive map of 37 US backpacking routes with permit info, difficulty ratings, and personal tracking.

**Live site:** [your-username.github.io/trails-map](https://your-username.github.io/trails-map)

## Features

- 37 trails across 8 regions, with hover/click popups
- Filter by region, difficulty, permit type, and iconic status
- Sort by name, difficulty, or distance
- "Want to go" / "Been there" toggles — saved in browser localStorage
- Paper/field-notes aesthetic (Fraunces + JetBrains Mono)

## Local development

The page fetches `trails.json` via HTTP, so you need a local server:

```bash
npx serve .
# then open http://localhost:3000
```

Or use the VS Code Live Server extension.

## Adding trails with AI

The `scripts/add-trails.js` script uses Claude to automatically generate trail data from names.

**Setup (one time):**
```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # Windows: set ANTHROPIC_API_KEY=sk-ant-...
```

**Add trails:**
```bash
node scripts/add-trails.js "Boundary Waters Canoe Area" "Havasupai" "Long Trail"
```

The script will:
1. Look up each trail via Claude (haiku model, ~$0.001/trail)
2. Skip any already in `trails.json`
3. Merge new entries and save the file

After adding, refresh the page to see new markers.

## Trail data structure

Each entry in `trails.json`:

```json
{
  "name": "The Enchantments",
  "location": "Alpine Lakes Wilderness, WA",
  "coords": [47.474, -120.813],
  "iconic": true,
  "region": "Pacific Northwest",
  "distance": "18 mi thru",
  "distanceMiles": 18,
  "days": "2–3 days",
  "season": "July – mid-October",
  "difficulty": 5,
  "permit": "lottery",
  "permitNote": "Core Enchantment Zone = hardest permit in the PNW..."
}
```

**Regions:** Sierra Nevada · Pacific Northwest · Cascades/Oregon · Rocky Mountains · Southwest · Northern Rockies · Alaska · East/Southeast

**Permit types:** `lottery` · `reservation` · `walkup` · `none`

## Deployment (GitHub Pages)

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create trails-map --public --push --source=.
gh api repos/{owner}/trails-map/pages -X POST -f source='{"branch":"main","path":"/"}'
```
