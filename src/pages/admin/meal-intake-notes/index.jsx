import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import mealIntakeNoteService from '../../../services/mealIntakeNote.service';
import residentService from '../../../services/resident.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { getLocalDateString } from '../../../utils/dateUtils';
import { getMealTypeOptions } from '../../caregiver/meal-intake/constants';
import MealIntakeListFilters from '../../caregiver/meal-intake/components/MealIntakeListFilters';
import MealIntakeRecordsTable from '../../caregiver/meal-intake/components/MealIntakeRecordsTable';
import '../../../styles/caregiver/MealIntakeNotesPage.css';

const today = () => getLocalDateString();

function AdminMealIntakeNotesPage() {
  const { t } = useTranslation();
  const ns = 'admin.mealIntake';
  const mealTypeOptions = useMemo(() => getMealTypeOptions(t), [t]);

  const [workDate, setWorkDate] = useState(today());
  const [residentId, setResidentId] = useState('');
  const [mealType, setMealType] = useState('');
  const [residents, setResidents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const loadResidents = async () => {
    try {
      const res = await residentService.getResidentList({
        residencyStatus: 'admitted',
        limit: 500,
        page: 1,
      });
      setResidents(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, `${ns}.loadResidentsFailed`));
    }
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await mealIntakeNoteService.adminListNotes({
        workDate,
        residentId: residentId || undefined,
        mealType: mealType || undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, `${ns}.loadRecordsFailed`));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, residentId, mealType, t, ns]);

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const {
    paginatedItems: paginatedRecords,
    page,
    setPage,
    totalPages,
    total,
  } = useClientPagination(records);

  return (
    <AdminPageShell title={t(`${ns}.title`)} subtitle={t(`${ns}.subtitle`)}>
      {listError && <div className="resident-page__error">{listError}</div>}

      <MealIntakeListFilters
        readOnly
        workDate={workDate}
        residentId={residentId}
        mealType={mealType}
        mealTypeOptions={mealTypeOptions}
        residents={residents}
        loading={loading}
        onWorkDateChange={setWorkDate}
        onResidentIdChange={setResidentId}
        onMealTypeChange={setMealType}
        onReload={loadRecords}
      />

      <MealIntakeRecordsTable
        readOnly
        showRecordedBy
        recordsListTitle={t(`${ns}.recordsList`)}
        colRecordedByLabel={t(`${ns}.colRecordedBy`)}
        emptyMessage={t(`${ns}.emptyFiltered`)}
        records={paginatedRecords}
        loading={loading}
      />

      {!loading && records.length > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}
    </AdminPageShell>
  );
}

export default AdminMealIntakeNotesPage;
