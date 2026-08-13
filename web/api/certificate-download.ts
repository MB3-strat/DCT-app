import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getAdminSupabase, getUserFromRequest } from "./_shared/supabase.js";

interface CertificateRequestBody {
  fullName?: unknown;
  registrationNumber?: unknown;
}

function parseBody(req: VercelRequest): CertificateRequestBody {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as CertificateRequestBody;
    } catch {
      return {};
    }
  }
  return req.body as CertificateRequestBody;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 90) : "";
}

function drawFittedText({
  page,
  font,
  text,
  x,
  y,
  width,
  maxSize,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  width: number;
  maxSize: number;
}) {
  let size = maxSize;
  while (size > 7 && font.widthOfTextAtSize(text, size) > width) {
    size -= 0.5;
  }

  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + Math.max(0, (width - textWidth) / 2),
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = parseBody(req);
    const fullName = cleanText(body.fullName);
    const registrationNumber = cleanText(body.registrationNumber);

    if (!fullName || !registrationNumber) {
      res.status(400).json({ error: "Certificate name and GDC/GMC number are required." });
      return;
    }

    const user = await getUserFromRequest(new Request("https://local", { headers: req.headers as HeadersInit }));
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("certificate_payment_status,roles,subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    const roles = Array.isArray(profile?.roles) ? profile.roles : [];
    const hasClinicalAccess =
      profile?.subscription_status === "active" ||
      profile?.subscription_status === "trialing" ||
      roles.includes("admin");

    if (!hasClinicalAccess) {
      res.status(403).json({ error: "Active DCT Survival Kit subscription required before downloading the CPD certificate." });
      return;
    }

    if (profile?.certificate_payment_status !== "paid") {
      res.status(403).json({ error: "Certificate payment is required before download." });
      return;
    }

    const filePath = path.join(process.cwd(), "api/assets/dct-survival-kit-certificate.pdf");
    const templatePdf = await readFile(filePath);
    const certificate = await PDFDocument.load(templatePdf);
    const font = await certificate.embedFont(StandardFonts.Helvetica);
    const [page] = certificate.getPages();

    drawFittedText({
      page,
      font,
      text: fullName,
      x: 179,
      y: 567,
      width: 150,
      maxSize: 12,
    });

    drawFittedText({
      page,
      font,
      text: registrationNumber,
      x: 409,
      y: 567,
      width: 118,
      maxSize: 12,
    });

    const pdf = await certificate.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="DCT Survival Kit Certificate.pdf"');
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(Buffer.from(pdf));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Certificate download failed" });
  }
}
