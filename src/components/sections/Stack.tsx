import AngularIcon from '~icons/logos/angular-icon';
import AwsIcon from '~icons/logos/aws';
import GitIcon from '~icons/logos/git-icon';
import JavascriptIcon from '~icons/logos/javascript';
import JotaiIcon from '~icons/logos/jotai';
import MongodbIcon from '~icons/logos/mongodb-icon';
import NextjsIcon from '~icons/logos/nextjs-icon';
import PandacssIcon from '~icons/logos/pandacss';
import PostmanIcon from '~icons/logos/postman-icon';
import ReactIcon from '~icons/logos/react';
import ReduxIcon from '~icons/logos/redux';
import SassIcon from '~icons/logos/sass';
import TailwindIcon from '~icons/logos/tailwindcss-icon';
import TypescriptIcon from '~icons/logos/typescript-icon';
import { useCompact } from '../panel/useCompact';
import SectionLabel from '../ui/SectionLabel';

const STACK = [
  { name: 'Next.js', Icon: NextjsIcon },
  { name: 'React', Icon: ReactIcon },
  { name: 'TypeScript', Icon: TypescriptIcon },
  { name: 'JavaScript', Icon: JavascriptIcon },
  { name: 'Angular', Icon: AngularIcon },
  { name: 'Jotai', Icon: JotaiIcon },
  { name: 'Redux', Icon: ReduxIcon },
  { name: 'Tailwind', Icon: TailwindIcon },
  { name: 'Panda CSS', Icon: PandacssIcon },
  { name: 'Sass', Icon: SassIcon },
  { name: 'AWS', Icon: AwsIcon },
  { name: 'MongoDB', Icon: MongodbIcon },
  { name: 'Git', Icon: GitIcon },
  { name: 'Postman', Icon: PostmanIcon },
];

const Stack = ({ index }: { index?: number }) => {
  const compact = useCompact();

  if (compact) {
    return (
      <section className="section flex scroll-mt-24 flex-col gap-4" id="stack">
        <SectionLabel index={index}>stack</SectionLabel>

        {/* Icons only — the labels are what make this grid tall, and at sidebar
            width the marks are recognisable on their own. */}
        <div className="flex flex-wrap gap-3">
          {STACK.map(({ name, Icon }) => (
            <Icon key={name} className="size-5 opacity-80" title={name} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="section flex scroll-mt-24 flex-col gap-8" id="stack">
      <SectionLabel index={index}>stack</SectionLabel>

      <div className="grid grid-cols-4 gap-x-4 gap-y-6 sm:grid-cols-7">
        {STACK.map(({ name, Icon }) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <Icon className="size-7" />
            <span className="text-center text-xs text-muted">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stack;
