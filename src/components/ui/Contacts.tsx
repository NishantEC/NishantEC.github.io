import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GithubIcon from '~icons/logos/github-icon';
import LinkedinIcon from '~icons/logos/linkedin-icon';
import XIcon from '~icons/logos/x';
import avatar from '../../assets/me.jpeg';
import { profile } from '../../data/profile';
import { type Contributions, fetchContributions } from '../../utils/github-contributions';
import GithubGraph from './GithubGraph';

const EASE = [0.33, 1, 0.68, 1] as const;

/**
 * Social links with a preview card that morphs — position, width and height all
 * tween — as the pointer moves between icons, rather than popping in and out.
 */
const Contacts = () => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [box, setBox] = useState({ left: 0, width: 0, height: 0 });
  const [instant, setInstant] = useState(true);
  const [contributions, setContributions] = useState<Contributions>([]);
  const [total, setTotal] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContributions('NishantEC').then(({ days, total: t }) => {
      setContributions(days);
      setTotal(t);
    });
  }, []);

  const cards = [
    {
      label: 'GitHub',
      href: profile.socials.github,
      Icon: GithubIcon,
      content: (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-3">
            <img className="size-10 rounded-full object-cover" src={avatar} alt="" />
            <div className="flex flex-col">
              NishantEC
              <p className="text-sm text-muted">
                {total > 0 ? `${total} contributions in the last year` : 'GitHub'}
              </p>
            </div>
          </div>
          <GithubGraph contributions={contributions} />
        </div>
      ),
    },
    {
      label: 'LinkedIn',
      href: profile.socials.linkedin,
      Icon: LinkedinIcon,
      content: (
        <>
          <div className="h-16 w-2xs bg-linear-to-br from-[#0A66C2] to-[#0A66C2]/30" />
          <div className="absolute left-3 translate-y-[-50%] rounded-full bg-surface p-0.5">
            <img className="size-14 rounded-full object-cover" src={avatar} alt="" />
          </div>
          <div className="flex flex-col gap-1 p-3 pt-8">
            <span>{profile.name}</span>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-sm text-muted">
                {profile.role}
                <br />
                {profile.location}
              </p>
              <a
                className="h-fit rounded-full bg-[#0A66C2] px-3 py-1 text-sm text-bg transition-[filter] hover:brightness-120 dark:bg-[#71B7FB]"
                href={profile.socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                Connect
              </a>
            </div>
          </div>
        </>
      ),
    },
    {
      label: 'X',
      href: profile.socials.x,
      Icon: XIcon,
      content: (
        <>
          <div className="h-20 w-2xs bg-linear-to-br from-stone-700 to-stone-900" />
          <div className="absolute left-3 translate-y-[-50%] rounded-full bg-surface p-0.5">
            <img className="size-14 rounded-full object-cover" src={avatar} alt="" />
          </div>
          <div className="flex flex-col p-3">
            <div className="flex justify-between">
              <span className="mt-6">@NishCodes</span>
              <a
                className="h-fit rounded-full bg-fg px-3 py-1 text-sm text-bg transition-colors hover:bg-fg/90"
                href={profile.socials.x}
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow
              </a>
            </div>
            <span className="text-sm text-muted">Software engineer, building developer tools</span>
          </div>
        </>
      ),
    },
  ];

  // Re-measure whenever the visible card changes so the shell can tween to fit it.
  useLayoutEffect(() => {
    if (!open || !contentRef.current) return;
    setBox((b) => ({
      ...b,
      width: contentRef.current?.offsetWidth ?? 0,
      height: contentRef.current?.offsetHeight ?? 0,
    }));
  }, [open]);

  const onEnter = (i: number) => (event: React.PointerEvent<HTMLAnchorElement>) => {
    // Touch would leave the card stranded with no way to dismiss it.
    if (event.pointerType !== 'mouse') return;

    const node = event.currentTarget;
    setInstant(!open);
    setDirection(i > index ? 1 : -1);
    setIndex(i);
    setOpen(true);
    setBox((b) => ({ ...b, left: node.offsetLeft + node.offsetWidth / 2 }));
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mouseleave only dismisses a hover preview; each link is a real anchor and works without it
    <div className="relative flex" onMouseLeave={() => setOpen(false)}>
      {cards.map(({ label, href, Icon }, i) => (
        <a
          key={label}
          className="z-10 p-2 text-muted transition-colors hover:text-fg [&_*]:fill-current"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          onPointerEnter={onEnter(i)}
        >
          <Icon className="size-6 [&_path]:fill-current" />
        </a>
      ))}

      <AnimatePresence>
        {open && (
          <motion.div
            className="squircle-sm absolute bottom-[calc(100%+0.5rem)] flex translate-x-[-50%] items-end overflow-hidden bg-surface shadow-2xl ring ring-border"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: box.left,
              width: box.width || 'auto',
              height: box.height || 'auto',
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.15 },
              left: { duration: instant ? 0 : 0.3, ease: EASE },
              width: { duration: instant ? 0 : 0.3, ease: EASE },
              height: { duration: instant ? 0 : 0.3, ease: EASE },
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={index}
                ref={contentRef}
                className="absolute"
                initial={{ x: 200 * direction, opacity: 0, filter: 'blur(2px)' }}
                animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ x: -200 * direction, opacity: 0, filter: 'blur(2px)' }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {cards[index].content}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bridges the gap so moving the pointer up into the card doesn't close it. */}
      <div className="absolute inset-0 -top-2" />
    </div>
  );
};

export default Contacts;
