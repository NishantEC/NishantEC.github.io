import healthifymeLogo from '../assets/logo-healthifyme.png';
import ticketeLogo from '../assets/logo-tickete.png';

export const profile = {
  name: 'Nishant Gupta',
  role: 'Frontend Engineer',
  location: 'Bangalore, India',
  status: 'Open to interesting work',
  email: 'guptanishant1307@gmail.com',
  socials: {
    github: 'https://github.com/NishantEC',
    linkedin: 'https://www.linkedin.com/in/nishantxgupta/',
    x: 'https://x.com/NishCodes',
  },
};

export type Job = {
  company: string;
  title: string;
  period: string;
  location: string;
  logo?: string;
  bullets: { text: string; tooltip?: string }[];
  stack: string[];
  /** Earlier roles at the same company, rendered below on a connector rail. */
  previously?: { period: string; title: string }[];
};

export const experience: Job[] = [
  {
    company: 'Healthifyme',
    // TODO(nishant): confirm when the title changed — 2025 is a placeholder.
    // Resume (2024) says Frontend Developer; GitHub bio now says Software Engineer.
    title: 'Software Engineer',
    period: '2025 - Present',
    location: 'Bangalore',
    logo: healthifymeLogo,
    previously: [{ period: '2024 - 2025', title: 'Frontend Developer' }],
    bullets: [
      {
        text: 'Built the interface for RIA, an AI health coach, including the full onboarding flow for new users.',
        tooltip: 'RIA answers health questions in chat and coaches users through their plan.',
      },
      {
        text: 'Designed and shipped a Diagnostic Panel that lets users upload and analyse their metabolic panel through chat.',
      },
      {
        text: 'Built dynamic food pages at 100% SEO, serving thousands of pages of nutritional data.',
        tooltip:
          'Generated per-food pages with structured data, each scoring 100 on Lighthouse SEO.',
      },
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Jotai', 'PandaCSS'],
  },
  {
    company: 'Tickete',
    title: 'Frontend Engineer',
    period: '2023 - 2024',
    location: 'Bangalore',
    logo: ticketeLogo,
    bullets: [
      { text: 'Built modular, customisable UI components that cut development time by 30%.' },
      {
        text: 'Tripled SEO and accessibility across 200+ product pages, lifting organic traffic by 50%.',
      },
      {
        text: 'Implemented a multi-variant booking system that raised sales 15% and repeat visits 20%.',
      },
    ],
    stack: ['React', 'TypeScript', 'SCSS', 'RestAPI'],
  },
  {
    company: 'BleedingEdge Technologies',
    title: 'Frontend Developer',
    period: '2023',
    location: 'Mumbai',
    bullets: [
      { text: 'Developed and shipped user-facing features across the company web applications.' },
      { text: 'Optimised applications for speed, scalability and cross-browser compatibility.' },
    ],
    stack: ['Angular', 'Ionic', 'Capacitor'],
  },
];

/**
 * Projects and stash entries used to live here as literals. They're now MDX
 * files under `src/content`, loaded through `content/collections.ts`, so a
 * project carries its own case study rather than a single tagline. Identity and
 * work history stay here: they aren't documents, and nothing renders them as
 * prose.
 */
