import { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { sidebarData } from './sidebarData';
import { useAuth } from '../../hooks/useAuth';
import useUnreadConversations from '../../hooks/useUnreadConversations';

const isMessagesPath = (path) => !!path && path.endsWith('/messages');

function Sidebar({ items = sidebarData }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const hasMessagesNav = items.some((item) => isMessagesPath(item.path));
  const unreadConversations = useUnreadConversations(hasMessagesNav);
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar whenever the user navigates (mobile UX)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll while mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitialOpen = useCallback(() => {
    const open = {};
    items.forEach((item, index) => {
      if (item.children) {
        const isActive = item.children.some((child) => location.pathname === child.path);
        if (isActive) open[index] = true;
      }
    });
    return open;
  }, [items, location.pathname]);

  const [openGroups, setOpenGroups] = useState(getInitialOpen);

  const toggleGroup = (index) => {
    setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLanguageChange = (event) => {
    const nextLang = event.target.value;
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  return (
    <>
      {/* Hamburger toggle — only rendered/visible on mobile (<1024px) */}
      <button
        type="button"
        className="sidebar__hamburger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Semi-transparent backdrop — clicks outside close the sidebar */}
      <div
        className={`sidebar__backdrop${isOpen ? ' sidebar__backdrop--visible' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      {/* Close button inside sidebar, mobile only */}
      <button
        type="button"
        className="sidebar__close"
        onClick={() => setIsOpen(false)}
        aria-label="Close menu"
      >
        <X size={18} />
      </button>

      <div className="sidebar__header">
        <div className="sidebar__logo-section">
          <img
            src="https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png"
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
                {isMessagesPath(item.path) && unreadConversations > 0 && (
                  <span className="sidebar__badge">{unreadConversations > 9 ? '9+' : unreadConversations}</span>
                )}
              </NavLink>
            ) : (
              <SidebarGroup
                item={item}
                isOpen={!!openGroups[index]}
                onToggle={() => toggleGroup(index)}
                t={t}
                pathname={location.pathname}
              />
            )}
          </div>
        ))}
      </div>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__logout-button" onClick={handleLogout}>
          <LogOut size={18} className="sidebar__icon" />
          <span className="sidebar__logout-text">{t('sidebar.logout')}</span>
        </button>
      </div>
    </aside>
    </>
  );
}

function SidebarGroup({ item, isOpen, onToggle, t, pathname }) {
  const hasActiveChild = item.children?.some((child) => pathname === child.path);

  return (
    <div className="sidebar__group">
      <button
        type="button"
        className={`sidebar__group-toggle ${hasActiveChild ? 'sidebar__group-toggle--active' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <item.icon size={20} className="sidebar__icon" />
        <span className="sidebar__group-toggle-text">{t(item.title)}</span>
        <motion.span
          className="sidebar__group-chevron"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="sidebar__dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="sidebar__dropdown-inner">
              {item.children?.map((child, childIndex) => {
                const ChildIcon = child.icon;
                return (
                  <motion.div
                    key={childIndex}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: childIndex * 0.04 }}
                  >
                    <NavLink
                      to={child.path}
                      className={({ isActive }) =>
                        `sidebar__subitem ${isActive ? 'sidebar__subitem--active' : ''}`
                      }
                    >
                      {ChildIcon && <ChildIcon size={16} className="sidebar__subitem-icon" />}
                      <span>{t(child.title)}</span>
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Sidebar;
