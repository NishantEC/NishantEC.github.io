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
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl leading-8 tracking-[-0.6px] italic">{profile.name}</h1>
        <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
          Product engineer · {profile.location}
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-4 leading-[26px] text-muted">
        <p>
          I'm a <strong className="text-fg">product engineer</strong> at{' '}
          <strong className="text-fg">Healthifyme</strong>, working on RIA, an AI health coach. I
          build the parts that help people get started, log by voice and chat, and understand their
          health reports.
        </p>
        <p>
          Outside work I build my own tools: a macOS launcher, Ghostty in a browser tab, and a
          local-first WHOOP tracker in Rust.
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
