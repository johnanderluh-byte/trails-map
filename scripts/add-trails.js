#!/usr/bin/env node
/**
 * Usage: node scripts/add-trails.js "Trail Name 1" "Trail Name 2" ...
 *
 * Requires: npm install @anthropic-ai/sdk
 * Set env var: ANTHROPIC_API_KEY=sk-ant-...
 *
 * Looks up each trail name via Claude, generates structured JSON,
 * and merges the new entries into trails.json.
 */

import Anthropic from '@anthropic-ai/sdk';
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

const SYSTEM_PROMPT = `You are a knowledgeable backpacking guide with expertise in US wilderness trails.
Given a trail name, return a single JSON object (no markdown, no explanation) with these exact fields:

{
  "name": "exact trail name as provided",
  "location": "Park/Wilderness, State abbreviation",
  "coords": [latitude, longitude],
  "iconic": true or false (is this a well-known bucket-list trail?),
  "region": one of: ${REGIONS.map(r => `"${r}"`).join(', ')},
  "distance": "human-readable distance string e.g. '22 mi RT' or '40 mi loop'",
  "distanceMiles": numeric miles (use midpoint if range, one-way distance for point-to-point),
  "days": "typical trip length e.g. '2–3 days'",
  "season": "best season window e.g. 'July – September'",
  "difficulty": integer 1–5 (1=easy walk, 3=moderate, 5=strenuous/mountaineering),
  "permit": one of: "lottery", "reservation", "walkup", "none",
  "permitNote": "2–3 sentence description of permit process, cost, timing, and key logistics"
}

Rules:
- coords must be accurate GPS coordinates for the trailhead or midpoint
- If a trail is not in the US, still fill in all fields as best you can
- difficulty 4 = hard backpacking, 5 = requires technical skills or extreme elevation
- For permit, use "none" only if truly no permit of any kind is required
- Keep permitNote concise and actionable`;

async function fetchTrailData(client, name) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Trail name: ${name}` }]
  });

  const text = msg.content[0].text.trim();
  // Strip markdown fences if present
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(json);
}

async function main() {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: node scripts/add-trails.js "Trail Name 1" "Trail Name 2" ...');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set.');
    console.error('Set it with: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  const client = new Anthropic();

  // Load existing trails
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
      const trail = await fetchTrailData(client, name);
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

  if (skipped.length > 0) {
    console.log(`   Skipped (duplicates): ${skipped.join(', ')}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
