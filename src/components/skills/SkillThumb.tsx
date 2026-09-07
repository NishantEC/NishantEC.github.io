import type { SkillMeta } from '../../content/schema';

// Sampled from the video2ascii skill's bundled starfish demo (MIT).
const PREVIEW =
  '                                          \n                                          \n                                          \n                                          \n                      .                   \n                     =#                   \n                    :=#=                  \n                    -###                  \n                   :+#@*                  \n      +=.        +%=*%@%#+=       .-+-    \n      ==+++++=*++*%@###+#%##+*##*##**     \n        .=++++++*##+###*########++.       \n            =++**+--**+==#####+.          \n              =+=+++*=+*+#%##-            \n              -=+*==++===#%%+             \n              +============##             \n             +++++=++==+==+*#=            \n            +=+==+=.   :====##=           \n           +#+=+-         -=-+#*          \n         :**==:             -==##         \n         ===.                 :==+        \n                                          \n                                          \n                                          \n                                          ';

const SkillThumb = ({ demo }: { demo: SkillMeta['demo'] }) => {
  if (demo !== 'ascii') return null;
  return (
    <div className="grid h-full place-items-center bg-stone-100 dark:bg-stone-900">
      <pre
        aria-hidden="true"
        className="-rotate-12 font-mono text-[7px] leading-none tracking-[1px] text-stone-600 dark:text-stone-400"
      >
        {PREVIEW}
      </pre>
    </div>
  );
};
export default SkillThumb;
