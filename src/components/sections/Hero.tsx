import avatar from '../../assets/me.jpeg';
import { profile } from '../../data/profile';
import { useCompact } from '../panel/useCompact';
import Contacts from '../ui/Contacts';
import CopyEmailButton from '../ui/CopyEmailButton';

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

        {/* The compressed sidebar says what he does, not who for. The employer
            is one scroll away in the experience section, and naming it here
            made the whole panel read as a job title rather than an index. */}
        <p className="text-sm leading-[22px] text-muted">
          Building stuff — product interfaces, and developer tools on the side.
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
          👋 Hey! I'm a <strong className="text-fg">software engineer</strong> in{' '}
          <strong className="text-fg">Bangalore, India 🇮🇳</strong>, with 3+ years of experience.
        </p>
        <p>
          At <strong className="text-fg">Healthifyme</strong>, I work on RIA, an AI health coach. I
          build the parts that help people get started and understand their health reports.
        </p>
        <p>
          Outside work, I'm usually making a developer tool, tinkering with a native app, or putting
          together a skill others can use.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <CopyEmailButton />
        <Contacts />
      </div>
    </section>
  );
};

export default Hero;
