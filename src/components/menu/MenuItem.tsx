import type { ReactNode } from 'react';
import ArrowUpRightIcon from '~icons/heroicons/arrow-up-right';
import { originOf } from '../theme/ThemeProvider';

type Props = {
  children: ReactNode;
  isSelected: boolean;
  isActive?: boolean;
  isLink?: boolean;
  isCentered?: boolean;
  onMouseEnter: () => void;
  /** `origin` is the button's own centre — the theme wipe expands from it. */
  onSelect: (origin?: { x: number; y: number }) => void;
};

const MenuItem = ({
  children,
  isSelected,
  isActive,
  isLink,
  isCentered,
  onMouseEnter,
  onSelect,
}: Props) => (
  <button
    type="button"
    onMouseEnter={onMouseEnter}
    onClick={(e) => onSelect(originOf(e.currentTarget))}
    className={`flex items-center gap-2 rounded-lg p-2 ${isSelected ? 'bg-fg/5' : ''} ${
      isCentered ? 'justify-center' : ''
    } ${isActive ? 'outline outline-border' : ''}`}
  >
    {children}
    {isLink && <ArrowUpRightIcon className="ml-auto size-4" />}
  </button>
);

export default MenuItem;
