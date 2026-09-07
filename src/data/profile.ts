import healthifymeLogo from '../assets/logo-healthifyme.png';
import ticketeLogo from '../assets/logo-tickete.png';

export const profile = {
  name: 'Nishant Gupta',
  role: 'Software Engineer',
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
    title: 'Software Engineer',
    // One span, not two. The `previously` rail exists to show a title changing
    // partway through a stint; with one title throughout it printed the same
    // words twice under themselves.
    period: '2024 - Present',
    location: 'Bangalore',
    logo: healthifymeLogo,
    bullets: [
      {
        text: 'Built RIA’s AI health-coach interface and onboarding.',
        tooltip: 'RIA answers health questions in chat and coaches users through their plan.',
      },
      {
        text: 'Shipped a chat-based panel for uploading and analysing health reports.',
      },
      {
        text: 'Built thousands of food pages with 100 Lighthouse SEO scores.',
        tooltip:
          'Generated per-food pages with structured data, each scoring 100 on Lighthouse SEO.',
      },
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Jotai', 'PandaCSS'],
  },
  {
    company: 'Tickete',
    title: 'Software Engineer',
    period: '2023 - 2024',
    location: 'Bangalore',
    logo: ticketeLogo,
    bullets: [
      {
        text: 'Built the shared component library for the booking product.',
        tooltip: 'Roughly a third off the time it took to stand up a new surface.',
      },
      {
        text: 'Fixed SEO and accessibility across 200+ product pages.',
      },
      {
        text: 'Shipped booking flows for ticket types with separate prices and schedules.',
      },
    ],
    stack: ['React', 'TypeScript', 'SCSS', 'RestAPI'],
  },
  {
    company: 'BleedingEdge Technologies',
    title: 'Software Engineer',
    period: '2023',
    location: 'Mumbai',
    bullets: [
      { text: 'Shipped features across the company’s web apps.' },
      { text: 'Improved performance, scalability, and browser compatibility.' },
    ],
    stack: ['Angular', 'Ionic', 'Capacitor'],
  },
];

/**
 * Projects and skills entries used to live here as literals. They're now MDX
 * files under `src/content`, loaded through `content/collections.ts`, so a
 * project carries its own case study rather than a single tagline. Identity and
 * work history stay here: they aren't documents, and nothing renders them as
 * prose.
 */
