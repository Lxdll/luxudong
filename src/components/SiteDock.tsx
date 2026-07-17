import { BriefcaseBusiness, Folder, NotebookText, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { path: '/', label: '关于', icon: UserRound },
  { path: '/career', label: '经历', icon: BriefcaseBusiness },
  { path: '/projects', label: '项目', icon: Folder },
  { path: '/blog', label: '博客', icon: NotebookText },
];

export const SiteDock = () => {
  const { pathname } = useLocation();

  return (
    <nav className="site-dock" aria-label="个人网站导航">
      {items.map(({ path, label, icon: Icon }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path);

        return (
          <Link
            className={`site-dock-item${active ? ' is-active' : ''}`}
            to={path}
            key={path}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="site-dock-tooltip">{label}</span>
            <span className="site-dock-face">
              <Icon className="site-dock-icon" aria-hidden="true" />
            </span>
            <span className="site-dock-indicator" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
};
