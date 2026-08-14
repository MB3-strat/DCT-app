import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getBearerToken, verifyIdToken } from "./_shared/firebase.js";
import { getDoc } from "./_shared/firestore.js";
import { getSubscriptionRecord, type Env } from "./_shared/stripe.js";
import { CERTIFICATE_TEMPLATE_BASE64 } from "./assets/certificate-template.js";

interface CertificateRequestBody {
  fullName?: unknown;
  registrationNumber?: unknown;
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CertificateRequestBody;
    const fullName = cleanText(body.fullName);
    const registrationNumber = cleanText(body.registrationNumber);

    if (!fullName || !registrationNumber) {
      return Response.json(
        { error: "Certificate name and GDC/GMC number are required." },
        { status: 400 },
      );
    }

    const idToken = getBearerToken(request)!;
    const [profile, record] = await Promise.all([
      getDoc(env.FIREBASE_PROJECT_ID, idToken, `profiles/${user.uid}`),
      getSubscriptionRecord(env.SUBSCRIPTIONS, user.uid),
    ]);

    const roles = Array.isArray(profile?.roles) ? (profile!.roles as string[]) : [];
    const hasClinicalAccess =
      record.subscriptionStatus === "active" ||
      record.subscriptionStatus === "trialing" ||
      roles.includes("admin");

    if (!hasClinicalAccess) {
      return Response.json(
        { error: "Active DCT Survival Kit subscription required before downloading the CPD certificate." },
        { status: 403 },
      );
    }

    if (record.certificatePaymentStatus !== "paid") {
      return Response.json({ error: "Certificate payment is required before download." }, { status: 403 });
    }

    const templatePdf = Uint8Array.from(atob(CERTIFICATE_TEMPLATE_BASE64), (c) => c.charCodeAt(0));
    const certificate = await PDFDocument.load(templatePdf);
    const font = await certificate.embedFont(StandardFonts.Helvetica);
    const [page] = certificate.getPages();

    drawFittedText({ page, font, text: fullName, x: 179, y: 573, width: 150, maxSize: 12 });
    drawFittedText({ page, font, text: registrationNumber, x: 409, y: 573, width: 118, maxSize: 12 });

    const pdf = await certificate.save();

    return new Response(new Blob([pdf as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="DCT Survival Kit Certificate.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Certificate download failed" },
      { status: 500 },
    );
  }
};
