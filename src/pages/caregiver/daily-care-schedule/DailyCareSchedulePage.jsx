import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ListPagination from '../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../constants/adminListPage';
import caregiverCareTaskService from '../../../services/caregiverCareTask.service';
import caregiverResidentService from '../../../services/caregiverResident.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import '../../../styles/caregiver/DailyCareSchedulePage.css';
import CareTaskDetailModal from './components/CareTaskDetailModal';
import CareTasksTable from './components/CareTasksTable';
import ScheduleFilters from './components/ScheduleFilters';

const today = () => getLocalDateString();

function DailyCareSchedulePage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const ns = pathname.includes('/doctor/')
    ? 'doctor.careTasks'
    : pathname.includes('/nurse/')
      ? 'nurse.careTasks'
      : 'caregiver.dailyCareSchedule';

  const [workDate, setWorkDate] = useState(today());
  const [status, setStatus] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskModal, setTaskModal] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadResidents = useCallback(async () => {
    try {
      const res = await caregiverResidentService.listResidents();
      setResidents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResidents([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!workDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await caregiverCareTaskService.listTasks({
        workDate,
        status: status || undefined,
        residentId: residentId || undefined,
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => String(a.scheduledTime || '').localeCompare(String(b.scheduledTime || '')));
      setTasks(list);
      const count = res.total ?? list.length;
      setTotal(count);
      setTotalPages(
        res.totalPages ?? Math.max(1, Math.ceil(count / ADMIN_LIST_PAGE_SIZE))
      );
    } catch (e) {
      setError(e?.response?.data?.message || t(`${ns}.loadFailed`));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, status, residentId, page, t, ns]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  useEffect(() => {
    setPage(1);
  }, [workDate, status, residentId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <AdminPageShell title={t(`${ns}.title`)} subtitle={t(`${ns}.subtitle`)}>
      {error && <div className="resident-page__error">{error}</div>}

      <ScheduleFilters
        workDate={workDate}
        status={status}
        residentId={residentId}
        residents={residents}
        loading={loading}
        onWorkDateChange={setWorkDate}
        onStatusChange={setStatus}
        onResidentIdChange={setResidentId}
        onReload={loadTasks}
      />

      <CareTasksTable
        tasks={tasks}
        loading={loading}
        ns={ns}
        onView={(row) => setTaskModal({ taskId: row._id, mode: 'view' })}
        onQuickStatus={(row) => setTaskModal({ taskId: row._id, mode: 'update' })}
      />

      {!loading && total > 0 && (
        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      {taskModal && (
        <CareTaskDetailModal
          taskId={taskModal.taskId}
          mode={taskModal.mode}
          ns={ns}
          onClose={() => setTaskModal(null)}
          onUpdated={loadTasks}
        />
      )}
    </AdminPageShell>
  );
}

export default DailyCareSchedulePage;
