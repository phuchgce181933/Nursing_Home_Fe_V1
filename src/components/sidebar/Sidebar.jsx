import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sidebarData } from './sidebarData';

function Sidebar({ items = sidebarData }) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (event) => {
    const nextLang = event.target.value;
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo-section">
          <img
            src="https://res.cloudinary.com/dhcrddnss/image/upload/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png"
            alt={t('app.logo')}
            className="sidebar__logo-img"
          />
          <div className="sidebar__brand">
            <span className="sidebar__logo">{t('app.logo')}</span>
            <span className="sidebar__subtitle">{t('app.subtitle')}</span>
          </div>
        </div>

        <div className="sidebar__language">
          <label className="sidebar__language-label" htmlFor="language-select">
            {t('language.label')}:
          </label>
          <select
            id="language-select"
            className="sidebar__language-select"
            value={i18n.language}
            onChange={handleLanguageChange}
          >
            <option value="vi">{t('language.vi')}</option>
            <option value="en">{t('language.en')}</option>
          </select>
        </div>
      </div>

      <div className="sidebar__nav">
        {items.map((item, index) => (
          <div key={index}>
            {item.path ? (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
                }
              >
                <item.icon size={20} className="sidebar__icon" />
                <span className="sidebar__text">{t(item.title)}</span>
              </NavLink>
            ) : (
              <div>
                <div className="sidebar__group-title">{t(item.title)}</div>

                <div className="sidebar__subnav">
                  {item.children?.map((child, childIndex) => (
                    <NavLink
                      key={childIndex}
                      to={child.path}
                      className={({ isActive }) =>
                        `sidebar__subitem ${isActive ? 'sidebar__subitem--active' : ''}`
                      }
                    >
                      {t(child.title)}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;