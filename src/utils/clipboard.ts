/**
 * Copies, and says whether it managed to.
 *
 * `navigator.clipboard` is undefined outside a secure context and rejects with
 * `NotAllowedError` when the document isn't focused, so the async API alone
 * leaves the button doing nothing at all on a plain-http preview — no error, no
 * tick, no clue. The textarea fallback is the old synchronous path, which works
 * in both cases. The boolean is what matters: a tick shown after a failed copy
 * is worse than no tick, because the reader walks away with an empty clipboard
 * believing otherwise.
 */
export const writeClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // ignored — falls through to the synchronous path below
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    // Off-screen rather than `display: none`, which is not selectable.
    field.setAttribute('aria-hidden', 'true');
    field.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
};
