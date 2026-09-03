import type { SkillMeta } from '../../content/schema';

/** Static preview of each playground, used on the cards. */
const SkillThumb = ({ demo }: { demo: SkillMeta['demo'] }) => {
  if (demo === 'ascii') {
    return (
      <div className="grid h-full place-items-center">
        <pre
          aria-hidden="true"
          className="font-mono text-[7px] leading-[0.8] text-muted"
        >{`  .:-=+*#%@
 .:-=+*#%@%
:-=+*#%@%#*
-=+*#%@%#*+`}</pre>
      </div>
    );
  }

  return null;
};

export default SkillThumb;
