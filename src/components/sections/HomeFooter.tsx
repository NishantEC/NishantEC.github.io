import { profile } from '../../data/profile';
import VisitorCount from '../analytics/VisitorCount';
import { useTheme } from '../theme/useTheme';

const HomeFooter = () => {
  const { theme, setTheme } = useTheme();
  return (
    <footer className="section flex flex-wrap justify-between gap-5 border-t border-border pt-5 text-xs text-muted">
      <div className="flex gap-4">
        <a href={profile.socials.github} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
        <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
          LinkedIn ↗
        </a>
        <a href={profile.socials.x} target="_blank" rel="noreferrer">
          X ↗
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>{profile.status}</span>
        <VisitorCount />
      </div>
      <button
        type="button"
        onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
        aria-label={`Color theme: ${theme}. Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'}`}
      >
        {theme} ◐
      </button>
    </footer>
  );
};
export default HomeFooter;
