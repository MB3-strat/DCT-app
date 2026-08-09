/**
 * Content models for the DCT Survival Kit.
 * Structured so clinical content can later move to a database or CMS.
 * Clinical wording is imported verbatim from the uploaded handbook/CSV.
 */

export type Category = "General Skills" | "Clinical" | "Trauma" | "Emergencies";

export type Urgency = "Emergency" | "Urgent" | "Routine" | "Foundation";

export type ContentStatus = "published" | "draft" | "needs-review";

export type ToolkitType = "ALGORITHM" | "CHECKLIST" | "FORM" | "REFERENCE";

export interface ModuleSection {
  heading: string;
  items: string[];
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  category: Category;
  urgency: Urgency;
  tags: string[];
  quote: string;
  sections: ModuleSection[];
  version: string;
  clinicalOwner: string;
  lastReviewed: string;
  nextReview: string;
  status: ContentStatus;
}

export interface Toolkit {
  id: string;
  slug: string;
  title: string;
  category: string;
  type: ToolkitType;
  urgency: Urgency;
  icon: string;
  introduction: string;
  steps?: string[];
  items?: string[];
  sections?: ModuleSection[];
  links?: { label: string; url: string }[];
  warnings?: string[];
  escalation?: string;
  relatedModules?: string[];
  sources: string;
  version: string;
  clinicalOwner: string;
  lastReviewed: string;
  nextReview: string;
  status: ContentStatus;
  placeholder?: boolean;
}
