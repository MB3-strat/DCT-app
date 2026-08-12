import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminSupabase, getUserFromRequest } from "./_shared/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await getUserFromRequest(new Request("https://local", { headers: req.headers as HeadersInit }));
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("certificate_payment_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.certificate_payment_status !== "paid") {
      res.status(403).json({ error: "Certificate payment is required before download." });
      return;
    }

    const filePath = path.join(process.cwd(), "api/assets/dct-survival-kit-certificate.pdf");
    const pdf = await readFile(filePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="DCT Survival Kit Certificate.pdf"');
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(pdf);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Certificate download failed" });
  }
}
