#!/usr/bin/env node
// =============================================================
// London Tea-Shirt Party — Admin Draw Script
//
// Run this ONCE when everyone has signed up.
// It will:
//   1. Shuffle participants into a random ring
//   2. Save each person's assignment to the database
//   3. Email everyone their magic reveal link
//
// Usage:
//   npm install          (first time only)
//   cp .env.example .env
//   # fill in .env with your credentials
//   node run-draw.js
//
// This script uses your SUPABASE SERVICE KEY (not the anon key).
// Never commit .env to git!
// =============================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer       = require('nodemailer');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL             = process.env.SITE_URL;  // e.g. https://yourname.github.io/secret-shirt
const EMAIL_USER           = process.env.EMAIL_USER; // your Gmail address
const EMAIL_PASS           = process.env.EMAIL_PASS; // Gmail app password (NOT your real password)

// ── Validate env ──────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SITE_URL || !EMAIL_USER || !EMAIL_PASS) {
  console.error('\n❌  Missing environment variables. Check your .env file.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// ── Fisher-Yates shuffle ──────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Email HTML template ───────────────────────────────────────
function makeEmailHtml(giverName, revealUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Comic Sans MS', cursive, sans-serif; background:#fffde7; margin:0; padding:20px; }
    .container { max-width:520px; margin:0 auto; background:white; border:4px dashed #FF1493;
                 border-radius:16px; padding:28px 32px; box-shadow: 6px 6px 0 #9400D3; }
    h1 { color:#FF1493; font-size:2em; margin:0 0 8px; text-align:center; }
    .tagline { text-align:center; color:#888; margin:0 0 20px; }
    .cta { display:block; text-align:center; background:#FF1493; color:white; font-family:'Comic Sans MS',cursive;
           font-size:1.2em; font-weight:bold; padding:14px 28px; border-radius:50px; text-decoration:none;
           margin:24px auto; width:fit-content; border:3px solid black; box-shadow:4px 4px 0 black; }
    .note { font-size:0.85em; color:#aaa; text-align:center; margin-top:16px; }
    .divider { text-align:center; font-size:1.4em; margin:16px 0; letter-spacing:4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>☕ London Tea-Shirt Party 👕</h1>
    <p class="tagline">Your Secret Shirt Assignment Has Arrived!</p>
    <div class="divider">⭐ ✨ 🕵️ ✨ ⭐</div>
    <p>Hello <strong>${giverName}</strong>! 👋</p>
    <p>
      The draw has been made and your mission is ready.<br>
      Click below to find out who you're getting a shirt for:
    </p>
    <a href="${revealUrl}" class="cta">🎉 REVEAL MY PERSON 🎉</a>
    <div class="divider">✨ 🎉 ✨</div>
    <p style="font-size:0.9em; color:#555;">
      <strong>Reminder:</strong> Budget is <strong>under £10</strong> and the shirt must be funny, goofy,
      and work-appropriate. Check their size on the reveal page!
    </p>
    <p class="note">
      📧 Keep this email! The link works any time you need to check again.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ── Main ──────────────────────────────────────────────────────
async function runDraw() {
  console.log('\n🕵️  London Tea-Shirt Party — Draw Script');
  console.log('─'.repeat(44));

  // 1. Fetch all participants
  const { data: participants, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { console.error('❌ Supabase error:', error.message); process.exit(1); }

  console.log(`\n📋 ${participants.length} participant(s) found:`);
  participants.forEach(p => console.log(`   • ${p.name} (${p.shirt_size})`));

  if (participants.length < 2) {
    console.error('\n❌ Need at least 2 participants to run the draw.\n');
    process.exit(1);
  }

  // 2. Guard — don't overwrite an existing draw
  if (participants.some(p => p.assigned_name)) {
    console.error('\n⚠️  Draw has already been run! Assignments exist in the database.');
    console.error('   Aborting to protect existing assignments.\n');
    process.exit(1);
  }

  // 3. Shuffle → ring assignment
  const shuffled = shuffle(participants);
  const assignments = shuffled.map((giver, i) => {
    const receiver = shuffled[(i + 1) % shuffled.length];
    return { giver, receiver };
  });

  console.log('\n🎲 Assignments:');
  assignments.forEach(({ giver, receiver }) =>
    console.log(`   ${giver.name} → 🎁 ${receiver.name} (${receiver.shirt_size})`)
  );

  // 4. Confirm before proceeding
  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const confirmed = await new Promise(resolve => {
    readline.question('\n✅ Proceed? Emails will be sent. (yes/no): ', ans => {
      readline.close();
      resolve(ans.trim().toLowerCase() === 'yes');
    });
  });

  if (!confirmed) { console.log('\n❌ Aborted. Nothing was saved.\n'); process.exit(0); }

  // 5. Save assignments to database
  console.log('\n💾 Saving assignments...');
  for (const { giver, receiver } of assignments) {
    const { error: updateError } = await supabase
      .from('participants')
      .update({ assigned_name: receiver.name, assigned_size: receiver.shirt_size })
      .eq('id', giver.id);

    if (updateError) {
      console.error(`❌ Failed to save assignment for ${giver.name}:`, updateError.message);
      process.exit(1);
    }
    console.log(`   ✓ Saved: ${giver.name} → ${receiver.name}`);
  }

  // 6. Send emails
  console.log('\n📧 Sending emails...');
  for (const { giver } of assignments) {
    const revealUrl = `${SITE_URL}/reveal.html?token=${giver.token}`;
    try {
      await transporter.sendMail({
        from: `"London Tea-Shirt Party ☕👕" <${EMAIL_USER}>`,
        to: giver.email,
        subject: '☕ Your Secret Shirt Assignment is Ready! 👕',
        html: makeEmailHtml(giver.name, revealUrl),
      });
      console.log(`   ✓ Emailed: ${giver.name} (${giver.email})`);
    } catch (emailErr) {
      console.error(`   ❌ Failed to email ${giver.name}:`, emailErr.message);
    }
  }

  console.log('\n🎉 Draw complete! Everyone has been emailed their assignment.\n');
}

runDraw().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
