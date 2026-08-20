/**
 * Curated external clinical & professional reference links for DCTs in
 * OMFS. Content sourced verbatim from the "Essential Clinical &
 * Professional External Resources" reference document.
 */

export interface ExternalResourceLink {
  title: string;
  description: string;
  url: string;
}

export interface ExternalResourceCategory {
  category: string;
  links: ExternalResourceLink[];
}

export const EXTERNAL_RESOURCES: ExternalResourceCategory[] = [
  {
    category: "On-Call Essentials",
    links: [
      {
        title: "BNF / BNF for Children (BNFC)",
        description:
          "Medicines information, prescribing, interactions, contraindications and dosing.",
        url: "https://bnf.nice.org.uk/",
      },
      {
        title: "NICE",
        description:
          "National evidence-based guidance, standards and clinical knowledge summaries.",
        url: "https://www.nice.org.uk/guidance",
      },
      {
        title: "SDCEP — Drug Prescribing for Dentistry",
        description:
          "Dental antimicrobial prescribing, analgesia and other medicines guidance.",
        url: "https://www.sdcep.org.uk/published-guidance/drug-prescribing/",
      },
      {
        title: "SDCEP — Management of Acute Dental Problems",
        description:
          "Rapid guidance for pain, swelling, bleeding, trauma, ulceration and other acute dental presentations.",
        url: "https://www.acutedentalproblems.sdcep.org.uk/",
      },
      {
        title: "BAOMS",
        description:
          "British Association of Oral & Maxillofacial Surgeons — specialty resources, guidance and patient information.",
        url: "https://www.baoms.org.uk/",
      },
      {
        title: "BAOS",
        description:
          "British Association of Oral Surgeons — oral surgery professional and educational resources.",
        url: "https://www.baos.org.uk/",
      },
      {
        title: "IADT",
        description:
          "International Association of Dental Traumatology — dental trauma guidelines and resources.",
        url: "https://www.iadt-dentaltrauma.org/",
      },
    ],
  },
  {
    category: "Emergencies & Resuscitation",
    links: [
      {
        title: "Resuscitation Council UK — 2025 Guidelines",
        description:
          "Current UK resuscitation guidance, including adult, paediatric and newborn resuscitation.",
        url: "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines",
      },
      {
        title: "Adult Basic Life Support — RCUK",
        description: "Adult BLS guidance.",
        url: "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-basic-life-support-guidelines",
      },
      {
        title: "Adult Advanced Life Support — RCUK",
        description: "Adult ALS guidance.",
        url: "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-advanced-life-support-guidelines",
      },
      {
        title: "First Aid Guidelines — RCUK",
        description:
          "ABCDE assessment, choking, bleeding and other time-critical first-aid situations.",
        url: "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/first-aid-guidelines",
      },
      {
        title: "Special Circumstances — RCUK",
        description:
          "Special circumstances in cardiac arrest, including anaphylaxis and reversible causes.",
        url: "https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/special-circumstances-guidelines",
      },
    ],
  },
  {
    category: "Surgery, Safety & Patient Care",
    links: [
      {
        title: "Royal College of Surgeons of England",
        description:
          "Surgical standards, guidance, education and professional resources.",
        url: "https://www.rcseng.ac.uk/",
      },
      {
        title: "NHS England — NatSSIPs",
        description:
          "National Safety Standards for Invasive Procedures and surgical safety.",
        url: "https://www.england.nhs.uk/patient-safety/natssips/",
      },
      {
        title: "NHS England",
        description:
          "National NHS clinical, patient-safety and operational guidance.",
        url: "https://www.england.nhs.uk/",
      },
      {
        title: "UKHSA",
        description:
          "Infection prevention, communicable disease and public-health information.",
        url: "https://www.gov.uk/government/organisations/uk-health-security-agency",
      },
    ],
  },
  {
    category: "Dental / Oral Medicine & Specialty Resources",
    links: [
      {
        title: "College of General Dentistry",
        description:
          "Professional standards, guidance and resources for dentistry.",
        url: "https://cgdent.uk/",
      },
      {
        title: "British Society of Oral Medicine (BSOM)",
        description: "Oral medicine and oral mucosal disease resources.",
        url: "https://www.bsom.org.uk/",
      },
      {
        title: "British Association for the Study of Community Dentistry (BASCD)",
        description:
          "Dental public-health and community dentistry resources.",
        url: "https://www.bascd.org/",
      },
      {
        title: "British Association of Head & Neck Oncology (BAHNO)",
        description:
          "Head and neck cancer multidisciplinary and professional resources.",
        url: "https://bahno.org.uk/",
      },
      {
        title: "British Society for Antimicrobial Chemotherapy (BSAC)",
        description:
          "Antimicrobial stewardship and antimicrobial guidance/resources.",
        url: "https://www.bsac.org.uk/",
      },
    ],
  },
  {
    category: "Professional, Ethical & Governance",
    links: [
      {
        title: "General Dental Council — Standards",
        description:
          "Professional standards, scope, consent, confidentiality and raising concerns.",
        url: "https://www.gdc-uk.org/standards-guidance/standards-and-guidance",
      },
      {
        title: "GDC — Useful Organisations for Professionals",
        description:
          "Directory of relevant professional and regulatory organisations.",
        url: "https://www.gdc-uk.org/standards-guidance/standards-and-guidance/gdc-guidance-for-dental-professionals/useful-organisations-for-professionals",
      },
      {
        title: "MHRA Yellow Card",
        description:
          "Report suspected adverse drug reactions, medical-device incidents and other safety concerns.",
        url: "https://yellowcard.mhra.gov.uk/",
      },
      {
        title: "GMC",
        description:
          "Professional standards and guidance relevant to doctors working in OMFS.",
        url: "https://www.gmc-uk.org/",
      },
      {
        title: "NHS England — Patient Safety",
        description: "Patient-safety standards, alerts and national guidance.",
        url: "https://www.england.nhs.uk/patient-safety/",
      },
    ],
  },
  {
    category: "Training & Education",
    links: [
      {
        title: "COPDEND",
        description:
          "Dental postgraduate education, training and workforce resources.",
        url: "https://www.copdend.org/",
      },
      {
        title: "Dental Trauma Guide",
        description: "Additional dental trauma reference resource.",
        url: "https://dentaltraumaguide.org/",
      },
      {
        title: "e-Den",
        description: "Royal College of Surgeons dental e-learning resource.",
        url: "https://www.e-dent.co.uk/",
      },
    ],
  },
];

export const EXTERNAL_RESOURCES_DISCLAIMER =
  "These links provide access to external clinical and professional resources. They are provided for educational and quick-reference purposes and do not replace clinical judgement, senior advice, Trust policies, local antimicrobial guidance, medicines formularies or emergency protocols. Always use the most current version of the relevant guidance.";
