import { useCallback, useEffect, useState } from 'react';
import mealIntakeNoteService from '../../../services/mealIntakeNote.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate, mealTypeLabel } from '../../../utils/nutritionLabels';
import '../../../styles/caregiver/MealIntakeNotesPage.css';
import MealIntakeDeleteModal from './components/MealIntakeDeleteModal';
import MealIntakeFormModal from './components/MealIntakeFormModal';
import MealIntakeListFilters from './components/MealIntakeListFilters';
import MealIntakeRecordsTable from './components/MealIntakeRecordsTable';

const today = () => getLocalDateString();

function MealIntakeNotesPage() {
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
      setListError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
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
      setListError(e?.response?.data?.message || 'Không tải được danh sách ghi nhận');
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

  const handleOpenCreate = () => {
    setFormModal({ mode: 'create' });
  };

  const handleOpenEdit = (row) => {
    setFormModal({ mode: 'edit', id: row._id });
  };

  const handleOpenDelete = (row) => {
    const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
    const wd = (row.workDate || '').slice(0, 10);
    const summary = `${name} · ${mealTypeLabel(row.mealType)} · ${formatVNDate(wd)}`;
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
      setDeleteError(e?.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setFormModal(null);
    loadRecords();
  };

  return (
    <div className="page card meal-intake-page">
      <h1 className="meal-intake-page__title">Ghi nhận bữa ăn</h1>
      <p className="meal-intake-page__intro">
        Danh sách ghi nhận tình trạng ăn uống của cư dân phụ trách. Tạo, sửa hoặc xóa qua hộp thoại popup.
      </p>

      {listError && <p className="form-error">{listError}</p>}

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
        records={records}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

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
    </div>
  );
}

export default MealIntakeNotesPage;
