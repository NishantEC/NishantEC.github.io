import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data/profile';
import { Button } from './Button';

/**
 * Both labels are stacked and cross-faded with a blur, so the button never
 * changes width when it flips to "Copied".
 */
const CopyEmailButton = () => {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions) — fall back to a mail client.
      location.assign(`mailto:${profile.email}`);
    }
  };

  return (
    <Button onClick={copy} size="lg">
      <span className={`transition-all duration-500 ${copied ? 'opacity-0 blur-xs' : ''}`}>
        Copy my email
      </span>
      <span
        className={`absolute transition-all duration-500 ${copied ? '' : 'opacity-0 blur-xs'}`}
        aria-hidden="true"
      >
        Copied!
      </span>
    </Button>
  );
};

export default CopyEmailButton;
