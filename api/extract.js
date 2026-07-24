// /api/extract.js — Vercel serverless function
// Keeps the Anthropic API key server-side. The client (sales-review.html) posts
// { content: [...] } content blocks (image/text) and gets back Claude's raw response.

const SYSTEM_PROMPT = `You extract order details from a Nextlink Internet order confirmation \u2014 a screenshot image, pasted text, or both. Output ONLY a JSON object. No prose, no markdown fences, no commentary.

OUTPUT SHAPE (all keys always present):
{ "account_number": "", "customer_name": "", "phone": "", "email": "", "address": "", "plan_raw": "", "install_date": "", "flag": "" }

FIELD RULES
- account_number: the LARGE account number shown in the orange "Account #" banner at the top of the page. Do NOT use the small green customer ID number that appears next to the customer's name near "CUSTOMER INFORMATION" \u2014 that is a different number and must never be used for this field, or output anywhere at all.
- customer_name: full name as shown.
- phone: 10 digits, no punctuation. Blank if not shown \u2014 never guess.
- email: as shown, lowercase. Blank if not shown.
- address: "street, city, ST zip" \u2014 drop any trailing ", USA". Use the 2-letter state abbreviation.
- plan_raw: the plan name exactly as shown on the page (e.g. "FiberNEXT500", "NEXT200", "Fiber1000"). Copy it verbatim \u2014 do not normalize, expand, or guess it.
- install_date: YYYY-MM-DD if a specific date is shown. If the page says "No installation date has been selected" or no date appears at all, set this to null \u2014 that is a valid, expected state, not an error.
- flag: a short string naming anything that needs a human's eyes \u2014 an unreadable or ambiguous field, an unusual layout, a likely typo \u2014 or null if nothing stands out. This is for internal review only; never use it to add invented information anywhere else.

RULES
- Copy values verbatim from the source. Never invent, infer, or guess a value that isn't shown.
- A missing field is expected and fine \u2014 leave it blank/null, do not treat it as an error.
- If the input isn't a Nextlink order at all, return {"error":"not_an_order"} instead of the shape above.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set on the server' });
    return;
  }

  try {
    const { content } = req.body;
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: content }]
      })
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
