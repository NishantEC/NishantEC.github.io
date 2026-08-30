import { useEffect } from 'react';

const SITE = 'https://nishantec.github.io';

const setMeta = (selector: string, attr: string, value: string) => {
  let tag = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);

  if (!tag) {
    tag = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    const [, name] = selector.match(/\[(?:name|property|rel)="([^"]+)"\]/) ?? [];
    if (name) {
      if (selector.startsWith('link')) tag.setAttribute('rel', name);
      else tag.setAttribute(selector.includes('property') ? 'property' : 'name', name);
    }
    document.head.appendChild(tag);
  }

  tag.setAttribute(attr, value);
};

/**
 * Keeps title, description, canonical and OG tags in step with the current
 * route.
 *
 * It runs in an effect, which used to mean a crawler without JS only ever saw
 * the index.html defaults. The build now snapshots each route with a real
 * browser (see `scripts/prerender.ts`), so whatever this writes ends up baked
 * into that route's static HTML — this hook is what gives every URL its own
 * title and canonical, not just the ones running JS.
 */
export const useDocumentMeta = ({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) => {
  useEffect(() => {
    const url = `${SITE}${path}`;

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
  }, [title, description, path]);
};
