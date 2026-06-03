import { useCallback, useEffect, useState } from 'react';
import hygieneActivityService from '../../../services/hygieneActivity.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import { formatVNDate } from '../../../utils/nutritionLabels';
import { hygieneActivityLabel } from '../../../utils/hygieneLabels';
import '../../../styles/caregiver/HygieneActivitiesPage.css';
import HygieneDeleteModal from './components/HygieneDeleteModal';
import HygieneFormModal from './components/HygieneFormModal';
import HygieneListFilters from './components/HygieneListFilters';
import HygieneRecordsTable from './components/HygieneRecordsTable';

const today = () => getLocalDateString();

function HygieneActivitiesPage() {
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
      setListError(e?.response?.data?.message || 'Không tải được danh sách cư dân');
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
      setListError(e?.response?.data?.message || 'Không tải được danh sách ghi nhận');
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

  const handleOpenDelete = (row) => {
    const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
    const wd = (row.workDate || '').slice(0, 10);
    const summary = `${name} · ${hygieneActivityLabel(row.activityType)} · ${formatVNDate(wd)}`;
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
      setDeleteError(e?.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page card hygiene-page">
      <h1 className="hygiene-page__title">Ghi nhận hoạt động vệ sinh</h1>
      <p className="hygiene-page__intro">
        Ghi nhận hỗ trợ vệ sinh cá nhân và dọn dẹp cho cư dân phụ trách. Mỗi loại hoạt động chỉ ghi
        một lần mỗi ngày cho mỗi cư dân.
      </p>

      {listError && <p className="form-error">{listError}</p>}

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
        records={records}
        loading={loading}
        onEdit={(row) => setFormModal({ mode: 'edit', id: row._id })}
        onDelete={handleOpenDelete}
      />

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
    </div>
  );
}

export default HygieneActivitiesPage;
