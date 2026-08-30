import avatar from '../../assets/me.jpeg';
import { profile } from '../../data/profile';
import RevealParagraph, { type Segment } from '../hero/RevealParagraph';
import { useCompact } from '../panel/useCompact';
import Prose from '../reading/Prose';
import Contacts from '../ui/Contacts';
import CopyEmailButton from '../ui/CopyEmailButton';

const WORK: Segment[] = [
  'At ',
  {
    label: 'Healthifyme',
    href: 'https://www.healthifyme.com',
    reveal:
      "Healthifyme is India's largest health app — I work on the surfaces where people actually talk to it.",
  },
  ' I build the interface for ',
  {
    label: 'RIA',
    reveal:
      'RIA is an AI health coach. I built its onboarding and a panel that reads your metabolic report back to you in chat.',
  },
  ', an AI health coach — the onboarding, a diagnostic panel that reads metabolic reports through chat, and food pages that serve nutritional data at scale.',
];

const SIDE: Segment[] = [
  'On the side I build ⭐ developer tools — ',
  {
    label: 'herm',
    href: 'https://github.com/NishantEC/herm',
    reveal:
      'herm puts an AI agent on a private GCP box, reachable from any of your devices over Tailscale, with nothing open to the internet.',
  },
  ', a headless agent workstation, ',
  {
    label: 'cterm',
    href: 'https://github.com/NishantEC/cterm',
    reveal:
      "cterm runs Ghostty's real terminal engine, compiled to WebAssembly, in a browser tab — over a live shell.",
  },
  ', a terminal in a browser tab, and ',
  {
    label: 'the-resume-thing',
    href: 'https://github.com/NishantEC/the-resume-thing',
    reveal:
      'the-resume-thing turns your actual GitHub and Linear activity into résumé bullets, each one linked back to the commit it came from.',
  },
  ', which sources every claim it makes.',
];

const Hero = () => {
  const compact = useCompact();

  if (compact) {
    return (
      <section className="section flex scroll-mt-24 flex-col gap-5" id="hero">
        <div className="flex items-center gap-3">
          <img className="size-11 rounded-full object-cover" src={avatar} alt="" />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate font-display text-xl tracking-[-0.4px] italic">
              {profile.name}
            </h1>
            <p className="truncate text-sm text-muted">
              {profile.role} · {profile.location}
            </p>
          </div>
        </div>

        <p className="text-sm leading-[22px] text-muted">
          <Prose>
            Building AI-facing product interfaces at{' '}
            <strong className="text-fg">Healthifyme</strong>, and developer tools on the side.
          </Prose>
        </p>

        <div className="flex items-center gap-3">
          <CopyEmailButton />
          <Contacts />
        </div>
      </section>
    );
  }

  return (
    <section className="section flex scroll-mt-24 flex-col gap-12" id="hero">
      <h1 className="font-display text-2xl leading-8 tracking-[-0.6px] italic">{profile.name}</h1>

      <div className="flex flex-col gap-4 leading-[26px] text-muted">
        <p>
          <Prose>
            👋 Hey! I'm a <strong className="text-fg">frontend engineer</strong> with 3+ years of
            experience, building AI-facing product interfaces and developer tooling. Based in{' '}
            <strong className="text-fg">Bangalore, India 🇮🇳</strong>.
          </Prose>
        </p>

        <RevealParagraph segments={WORK} />
        <RevealParagraph segments={SIDE} />
      </div>

      <div className="flex items-center gap-4">
        <CopyEmailButton />
        <Contacts />
      </div>
    </section>
  );
};

export default Hero;
