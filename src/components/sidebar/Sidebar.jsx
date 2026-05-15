import { NavLink } from "react-router-dom";
import { sidebarData } from "./sidebarData";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h1 className="sidebar__logo">Nursing Home</h1>
      </div>

      <div className="sidebar__nav">
        {sidebarData.map((item, index) => (
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