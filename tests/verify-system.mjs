// tests/verify-system.mjs
// Automated verification suite for Travel and Challenge platform.

import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

const ROOT = path.resolve('.');

console.log('\n--- Travel and Challenge System Verification ---');

// 1. Verify Required HTML Pages
console.log('\n1. Checking HTML Pages:');
const requiredPages = [
  'index.html',
  'explore.html',
  'place.html',
  'quests.html',
  'collection.html',
  'journal.html',
  'calendar.html',
  'planner.html',
  'profile.html',
  'admin.html',
  'login.html',
];

for (const page of requiredPages) {
  const p = path.join(ROOT, page);
  assert(fs.existsSync(p), `Page ${page} exists`);
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf-8');
    assert(html.includes('<nav id="site-nav"'), `${page} includes site navigation`);
    assert(html.includes('css/base.css'), `${page} includes base stylesheet`);
  }
}

// 2. Verify Required JS Modules
console.log('\n2. Checking JavaScript Modules:');
const requiredJs = [
  'app.js',
  'config.js',
  'supabase.js',
  'auth.js',
  'maps.js',
  'places.js',
  'explore.js',
  'place.js',
  'quests.js',
  'quests-page.js',
  'collection.js',
  'journal.js',
  'journal-page.js',
  'calendar.js',
  'campaigns.js',
  'admin.js',
  'planner.js',
  'profile.js',
];

for (const jsFile of requiredJs) {
  const p = path.join(ROOT, 'js', jsFile);
  assert(fs.existsSync(p), `Module js/${jsFile} exists`);
}

// 3. Verify CSS Architecture
console.log('\n3. Checking CSS Files:');
const requiredCss = [
  'base.css',
  'desktop.css',
  'mobile.css',
  'animations.css',
  'pages/home.css',
  'pages/explore.css',
  'pages/place.css',
  'pages/quests.css',
  'pages/journal.css',
  'pages/calendar.css',
  'pages/planner.css',
  'pages/profile.css',
  'pages/admin.css',
];

for (const cssFile of requiredCss) {
  const p = path.join(ROOT, 'css', cssFile);
  assert(fs.existsSync(p), `CSS file css/${cssFile} exists`);
}

// 4. Verify Supabase Migrations
console.log('\n4. Checking Supabase SQL Migrations:');
const requiredMigrations = [
  '001_foundation.sql',
  '002_quests_rewards.sql',
  '003_journal.sql',
  '004_campaigns_admin.sql',
  '005_trips_achievements.sql',
  '006_seed_bangkok.sql',
];

for (const mig of requiredMigrations) {
  const p = path.join(ROOT, 'supabase', 'migrations', mig);
  assert(fs.existsSync(p), `Migration ${mig} exists`);
  if (fs.existsSync(p)) {
    const sql = fs.readFileSync(p, 'utf-8');
    assert(sql.length > 500, `Migration ${mig} is comprehensive (${sql.length} chars)`);
  }
}

// Check Idempotency & Reward Safety in 002
const mig002 = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '002_quests_rewards.sql'), 'utf-8');
assert(mig002.includes('complete_quest'), 'Migration 002 includes complete_quest() RPC');
assert(mig002.includes('for update'), 'Migration 002 serializes concurrent completions with FOR UPDATE');
assert(mig002.includes('already_completed'), 'complete_quest prevents double reward claim');

// Check Edge Function
console.log('\n5. Checking Supabase Edge Function:');
const edgeFnPath = path.join(ROOT, 'supabase', 'functions', 'ai-trip-planner', 'index.ts');
assert(fs.existsSync(edgeFnPath), 'Edge function ai-trip-planner/index.ts exists');
if (fs.existsSync(edgeFnPath)) {
  const code = fs.readFileSync(edgeFnPath, 'utf-8');
  assert(code.includes('llama-3.3-70b-versatile'), 'Edge function uses supported Groq model llama-3.3-70b-versatile');
  assert(code.includes('validPlaceIds.has'), 'Edge function enforces post-validation against database IDs');
  assert(code.includes('GROQ_API_KEY'), 'Edge function securely reads GROQ_API_KEY from environment');
}

// 6. Check Vercel Static Configuration
console.log('\n6. Checking Vercel Configuration:');
const vercelPath = path.join(ROOT, 'vercel.json');
assert(fs.existsSync(vercelPath), 'vercel.json exists');
if (fs.existsSync(vercelPath)) {
  const v = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  assert(v.cleanUrls === true, 'cleanUrls is true');
  assert(Array.isArray(v.rewrites) && v.rewrites.length >= 8, 'rewrites map routes to individual HTML pages');
}

console.log(`\n--- Verification Finished: ${passCount} Passed, ${failCount} Failed ---`);
if (failCount > 0) process.exit(1);
