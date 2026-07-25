import { useAuth } from '../../../../hooks/useAuth';
import DrugAllergiesPageContent from '../../../../components/resident/DrugAllergiesPageContent';

export default function DrugAllergiesPage() {
  const { user } = useAuth();
  return (
    <DrugAllergiesPageContent i18nNs="admin.residents" canEdit={user?.role === 'doctor'} />
  );
}
