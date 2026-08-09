import type { Category, Urgency } from "./types";

/** Product-level constants sourced from the go-live questionnaire. */
export const PRODUCT = {
  name: "DCT Survival Kit",
  tagline: "Recognise. Assess. Escalate.",
  priceLabel: "£20 / year",
  priceAmount: 20,
  currency: "GBP",
  clinicalAuthor: {
    name: "Vyomesh Bhatt",
    role: "Consultant Oral & Maxillofacial Surgeon",
    gmc: "6098153",
    gdc: "79841",
  },
  audience: [
    "OMFS Dental Core Trainees",
    "Trust-grade clinicians",
    "Fellows",
    "Junior doctors rotating through OMFS",
  ],
  contentVersion: "2026.07",
  moduleCount: 36,
  toolkitCount: 18,
} as const;

export const CATEGORIES: {
  key: Category;
  label: string;
  icon: string;
  description: string;
  emergency?: boolean;
}[] = [
  {
    key: "General Skills",
    label: "General Skills",
    icon: "🧭",
    description: "Onboarding, communication, documentation & ward craft",
  },
  {
    key: "Clinical",
    label: "Clinical",
    icon: "🩺",
    description: "Infections, swelling, haemorrhage & everyday OMFS",
  },
  {
    key: "Trauma",
    label: "Trauma",
    icon: "🦴",
    description: "Facial fractures, lacerations & dentoalveolar injury",
  },
  {
    key: "Emergencies",
    label: "Emergencies",
    icon: "🚨",
    description: "Airway, sepsis, sight-threatening & life-threatening",
    emergency: true,
  },
];

export const URGENCY_META: Record<
  Urgency,
  { label: string; className: string; dot: string }
> = {
  Emergency: {
    label: "Emergency",
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dot: "bg-destructive",
  },
  Urgent: {
    label: "Urgent",
    className: "bg-brand-gold/20 text-brand-gold-ink border-brand-gold/40",
    dot: "bg-brand-gold",
  },
  Routine: {
    label: "Routine",
    className: "bg-secondary/12 text-secondary border-secondary/25",
    dot: "bg-secondary",
  },
  Foundation: {
    label: "Foundation",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};

export function categoryMeta(key: Category) {
  return CATEGORIES.find((c) => c.key === key)!;
}
