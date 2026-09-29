import bleedingEdgeLogo from '../assets/logo-bleedingedge.png';
import healthifymeLogo from '../assets/logo-healthifyme.png';
import ticketeLogo from '../assets/logo-tickete.png';

export const profile = {
  name: 'Nishant Gupta',
  role: 'Software Engineer',
  location: 'Bangalore (IST)',
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
    title: 'Software Engineer 2',
    period: '2024 - Present',
    location: 'Bangalore',
    logo: healthifymeLogo,
    bullets: [
      {
        text: 'Built RIA, Healthifyme’s AI health coach, across chat and voice: members ask it questions, share health reports and get coached.',
      },
      {
        text: 'Built Coach Copilot, an AI assistant for Healthifyme’s coaches: it preps them for calls, drafts replies, suggests next steps and answers questions about each member’s food, sleep, activity and glucose.',
      },
      {
        text: 'Shipped thousands of food nutrition pages, each scoring 100 on Google’s SEO audit.',
      },
      { text: 'Moved 20+ apps to a faster build tool and server-side rendering.' },
      { text: 'Merged 260+ pull requests in a year.' },
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
    logo: bleedingEdgeLogo,
    bullets: [
      { text: 'Built real-time rider and vendor apps for food delivery.' },
      { text: 'Built the EEE Taxi fleet management system.' },
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
