import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

function RoleDashboard({ title, greeting, roleLabel, sections }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="role-dashboard-card">
      <h1>{title}</h1>
      <p>
        <Trans
          i18nKey="dashboard.welcomeMessage"
          values={{ name: user?.fullName || greeting, role: roleLabel }}
          components={{ strong: <strong /> }}
        />
      </p>
      <div className="role-dashboard-sections">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default RoleDashboard;
