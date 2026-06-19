import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import hygieneActivityService from '../../../services/hygieneActivity.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatLocaleDate } from '../../../utils/nutritionLabels';
import { hygieneActivityLabel } from '../../../utils/hygieneLabels';
import '../../../styles/caregiver/HygieneActivitiesPage.css';
import HygieneDeleteModal from './components/HygieneDeleteModal';
import HygieneFormModal from './components/HygieneFormModal';
import HygieneListFilters from './components/HygieneListFilters';
import HygieneRecordsTable from './components/HygieneRecordsTable';

const today = () => getLocalDateString();

function HygieneActivitiesPage() {
  const { t, i18n } = useTranslation();
  const [workDate, setWorkDate] = useState(today());
  const [activityCategory, setActivityCategory] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [formModal, setFormModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadResidents = async () => {
    try {
      const res = await hygieneActivityService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(e?.response?.data?.message || t('caregiver.hygiene.loadResidentsFailed'));
    }
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await hygieneActivityService.listRecords({
        workDate,
        activityCategory: activityCategory || undefined,
        residentId: residentId || undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(e?.response?.data?.message || t('caregiver.hygiene.loadRecordsFailed'));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, activityCategory, residentId]);

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

  const handleOpenDelete = (row) => {
    const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
    const wd = (row.workDate || '').slice(0, 10);
    const summary = `${name} · ${hygieneActivityLabel(row.activityType, t)} · ${formatLocaleDate(wd, i18n.language)}`;
    setDeleteError('');
    setDeleteModal({ id: row._id, summary });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await hygieneActivityService.deleteRecord(deleteModal.id);
      setDeleteModal(null);
      loadRecords();
    } catch (e) {
      setDeleteError(e?.response?.data?.message || t('common.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminPageShell title={t('caregiver.hygiene.title')} subtitle={t('caregiver.hygiene.subtitle')}>
      {listError && <div className="resident-page__error">{listError}</div>}

      <HygieneListFilters
        workDate={workDate}
        activityCategory={activityCategory}
        residentId={residentId}
        residents={residents}
        loading={loading}
        maxDate={today()}
        onWorkDateChange={setWorkDate}
        onActivityCategoryChange={setActivityCategory}
        onResidentIdChange={setResidentId}
        onOpenCreate={() => setFormModal({ mode: 'create' })}
        onReload={loadRecords}
      />

      <HygieneRecordsTable
        records={paginatedRecords}
        loading={loading}
        onEdit={(row) => setFormModal({ mode: 'edit', id: row._id })}
        onDelete={handleOpenDelete}
      />

      {!loading && records.length > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <HygieneFormModal
        open={Boolean(formModal)}
        mode={formModal?.mode || 'create'}
        recordId={formModal?.mode === 'edit' ? formModal.id : undefined}
        residents={residents}
        defaultWorkDate={workDate}
        maxDate={today()}
        onClose={() => setFormModal(null)}
        onSuccess={() => {
          setFormModal(null);
          loadRecords();
        }}
      />

      <HygieneDeleteModal
        open={Boolean(deleteModal)}
        recordSummary={deleteModal?.summary}
        deleting={deleting}
        error={deleteError}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleConfirmDelete}
      />
    </AdminPageShell>
  );
}

export default HygieneActivitiesPage;
