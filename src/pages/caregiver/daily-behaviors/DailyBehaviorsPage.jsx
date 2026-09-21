import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import useAuth from '../../../hooks/useAuth';
import dailyBehaviorService from '../../../services/dailyBehavior.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatLocaleDate } from '../../../utils/nutritionLabels';
import {
  behaviorTypeLabel,
  moodLevelLabel,
  observationCategoryLabel,
} from '../../../utils/behaviorLabels';
import '../../../styles/caregiver/DailyBehaviorsPage.css';
import BehaviorDeleteModal from './components/BehaviorDeleteModal';
import BehaviorFormModal from './components/BehaviorFormModal';
import BehaviorListFilters from './components/BehaviorListFilters';
import BehaviorRecordsTable from './components/BehaviorRecordsTable';

const today = () => getLocalDateString();

function detailSummary(row, t) {
  if (row.observationCategory === 'mood' && row.moodLevel) {
    return moodLevelLabel(row.moodLevel, t);
  }
  if (row.behaviorType) return behaviorTypeLabel(row.behaviorType, t);
  return row.notes?.slice(0, 40) || '—';
}

function DailyBehaviorsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [workDate, setWorkDate] = useState(today());
  const [observationCategory, setObservationCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [records, setRecords] = useState([]);
  const [canMutate, setCanMutate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [formModal, setFormModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadResidents = async () => {
    try {
      const res = await dailyBehaviorService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, 'caregiver.dailyBehaviors.loadResidentsFailed'));
    }
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await dailyBehaviorService.listRecords({
        workDate,
        observationCategory: observationCategory || undefined,
        severity: severity || undefined,
        residentId: residentId || undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res?.data) ? res.data : []);
      setCanMutate(Boolean(res?.meta?.canMutate));
    } catch (e) {
      setListError(resolveApiError(e, t, 'caregiver.dailyBehaviors.loadRecordsFailed'));
      setRecords([]);
      setCanMutate(false);
    } finally {
      setLoading(false);
    }
  }, [workDate, observationCategory, severity, residentId, t]);

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
    const summary = `${name} · ${observationCategoryLabel(row.observationCategory, t)} · ${detailSummary(row, t)} · ${formatLocaleDate(wd, i18n.language)}`;
    setDeleteError('');
    setDeleteModal({ id: row._id, summary });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await dailyBehaviorService.deleteRecord(deleteModal.id);
      setDeleteModal(null);
      loadRecords();
    } catch (e) {
      setDeleteError(resolveApiError(e, t, 'common.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminPageShell title={t('caregiver.dailyBehaviors.title')} subtitle={t('caregiver.dailyBehaviors.subtitle')}>
      {listError && <div className="resident-page__error">{listError}</div>}

      {!loading && !canMutate && (
        <p className="behavior-page__context behavior-page__context--warn">
          {t('caregiver.dailyBehaviors.shiftWindowClosed')}
        </p>
      )}

      <BehaviorListFilters
        workDate={workDate}
        observationCategory={observationCategory}
        severity={severity}
        residentId={residentId}
        residents={residents}
        loading={loading}
        maxDate={today()}
        canCreate={canMutate}
        onWorkDateChange={setWorkDate}
        onObservationCategoryChange={setObservationCategory}
        onSeverityChange={setSeverity}
        onResidentIdChange={setResidentId}
        onOpenCreate={() => setFormModal({ mode: 'create' })}
        onReload={loadRecords}
      />

      <BehaviorRecordsTable
        records={paginatedRecords}
        loading={loading}
        canMutate={canMutate}
        showRecordedBy
        currentUserId={user?._id}
        onEdit={(row) => setFormModal({ mode: 'edit', id: row._id })}
        onDelete={handleOpenDelete}
      />

      {!loading && records.length > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <BehaviorFormModal
        open={Boolean(formModal)}
        mode={formModal?.mode || 'create'}
        recordId={formModal?.mode === 'edit' ? formModal.id : undefined}
        residents={residents}
        defaultWorkDate={workDate}
        maxDate={today()}
        canMutate={canMutate}
        onClose={() => setFormModal(null)}
        onSuccess={() => {
          setFormModal(null);
          loadRecords();
        }}
      />

      <BehaviorDeleteModal
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

export default DailyBehaviorsPage;
