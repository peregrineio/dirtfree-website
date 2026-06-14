// Dirt Free Carpet — chat lead / transcript email handler (Vercel serverless function)
// Zero dependencies: uses global fetch + Resend REST API.
// Required env var:  RESEND_API_KEY
// Optional env vars: LEAD_TO   (default dirtfreecarpet@pm.me)
//                    LEAD_FROM (default "Dirt Free Carpet <leads@dirtfreecarpet.com>")
//                              NOTE: the FROM domain must be verified in Resend.

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.LEAD_TO || 'dirtfreecarpet@pm.me';
    const from = process.env.LEAD_FROM || 'Dirt Free Carpet <leads@dirtfreecarpet.com>';

    const type = body.type === 'human' ? 'Human callback request' : 'Booking request';
    const name = body.name || '(not given)';
    const contact = body.contact || '(not given)';

    const transcript = Array.isArray(body.transcript)
      ? body.transcript.map((m) => `<p style="margin:4px 0"><strong>${m.role === 'user' ? 'Visitor' : 'Bot'}:</strong> ${esc(m.text)}</p>`).join('')
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#b08a4a;margin:0 0 4px">New chat lead — ${esc(type)}</h2>
        <p style="color:#555;margin:0 0 16px">From the Dirt Free Carpet website chat assistant.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Name</td><td style="padding:6px 8px">${esc(name)}</td></tr>
          <tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Contact</td><td style="padding:6px 8px">${esc(contact)}</td></tr>
          ${body.service ? `<tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Service</td><td style="padding:6px 8px">${esc(body.service)}</td></tr>` : ''}
          ${body.zip ? `<tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">ZIP / City</td><td style="padding:6px 8px">${esc(body.zip)}</td></tr>` : ''}
          ${body.topic ? `<tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Note</td><td style="padding:6px 8px">${esc(body.topic)}</td></tr>` : ''}
          <tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Page</td><td style="padding:6px 8px">${esc(body.url || body.page || '')}</td></tr>
          <tr><td style="padding:6px 8px;background:#f4f0e7;font-weight:bold">Time</td><td style="padding:6px 8px">${esc(body.ts || '')}</td></tr>
        </table>
        ${transcript ? `<h3 style="margin:18px 0 6px;color:#333">Conversation</h3><div style="font-size:13px;color:#444;border-left:3px solid #d8b27a;padding-left:12px">${transcript}</div>` : ''}
      </div>`;

    if (!apiKey) {
      // No key configured yet — log so it's visible in Vercel logs, but don't error the widget.
      console.log('[dfc-lead] RESEND_API_KEY missing. Lead payload:', JSON.stringify(body));
      res.status(200).json({ ok: true, queued: false, note: 'email not configured' });
      return;
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: /\S+@\S+\.\S+/.test(contact) ? contact : undefined,
        subject: `New chat lead — ${name} (${type})`,
        html
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('[dfc-lead] Resend error', r.status, txt);
      res.status(200).json({ ok: false, sent: false }); // never break the widget UX
      return;
    }
    res.status(200).json({ ok: true, sent: true });
  } catch (e) {
    console.error('[dfc-lead] handler error', e);
    res.status(200).json({ ok: false });
  }
};
