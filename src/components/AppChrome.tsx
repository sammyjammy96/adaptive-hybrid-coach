import { CalendarDays, Dumbbell, Home, ListChecks, UploadCloud, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

export type ScreenKey = 'today' | 'plan' | 'import' | 'log' | 'profile';

interface AppChromeProps {
  activeScreen: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
  children: ReactNode;
}

const navItems = [
  { key: 'today', label: 'Today', icon: Home },
  { key: 'plan', label: 'Plan', icon: CalendarDays },
  { key: 'import', label: 'Import', icon: UploadCloud },
  { key: 'log', label: 'Log', icon: ListChecks },
  { key: 'profile', label: 'Profile', icon: UserRound }
] as const;

export function AppChrome({ activeScreen, onNavigate, children }: AppChromeProps) {
  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Primary navigation">
        <div className="brand-lockup">
          <Dumbbell aria-hidden="true" />
          <div>
            <strong>Hybrid Coach</strong>
            <span>CrossFit + running</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? 'nav-item is-active' : 'nav-item'}
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="screen-frame">{children}</div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={isActive ? 'bottom-nav-item is-active' : 'bottom-nav-item'}
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
