import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import useClientPagination from '../../../hooks/useClientPagination';
import mealIntakeNoteService from '../../../services/mealIntakeNote.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatLocaleDate, mealTypeLabel } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/MealIntakeNotesPage.css';
import MealIntakeDeleteModal from './components/MealIntakeDeleteModal';
import MealIntakeFormModal from './components/MealIntakeFormModal';
import MealIntakeListFilters from './components/MealIntakeListFilters';
import MealIntakeRecordsTable from './components/MealIntakeRecordsTable';

const today = () => getLocalDateString();

function MealIntakeNotesPage() {
  const { t, i18n } = useTranslation();
  const [workDate, setWorkDate] = useState(today());
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
      const res = await mealIntakeNoteService.listResidents();
      setResidents(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, 'caregiver.mealIntake.loadResidentsFailed'));
    }
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await mealIntakeNoteService.listNotes({
        workDate,
        residentId: residentId || undefined,
        limit: 100,
      });
      setRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(resolveApiError(e, t, 'caregiver.mealIntake.loadRecordsFailed'));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, residentId]);

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

  const handleOpenCreate = () => {
    setFormModal({ mode: 'create' });
  };

  const handleOpenEdit = (row) => {
    setFormModal({ mode: 'edit', id: row._id });
  };

  const handleOpenDelete = (row) => {
    const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
    const wd = (row.workDate || '').slice(0, 10);
    const summary = `${name} · ${mealTypeLabel(row.mealType, t)} · ${formatLocaleDate(wd, i18n.language)}`;
    setDeleteError('');
    setDeleteModal({ id: row._id, summary });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await mealIntakeNoteService.deleteNote(deleteModal.id);
      setDeleteModal(null);
      loadRecords();
    } catch (e) {
      setDeleteError(resolveApiError(e, t, 'common.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setFormModal(null);
    loadRecords();
  };

  return (
    <AdminPageShell title={t('caregiver.mealIntake.title')} subtitle={t('caregiver.mealIntake.subtitle')}>
      {listError && <div className="resident-page__error">{listError}</div>}

      <MealIntakeListFilters
        workDate={workDate}
        residentId={residentId}
        residents={residents}
        loading={loading}
        maxDate={today()}
        onWorkDateChange={setWorkDate}
        onResidentIdChange={setResidentId}
        onOpenCreate={handleOpenCreate}
        onReload={loadRecords}
      />

      <MealIntakeRecordsTable
        records={paginatedRecords}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {!loading && records.length > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      <MealIntakeFormModal
        open={Boolean(formModal)}
        mode={formModal?.mode || 'create'}
        recordId={formModal?.mode === 'edit' ? formModal.id : undefined}
        residents={residents}
        defaultWorkDate={workDate}
        maxDate={today()}
        onClose={() => setFormModal(null)}
        onSuccess={handleFormSuccess}
      />

      <MealIntakeDeleteModal
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

export default MealIntakeNotesPage;
