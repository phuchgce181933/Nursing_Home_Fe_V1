import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import hygieneActivityService from '../../../services/hygieneActivity.service';
import residentService from '../../../services/resident.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { getLocalDateString } from '../../../utils/dateUtils';
import HygieneListFilters from '../../caregiver/hygiene-activities/components/HygieneListFilters';
import HygieneRecordsTable from '../../caregiver/hygiene-activities/components/HygieneRecordsTable';
import '../../../styles/caregiver/HygieneActivitiesPage.css';

const today = () => getLocalDateString();

function AdminHygieneActivitiesPage() {
  const { t } = useTranslation();
  const ns = 'admin.hygiene';

  const [workDate, setWorkDate] = useState(today());
  const [activityCategory, setActivityCategory] = useState('');
  const [residentId, setResidentId] = useState('');
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
      const res = await hygieneActivityService.adminListRecords({
        workDate,
        activityCategory: activityCategory || undefined,
        residentId: residentId || undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, `${ns}.loadRecordsFailed`));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, activityCategory, residentId, t, ns]);

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

      <HygieneListFilters
        readOnly
        workDate={workDate}
        activityCategory={activityCategory}
        residentId={residentId}
        residents={residents}
        loading={loading}
        onWorkDateChange={setWorkDate}
        onActivityCategoryChange={setActivityCategory}
        onResidentIdChange={setResidentId}
        onReload={loadRecords}
      />

      <HygieneRecordsTable
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

export default AdminHygieneActivitiesPage;
