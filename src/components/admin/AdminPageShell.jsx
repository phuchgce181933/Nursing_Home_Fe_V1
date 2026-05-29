/**
 * Shared admin page layout — matches Resident Management (resident-page) styling.
 */
export default function AdminPageShell({ title, subtitle, actions, stats, children }) {
  return (
    <div className="resident-page">
      <div className="resident-page__header">
        <div>
          <h1 className="resident-page__title">{title}</h1>
          {subtitle && <p className="resident-page__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="resident-page__actions">{actions}</div>}
      </div>

      {stats?.length > 0 && (
        <div className="resident-page__stats">
          {stats.map(({ label, value, icon, iconClass }) => (
            <div key={label} className="resident-stat">
              <div className={`resident-stat__icon${iconClass ? ` ${iconClass}` : ''}`}>
                {icon}
              </div>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
