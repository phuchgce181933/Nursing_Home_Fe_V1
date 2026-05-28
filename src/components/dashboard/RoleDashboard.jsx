import { useAuth } from '../../hooks/useAuth';

function RoleDashboard({ title, greeting, roleLabel, sections }) {
  const { user } = useAuth();

  return (
    <div className="role-dashboard-card">
      <h1>{title}</h1>
      <p>
        Chào mừng {user?.fullName || greeting}, bạn đang ở khu vực dành cho{' '}
        <strong>{roleLabel}</strong>.
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
