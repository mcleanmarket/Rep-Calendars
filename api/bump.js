// /api/bump.js — Vercel serverless function
// Lets an iOS Shortcut increment Doors or Convos with a single request,
// with no app UI involved at all. Talks straight to Firebase's REST API
// (your Realtime Database rules already allow this, same as the browser
// client does) and only ever touches the one field it's asked to bump.

const REPS = ['logan', 'brycen', 'sami', 'connor', 'jacob'];
const FIELDS = ['doors', 'engaged'];
const DB_BASE = 'https://motion-marketing-e1e45-default-rtdb.firebaseio.com';

function todayKeyCentral() {
  // Matches the app's own date bucketing \u2014 Central Time, not server UTC
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const o = {};
  parts.forEach(p => { o[p.type] = p.value; });
  return `${o.year}-${o.month}-${o.day}`;
}

export default async function handler(req, res) {
  const { rep, field, secret } = req.query;

  if (!process.env.BUMP_SECRET || secret !== process.env.BUMP_SECRET) {
    res.status(401).send('Unauthorized');
    return;
  }
  if (!REPS.includes(rep)) {
    res.status(400).send('Unknown rep');
    return;
  }
  if (!FIELDS.includes(field)) {
    res.status(400).send('Unknown field \u2014 use doors or engaged');
    return;
  }

  try {
    const day = todayKeyCentral();
    const base = `${DB_BASE}/counters/${day}/${rep}`;

    // Read just the one field (and firstDoor, if this is a doors bump) \u2014
    // never touches sales or the other field, so it can never clobber
    // something the app itself is doing at the same moment.
    const currentRes = await fetch(`${base}/${field}.json`);
    const current = (await currentRes.json()) || 0;
    const newVal = current + 1;

    const patch = { [field]: newVal };
    if (field === 'doors' && newVal === 1) {
      patch.firstDoor = Date.now(); // matches the app's own fresh-stamp-on-0-to-1 behavior
    }

    await fetch(`${base}.json`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch)
    });

    res.status(200).json({ ok: true, rep, field, newCount: newVal });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
