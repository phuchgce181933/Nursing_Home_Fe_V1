import { useCallback, useEffect, useState } from 'react';
import dailyBehaviorService from '../../../services/dailyBehavior.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate } from '../../../utils/nutritionLabels';
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

function detailSummary(row) {
  if (row.observationCategory === 'mood' && row.moodLevel) {
    return moodLevelLabel(row.moodLevel);
  }
  if (row.behaviorType) return behaviorTypeLabel(row.behaviorType);
  return row.notes?.slice(0, 40) || '—';
}

function DailyBehaviorsPage() {
  const [workDate, setWorkDate] = useState(today());
  const [observationCategory, setObservationCategory] = useState('');
  const [severity, setSeverity] = useState('');
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
      const res = await dailyBehaviorService.listResidents();
      setResidents(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setListError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
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
    } catch (e) {
      setListError(e?.response?.data?.message || 'Không tải được danh sách ghi nhận');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, observationCategory, severity, residentId]);

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleOpenDelete = (row) => {
    const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
    const wd = (row.workDate || '').slice(0, 10);
    const summary = `${name} · ${observationCategoryLabel(row.observationCategory)} · ${detailSummary(row)} · ${formatVNDate(wd)}`;
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
      setDeleteError(e?.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page card behavior-page">
      <h1 className="behavior-page__title">Ghi nhận hành vi hằng ngày</h1>
      <p className="behavior-page__intro">
        Ghi nhận tâm trạng, hành vi hoặc biểu hiện bất thường của cư dân phụ trách trong ngày. Bạn có
        thể tạo nhiều bản ghi cho cùng một cư dân trong một ngày.
      </p>

      {listError && <p className="form-error">{listError}</p>}

      <BehaviorListFilters
        workDate={workDate}
        observationCategory={observationCategory}
        severity={severity}
        residentId={residentId}
        residents={residents}
        loading={loading}
        maxDate={today()}
        onWorkDateChange={setWorkDate}
        onObservationCategoryChange={setObservationCategory}
        onSeverityChange={setSeverity}
        onResidentIdChange={setResidentId}
        onOpenCreate={() => setFormModal({ mode: 'create' })}
        onReload={loadRecords}
      />

      <BehaviorRecordsTable
        records={records}
        loading={loading}
        onEdit={(row) => setFormModal({ mode: 'edit', id: row._id })}
        onDelete={handleOpenDelete}
      />

      <BehaviorFormModal
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

      <BehaviorDeleteModal
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

export default DailyBehaviorsPage;
