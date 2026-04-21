#!/usr/bin/env node
/**
 * Usage: node scripts/add-trails.js "Trail Name 1" "Trail Name 2" ...
 *
 * Requires: npm install @google/generative-ai
 * Get a free API key at: https://aistudio.google.com/apikey
 * Set env var: GEMINI_API_KEY=your-key-here
 *
 * Free tier: 1,500 requests/day — plenty for adding trails.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRAILS_FILE = path.join(__dirname, '..', 'trails.json');

const REGIONS = [
  'Sierra Nevada',
  'Pacific Northwest',
  'Cascades/Oregon',
  'Rocky Mountains',
  'Southwest',
  'Northern Rockies',
  'Alaska',
  'East/Southeast'
];

const PROMPT_TEMPLATE = (name) => `
You are a knowledgeable backpacking guide. Given this trail name, return ONLY a valid JSON object with no markdown or explanation.

Trail name: ${name}

Required fields:
{
  "name": "${name}",
  "location": "Park/Wilderness, State abbreviation",
  "coords": [latitude, longitude],
  "iconic": true or false,
  "region": one of: ${REGIONS.map(r => `"${r}"`).join(', ')},
  "distance": "human-readable e.g. '22 mi RT' or '40 mi loop'",
  "distanceMiles": numeric (midpoint if range; one-way for point-to-point),
  "days": "typical trip e.g. '2–3 days'",
  "season": "best window e.g. 'July – September'",
  "difficulty": integer 1–5 (1=easy, 3=moderate, 5=strenuous/technical),
  "permit": one of: "lottery", "reservation", "walkup", "none",
  "permitNote": "2–3 sentences on permit process, cost, timing, key logistics"
}
`;

async function fetchTrailData(model, name) {
  const result = await model.generateContent(PROMPT_TEMPLATE(name));
  const text = result.response.text().trim();
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(json);
}

async function main() {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: node scripts/add-trails.js "Trail Name 1" "Trail Name 2" ...');
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY not set.');
    console.error('Get a free key at: https://aistudio.google.com/apikey');
    console.error('Then run: set GEMINI_API_KEY=your-key-here');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  let existing = [];
  if (fs.existsSync(TRAILS_FILE)) {
    existing = JSON.parse(fs.readFileSync(TRAILS_FILE, 'utf8'));
  }
  const existingNames = new Set(existing.map(t => t.name.toLowerCase()));

  const added = [];
  const skipped = [];

  for (const name of names) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`⏭  Skipping "${name}" — already in trails.json`);
      skipped.push(name);
      continue;
    }

    process.stdout.write(`🔍 Looking up "${name}"...`);
    try {
      const trail = await fetchTrailData(model, name);
      existing.push(trail);
      added.push(trail.name);
      console.log(` ✓ Added (${trail.region}, difficulty ${trail.difficulty})`);
    } catch (err) {
      console.log(` ✗ Failed: ${err.message}`);
    }
  }

  if (added.length > 0) {
    fs.writeFileSync(TRAILS_FILE, JSON.stringify(existing, null, 2));
    console.log(`\n✅ trails.json updated — ${existing.length} total trails`);
    console.log(`   Added: ${added.join(', ')}`);
  } else {
    console.log('\nNo new trails added.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
