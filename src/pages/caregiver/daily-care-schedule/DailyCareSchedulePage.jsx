import { useCallback, useEffect, useState } from 'react';
import caregiverCareTaskService from '../../../services/caregiverCareTask.service';
import caregiverResidentService from '../../../services/caregiverResident.service';
import { getLocalDateString } from '../../../utils/dateUtils';
import '../../../styles/caregiver/DailyCareSchedulePage.css';
import CareTaskDetailModal from './components/CareTaskDetailModal';
import CareTasksTable from './components/CareTasksTable';
import ScheduleFilters from './components/ScheduleFilters';

const today = () => getLocalDateString();

function DailyCareSchedulePage() {
  const [workDate, setWorkDate] = useState(today());
  const [status, setStatus] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residents, setResidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailTaskId, setDetailTaskId] = useState(null);

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
        limit: 100,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => String(a.scheduledTime || '').localeCompare(String(b.scheduledTime || '')));
      setTasks(list);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được lịch chăm sóc');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workDate, status, residentId]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <div className="page card daily-care-page">
      <h1 className="daily-care-page__title">Lịch chăm sóc hằng ngày</h1>
      <p className="daily-care-page__intro">
        Xem và cập nhật các nhiệm vụ chăm sóc được phân công cho bạn trong ngày. Lịch được tạo khi
        quản lý publish lịch chăm sóc hoặc giao nhiệm vụ riêng lẻ.
      </p>

      {error && <p className="form-error">{error}</p>}

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
        onView={(row) => setDetailTaskId(row._id)}
        onQuickStatus={(row) => setDetailTaskId(row._id)}
      />

      {detailTaskId && (
        <CareTaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onUpdated={loadTasks}
        />
      )}
    </div>
  );
}

export default DailyCareSchedulePage;
