import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

/**
 * Adapted from the button in the hushbacks @workspace/ui package, retargeted at
 * this site's tokens (fg/bg/surface/border) and given squircled corners, which
 * the original was missing.
 *
 * Carried over from that version:
 *  - a `before:` layer inheriting the radius, used for the top-edge highlight
 *  - `pointer-coarse:after:` guaranteeing a 44px touch target on touch devices
 *    without inflating the visual box
 *  - focus ring with an offset, and a distinct pressed state
 *  - sizes that shrink one step on `sm:` — touch first, desktop tighter
 */
const buttonVariants = cva(
  cn(
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap',
    'border font-medium outline-none transition-all',
    'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
    'pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11',
    'focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'disabled:pointer-events-none disabled:opacity-60',
    "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:shrink-0",
  ),
  {
    defaultVariants: { size: 'default', variant: 'default' },
    variants: {
      size: {
        default: 'squircle-xs h-10 px-4 text-base sm:h-9 sm:text-sm',
        sm: 'squircle-xs h-9 gap-1.5 px-3 text-sm sm:h-8',
        lg: 'squircle-sm h-11 px-5 text-base sm:h-10',
        icon: 'squircle-xs size-10 sm:size-9',
      },
      variant: {
        default: cn(
          'border-transparent bg-fg text-bg shadow-xs',
          'not-disabled:before:inset-shadow-[0_1px_--theme(--color-white/16%)]',
          'hover:opacity-90 active:scale-[0.98] active:shadow-none',
        ),
        outline: cn(
          'border-border bg-surface text-fg shadow-xs/5',
          'hover:bg-fg/5 active:scale-[0.98] active:shadow-none',
        ),
        ghost: 'border-transparent text-muted hover:bg-fg/5 hover:text-fg active:scale-[0.98]',
        link: 'border-transparent text-fg underline-offset-4 hover:underline',
      },
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the label transparent and shows whatever is absolutely positioned inside. */
    loading?: boolean;
  };

const Button = ({ className, variant, size, loading, disabled, ...props }: ButtonProps) => (
  <button
    type="button"
    data-slot="button"
    data-variant={variant}
    data-size={size}
    data-loading={loading ? '' : undefined}
    disabled={Boolean(loading || disabled)}
    aria-disabled={loading || undefined}
    className={cn(buttonVariants({ className, size, variant }))}
    {...props}
  />
);

export { Button, buttonVariants };
