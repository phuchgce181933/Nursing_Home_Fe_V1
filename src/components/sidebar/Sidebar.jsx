import { NavLink } from "react-router-dom";
import { sidebarData } from "./sidebarData";

function Sidebar({ items = sidebarData, brandTitle = 'Nursing Home', brandSubtitle = '' }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h1 className="sidebar__logo">{brandTitle}</h1>
        {brandSubtitle ? <span className="sidebar__logo-sub">{brandSubtitle}</span> : null}
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
                <span className="sidebar__text">{item.title}</span>
              </NavLink>
            ) : (
              <div>
                <div className="sidebar__group-title">{item.title}</div>

                <div className="sidebar__subnav">
                  {item.children?.map((child, childIndex) => (
                    <NavLink
                      key={childIndex}
                      to={child.path}
                      className={({ isActive }) =>
                        `sidebar__subitem ${isActive ? 'sidebar__subitem--active' : ''}`
                      }
                    >
                      {child.title}
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