import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";

function isAllowedPdf(src: string | null): src is string {
  return Boolean(src?.startsWith("/forms/") && src.toLowerCase().endsWith(".pdf"));
}

export default function PdfViewer() {
  const [params] = useSearchParams();
  const src = params.get("src");
  const title = params.get("title") || "Clinical form";

  if (!isAllowedPdf(src)) {
    return (
      <PageContainer className="max-w-4xl">
        <Link to="/app/toolkits/clinical-forms-proformas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clinical forms
        </Link>
        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="font-serif text-2xl font-semibold">PDF not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This form could not be opened inside the app.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/app/toolkits/clinical-forms-proformas" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clinical forms
        </Link>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Open PDF <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h1 className="font-serif text-xl font-semibold">{title}</h1>
        </div>
        <iframe
          title={title}
          src={src}
          className="h-[75vh] min-h-[560px] w-full bg-white"
        />
      </div>
    </PageContainer>
  );
}
