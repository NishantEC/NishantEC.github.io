import { cloneElement, Fragment, isValidElement, type ReactNode } from 'react';
import { useReading } from './useReading';

/** How much of each word is thickened. Matches the stash demo's default. */
const RATIO = 0.5;

/**
 * `Array.from` rather than `slice` — the copy contains emoji, and slicing by
 * UTF-16 unit cuts surrogate pairs in half, which turns 👋 into two replacement
 * characters.
 */
const halfBold = (text: string, keyPrefix: string) =>
  text.split(/(\s+)/).map((chunk, i) => {
    if (!chunk.trim()) return chunk;

    const chars = Array.from(chunk);
    const cut = Math.ceil(chars.length * RATIO);

    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: words repeat, so position is the only identity a run has
      <Fragment key={`${keyPrefix}-${i}`}>
        <b className="font-semibold text-fg">{chars.slice(0, cut).join('')}</b>
        {chars.slice(cut).join('')}
      </Fragment>
    );
  });

/**
 * Walks the tree and rewrites only the text, so links, `<strong>` and the hero's
 * reveal segments keep working. Recursion is limited to intrinsic elements:
 * cloning a component with new children would override props it may compute
 * itself, and icons take no children at all.
 */
const transform = (node: ReactNode, key: string): ReactNode => {
  if (typeof node === 'string') return halfBold(node, key);

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: position is the only identity a text run has
      <Fragment key={`${key}-${i}`}>{transform(child, `${key}-${i}`)}</Fragment>
    ));
  }

  if (isValidElement<{ children?: ReactNode }>(node) && typeof node.type === 'string') {
    return cloneElement(node, undefined, transform(node.props.children, key));
  }

  return node;
};

/**
 * Wrap the site's own writing. Renders children untouched unless reading mode is
 * on, so it costs nothing by default.
 */
const Prose = ({ children }: { children: ReactNode }) => {
  const { bionic } = useReading();
  return <>{bionic ? transform(children, 'p') : children}</>;
};

export default Prose;
