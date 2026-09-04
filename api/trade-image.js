export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const tradeId = String(req.query?.id || "");
  if (!/^\d+$/.test(tradeId)) return res.status(400).json({ error: "Invalid trade id" });

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing authorization" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!supabaseUrl || !anonKey || !botToken) {
    return res.status(500).json({ error: "Server image configuration is incomplete" });
  }

  try {
    // Query through Supabase using the user's JWT. Existing RLS decides whether
    // this logged-in website account is allowed to read this trade.
    const tradeResponse = await fetch(`${supabaseUrl}/rest/v1/trades?id=eq.${tradeId}&select=photo_file_id&limit=1`, {
      headers: { apikey: anonKey, Authorization: auth, Accept: "application/json" },
    });

    if (!tradeResponse.ok) return res.status(tradeResponse.status).json({ error: "Trade lookup failed" });
    const rows = await tradeResponse.json();
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: "Trade not found" });

    const fileId = rows[0]?.photo_file_id;
    if (!fileId) return res.status(404).json({ error: "No screenshot for this trade" });

    const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const fileInfo = await fileInfoResponse.json();
    const filePath = fileInfo?.result?.file_path;
    if (!fileInfo?.ok || !filePath) return res.status(502).json({ error: "Telegram could not resolve the screenshot" });

    const imageResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!imageResponse.ok) return res.status(502).json({ error: "Telegram screenshot download failed" });

    const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader("Content-Type", imageResponse.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(imageBytes);
  } catch (error) {
    console.error("trade-image error", error);
    return res.status(500).json({ error: "Image request failed" });
  }
}
