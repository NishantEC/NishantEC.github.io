import type { StashMeta } from '../../content/schema';

/** Static preview of each playground, used on the cards. */
const StashThumb = ({ demo }: { demo: StashMeta['demo'] }) => {
  if (demo === 'bionic') {
    return (
      <div className="flex h-full items-center justify-center px-5 text-center text-sm leading-5">
        <p className="text-muted">
          <b className="font-semibold text-fg">Rea</b>ding{' '}
          <b className="font-semibold text-fg">fas</b>ter,{' '}
          <b className="font-semibold text-fg">ma</b>ybe
        </p>
      </div>
    );
  }

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

export default StashThumb;
