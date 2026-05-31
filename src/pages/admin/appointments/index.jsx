import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  User,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import careAppointmentService from '../../../services/careAppointment.service';
import staffService from '../../../services/staff.service';
import residentService from '../../../services/resident.service';
import '../../../styles/admin/CareAppointmentsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const APPOINTMENT_TYPES = [
  'Khám lâm sàng đầu vào',
  'Khám tổng quát định kỳ',
  'Khám nội khoa chuyên sâu',
  'Đánh giá sức khỏe tinh thần',
  'Vật lý trị liệu',
  'Khác',
];

const formatEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const formatTimeRange = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
    const startText = s.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endText = e.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${startText} - ${endText}`;
  } catch (e) {
    return '';
  }
};

export default function CareAppointmentsPage() {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isAdminRole = ['admin', 'manager'].includes(userRole);
  const isMedicalRole = ['doctor', 'nurse'].includes(userRole);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Metrics counters
  const [metrics, setMetrics] = useState({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
  });

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    from: '',
    to: '',
  });

  // Master data for modals
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [availableNurses, setAvailableNurses] = useState([]);
  const [loadingAvailableStaff, setLoadingAvailableStaff] = useState(false);
  const [residentsList, setResidentsList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Assign staff Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedNurId, setSelectedNurId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);

  // Create/Edit Appointment Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formValues, setFormValues] = useState({
    residentId: '',
    scheduledStartAt: '',
    scheduledEndAt: '',
    appointmentType: 'Khám lâm sàng đầu vào',
    notes: '',
  });
  const [savingAppt, setSavingAppt] = useState(false);
  const [apptFormError, setApptFormError] = useState(null);

  // Update Status Modal state (for medical staff)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetApptStatus, setTargetApptStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Fetch care appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        residentId: appliedFilters.search || undefined, // or handled at BE search query
        status: appliedFilters.status || undefined,
        from: appliedFilters.from ? new Date(appliedFilters.from).toISOString() : undefined,
        to: appliedFilters.to ? new Date(appliedFilters.to).toISOString() : undefined,
      };

      let res;
      if (isMedicalRole) {
        // Medical staff can view their own appointments securely
        res = await careAppointmentService.getMyAppointments(params);
      } else {
        // Admin/Manager lists all care appointments
        res = await careAppointmentService.listAppointments(params);
      }

      const list = res?.data || [];
      setData(list);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);

      // Compute statistics metric values
      setMetrics({
        total: res?.total || list.length,
        scheduled: list.filter(x => x.status === 'scheduled').length,
        inProgress: list.filter(x => x.status === 'in_progress').length,
        completed: list.filter(x => x.status === 'completed').length,
      });

    } catch (err) {
      console.error('Failed to load care appointments:', err);
      setError('Could not retrieve care appointments. Please check your credentials or network connection.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, isMedicalRole]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load master data for modals when Admin logged-in
  useEffect(() => {
    if (isAdminRole) {
      const loadMaster = async () => {
        try {
          setLoadingMaster(true);
          const [staffRes, resRes] = await Promise.all([
            staffService.getAll({ isActive: true, limit: 1000 }),
            residentService.listForAssignment({ status: 'admitted', limit: 1000 }),
          ]);

          const allStaff = staffRes?.data || [];
          const docs = allStaff.filter(x => x.role === 'doctor');
          const nurs = allStaff.filter(x => x.role === 'nurse');

          setDoctorsList(docs);
          setNursesList(nurs);
          setResidentsList(resRes?.data || []);
        } catch (err) {
          console.error('Failed to load master data for assignments:', err);
        } finally {
          setLoadingMaster(false);
        }
      };
      loadMaster();
    }
  }, [isAdminRole]);

  // Filters trigger
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ search, status, from, to });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', from: '', to: '' });
  };

  // Open assign staff modal
  const handleOpenAssign = async (appt) => {
    setSelectedAppt(appt);
    setSelectedDocId(appt.doctorStaffId?._id || appt.doctorStaffId || '');
    setSelectedNurId(appt.nurseStaffId?._id || appt.nurseStaffId || '');
    setAssignmentError(null);
    setAvailableDoctors([]);
    setAvailableNurses([]);
    setShowAssignModal(true);

    try {
      setLoadingAvailableStaff(true);
      const res = await careAppointmentService.getAvailableStaff(
        appt.scheduledStartAt,
        appt.scheduledEndAt,
        appt._id
      );
      setAvailableDoctors(res.doctors || []);
      setAvailableNurses(res.nurses || []);
    } catch (err) {
      console.error('Failed to load available staff for slot:', err);
      const errMsg = err.response?.data?.message || 'Không thể tải danh sách bác sĩ/y tá trực ca tại khung giờ này.';
      setAssignmentError(errMsg);
    } finally {
      setLoadingAvailableStaff(false);
    }
  };

  // Handle Save Staff assignment (Doctor & Nurse)
  const handleSaveAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;
    
    setSavingAssignment(true);
    setAssignmentError(null);

    try {
      // 1. Assign Doctor if changed
      const currentDoc = selectedAppt.doctorStaffId?._id || selectedAppt.doctorStaffId || '';
      if (selectedDocId !== currentDoc) {
        await careAppointmentService.assignDoctor(selectedAppt._id, selectedDocId || undefined);
      }

      // 2. Assign Nurse if changed
      const currentNur = selectedAppt.nurseStaffId?._id || selectedAppt.nurseStaffId || '';
      if (selectedNurId !== currentNur) {
        await careAppointmentService.assignNurse(selectedAppt._id, selectedNurId || undefined);
      }

      setShowAssignModal(false);
      setSelectedAppt(null);
      fetchAppointments();

    } catch (err) {
      console.error('Failed to save staff assignment:', err);
      // Grab detailed Vietnamese error message from backend
      const errMsg = err.response?.data?.message || 'An error occurred during staff assignment.';
      setAssignmentError(errMsg);
    } finally {
      setSavingAssignment(false);
    }
  };

  // Open Create Appointment Modal
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormValues({
      residentId: '',
      scheduledStartAt: '',
      scheduledEndAt: '',
      appointmentType: 'Khám lâm sàng đầu vào',
      notes: '',
    });
    setApptFormError(null);
    setShowCreateModal(true);
  };

  // Open Edit Appointment Modal (Admin only)
  const handleOpenEdit = (appt) => {
    setIsEditMode(true);
    setSelectedAppt(appt);
    setFormValues({
      residentId: appt.residentId?._id || appt.residentId || '',
      scheduledStartAt: appt.scheduledStartAt ? appt.scheduledStartAt.slice(0, 16) : '',
      scheduledEndAt: appt.scheduledEndAt ? appt.scheduledEndAt.slice(0, 16) : '',
      appointmentType: appt.appointmentType || 'Khám lâm sàng đầu vào',
      notes: appt.notes || '',
    });
    setApptFormError(null);
    setShowCreateModal(true);
  };

  // Handle Save (Create/Edit) Appointment
  const handleSaveAppointment = async (e) => {
    if (e) e.preventDefault();
    setSavingAppt(true);
    setApptFormError(null);

    try {
      const payload = {
        residentId: formValues.residentId,
        scheduledStartAt: new Date(formValues.scheduledStartAt).toISOString(),
        scheduledEndAt: new Date(formValues.scheduledEndAt).toISOString(),
        appointmentType: formValues.appointmentType,
        notes: formValues.notes.trim() || undefined,
      };

      if (isEditMode && selectedAppt) {
        await careAppointmentService.updateAppointment(selectedAppt._id, payload);
      } else {
        await careAppointmentService.createAppointment(payload);
      }

      setShowCreateModal(false);
      setSelectedAppt(null);
      fetchAppointments();

    } catch (err) {
      console.error('Failed to save appointment:', err);
      const errMsg = err.response?.data?.message || 'An error occurred while saving the appointment.';
      setApptFormError(errMsg);
    } finally {
      setSavingAppt(false);
    }
  };

  // Open Status modal (for medical staff)
  const handleOpenStatus = (appt) => {
    setSelectedAppt(appt);
    setTargetApptStatus(appt.status);
    setStatusError(null);
    setShowStatusModal(true);
  };

  // Handle Update Status (Doctor/Nurse role)
  const handleUpdateStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAppt) return;

    setUpdatingStatus(true);
    setStatusError(null);

    try {
      await careAppointmentService.updateStatus(selectedAppt._id, targetApptStatus);
      setShowStatusModal(false);
      setSelectedAppt(null);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      const errMsg = err.response?.data?.message || 'An error occurred while updating status.';
      setStatusError(errMsg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="cap-container">
      {/* Page Header */}
      <div className="cap-header">
        <div>
          <h1>
            <Calendar className="text-navy-deep" size={26} />
            Lịch Hẹn Khám (Appointments)
          </h1>
          <p>
            {isAdminRole 
              ? 'Lập lịch trình khám, điều phối Bác sĩ và Y tá phụ trách khám lâm sàng đầu vào cho người cao tuổi.'
              : 'Theo dõi, cập nhật trạng thái các lịch khám bệnh và lịch trình của cư dân được phân công.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchAppointments} disabled={loading} className="cap-btn-refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          {isAdminRole && (
            <button onClick={handleOpenCreate} className="cap-btn-primary">
              <Plus size={16} />
              Tạo Lịch Khám
            </button>
          )}
        </div>
      </div>

      {/* Metrics widgets */}
      <div className="cap-metrics-grid">
        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
            <Calendar size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Tổng cuộc hẹn</span>
            <span className="cap-stat-value">{metrics.total}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Chờ khám</span>
            <span className="cap-stat-value">{metrics.scheduled}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Activity size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Đang khám</span>
            <span className="cap-stat-value">{metrics.inProgress}</span>
          </div>
        </div>

        <div className="cap-card-stat">
          <div className="cap-stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span className="cap-stat-label">Đã hoàn thành</span>
            <span className="cap-stat-value">{metrics.completed}</span>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="cap-filter-panel">
        <form onSubmit={handleApplyFilters}>
          <div className="cap-filter-grid">
            <div className="cap-filter-group">
              <div className="cap-filter-input-wrapper">
                <Search className="cap-filter-input-icon" size={16} />
                <input
                  type="text"
                  className="cap-filter-input"
                  placeholder="Tìm theo Resident ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="cap-filter-group">
              <select
                className="cap-filter-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cap-filter-row-secondary">
            <div className="cap-filter-date-group">
              <span className="cap-date-title">
                <Calendar size={13} className="text-slate-400" /> Ngày hẹn khám:
              </span>
              <input
                type="date"
                className="cap-date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-slate-400 text-xs font-semibold">đến</span>
              <input
                type="date"
                className="cap-date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="cap-filter-actions">
              <button type="button" onClick={handleResetFilters} className="cap-btn-clear">
                Xóa Bộ Lọc
              </button>
              <button type="submit" className="cap-btn-apply">
                Áp Dụng
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table grid */}
      <div className="cap-table-card">
        {loading && data.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <RefreshCw className="animate-spin text-emerald-sage mb-3" size={32} />
            <p className="text-slate-500 text-sm">Đang tải lịch hẹn khám...</p>
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-white" style={{ minHeight: '300px' }}>
            <AlertCircle className="text-red-500 mb-3" size={36} />
            <p className="text-slate-800 font-bold mb-1">Đã có lỗi xảy ra</p>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-white" style={{ minHeight: '300px' }}>
            <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3" style={{ width: 'fit-content' }}>
              <Calendar size={30} />
            </div>
            <p className="text-slate-700 font-bold mb-1">Không tìm thấy lịch hẹn nào</p>
            <p className="text-slate-400 text-xs max-w-sm">
              Bạn chưa có lịch hẹn khám nào được lên lịch hoặc khớp với bộ lọc tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="cap-table-responsive">
            <table className="cap-table">
              <thead>
                <tr>
                  <th>Elderly Resident</th>
                  <th>Thời gian khám</th>
                  <th>Loại khám</th>
                  <th>Bác sĩ phụ trách</th>
                  <th>Y tá phụ trách</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row._id} className="cap-table-row">
                    <td>
                      <div className="cap-resident-info">
                        <span className="cap-resident-name">{row.residentId?.fullName || 'Người cao tuổi'}</span>
                        <span className="cap-resident-code">#{row.residentId?.residentCode || row.residentId?._id || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                        {formatEnglishDate(row.scheduledStartAt)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {formatTimeRange(row.scheduledStartAt, row.scheduledEndAt)}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#475569' }}>
                      {row.appointmentType}
                    </td>
                    <td>
                      {row.doctorStaffId?.fullName ? (
                        <div className="cap-staff-badge">
                          <User size={12} />
                          {row.doctorStaffId.fullName}
                        </div>
                      ) : (
                        <div className="cap-staff-badge is-unassigned">Chưa chỉ định</div>
                      )}
                    </td>
                    <td>
                      {row.nurseStaffId?.fullName ? (
                        <div className="cap-staff-badge">
                          <User size={12} />
                          {row.nurseStaffId.fullName}
                        </div>
                      ) : (
                        <div className="cap-staff-badge is-unassigned">Chưa chỉ định</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`cap-badge-status cap-status-${row.status.replace(/_/g, '-')}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {isAdminRole && (
                          <>
                            <button
                              onClick={() => handleOpenAssign(row)}
                              className="cap-btn-action"
                              title="Chỉ định Bác sĩ & Y tá"
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <UserCheck size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="cap-btn-action"
                              title="Chỉnh sửa thời gian"
                              disabled={['completed', 'cancelled'].includes(row.status)}
                            >
                              <Edit size={14} />
                            </button>
                          </>
                        )}
                        {isMedicalRole && (
                          <button
                            onClick={() => handleOpenStatus(row)}
                            className="cap-btn-action"
                            title="Cập nhật trạng thái"
                            disabled={['completed', 'cancelled'].includes(row.status)}
                          >
                            <Activity size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="cap-filter-row-secondary" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Hiển thị <span>{(page - 1) * limit + 1}</span> đến{' '}
              <span>{Math.min(page * limit, total)}</span> trong tổng số{' '}
              <span>{total}</span> lịch hẹn
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="cap-btn-clear"
                style={{ padding: '6px 12px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '13px', color: '#475569' }}>
                Trang {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="cap-btn-clear"
                style={{ padding: '6px 12px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CHỈ ĐỊNH BÁC SĨ & Y TÁ (ASSIGN STAFF) */}
      {showAssignModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">Chỉ Định Bác Sĩ & Y Tá Phụ Trách</h4>
            <p className="cap-modal__text">
              Phân công nhân sự y tế thực hiện khám lâm sàng đầu vào cho người cao tuổi{' '}
              <strong>{selectedAppt.residentId?.fullName}</strong>.
            </p>

            {assignmentError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{assignmentError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAssignment}>
              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Bác sĩ phụ trách *</label>
                <select
                  className="cap-filter-select"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">Đang tải danh sách Bác sĩ trực ca...</option>
                  ) : (
                    <>
                      <option value="">-- Chưa chỉ định Bác sĩ --</option>
                      {availableDoctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.fullName} ({doc.specialty || 'Đa khoa'})
                        </option>
                      ))}
                      {selectedAppt.doctorStaffId && !availableDoctors.some(d => d._id === (selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId)) && (
                        <option key={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId} value={selectedAppt.doctorStaffId._id || selectedAppt.doctorStaffId}>
                          {selectedAppt.doctorStaffId.fullName || 'Bác sĩ hiện tại'} (Không trong ca trực)
                        </option>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Y tá phụ trách *</label>
                <select
                  className="cap-filter-select"
                  value={selectedNurId}
                  onChange={(e) => setSelectedNurId(e.target.value)}
                  disabled={loadingAvailableStaff}
                >
                  {loadingAvailableStaff ? (
                    <option value="">Đang tải danh sách Y tá trực ca...</option>
                  ) : (
                    <>
                      <option value="">-- Chưa chỉ định Y tá --</option>
                      {availableNurses.map((nur) => (
                        <option key={nur._id} value={nur._id}>
                          {nur.fullName}
                        </option>
                      ))}
                      {selectedAppt.nurseStaffId && !availableNurses.some(n => n._id === (selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId)) && (
                        <option key={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId} value={selectedAppt.nurseStaffId._id || selectedAppt.nurseStaffId}>
                          {selectedAppt.nurseStaffId.fullName || 'Y tá hiện tại'} (Không trong ca trực)
                        </option>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={savingAssignment}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAssignment}
                >
                  {savingAssignment ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang phân công...
                    </>
                  ) : (
                    'Xác nhận Phân Công'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO/SỬA LỊCH HẸN KHÁM (CREATE/EDIT APPOINTMENT) */}
      {showCreateModal && (
        <div className="cap-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">
              {isEditMode ? 'Chỉnh Sửa Lịch Hẹn Khám' : 'Tạo Lịch Hẹn Khám Mới'}
            </h4>
            <p className="cap-modal__text">
              Điền các thông tin cần thiết để lên lịch khám lâm sàng hoặc khám bệnh cho cư dân.
            </p>

            {apptFormError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{apptFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAppointment}>
              <div className="cap-form-group">
                <label className="cap-form-label">Chọn Cư dân (Resident) *</label>
                <select
                  className="cap-filter-select"
                  value={formValues.residentId}
                  onChange={(e) => setFormValues(prev => ({ ...prev, residentId: e.target.value }))}
                  required
                  disabled={isEditMode}
                >
                  <option value="">-- Chọn Cư dân --</option>
                  {residentsList.map((res) => (
                    <option key={res._id} value={res._id}>
                      {res.fullName} (#{res.residentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Loại cuộc hẹn *</label>
                <select
                  className="cap-filter-select"
                  value={formValues.appointmentType}
                  onChange={(e) => setFormValues(prev => ({ ...prev, appointmentType: e.target.value }))}
                  required
                >
                  {APPOINTMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Thời gian bắt đầu *</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledStartAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledStartAt: e.target.value }))}
                  required
                />
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Thời gian kết thúc *</label>
                <input
                  type="datetime-local"
                  className="cap-form-input"
                  value={formValues.scheduledEndAt}
                  onChange={(e) => setFormValues(prev => ({ ...prev, scheduledEndAt: e.target.value }))}
                  required
                />
              </div>

              <div className="cap-form-group">
                <label className="cap-form-label">Ghi chú (Notes)</label>
                <textarea
                  className="cap-form-input"
                  style={{ minHeight: '60px', fontFamily: 'inherit' }}
                  placeholder="Ghi chú về triệu chứng bệnh hoặc phòng khám..."
                  value={formValues.notes}
                  onChange={(e) => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={savingAppt}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={savingAppt}
                >
                  {savingAppt ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang xử lý...
                    </>
                  ) : (
                    'Lưu Lịch Hẹn'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CẬP NHẬT TRẠNG THÁI (UPDATE STATUS FOR MEDICAL STAFF) */}
      {showStatusModal && selectedAppt && (
        <div className="cap-modal-backdrop" onClick={() => setShowStatusModal(false)}>
          <div className="cap-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="cap-modal__title">Cập Nhật Trạng Thái Khám</h4>
            <p className="cap-modal__text">
              Thay đổi trạng thái quá trình khám cho cư dân <strong>{selectedAppt.residentId?.fullName}</strong>.
            </p>

            {statusError && (
              <div className="cap-error-banner">
                <AlertCircle size={16} />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatus}>
              <div className="cap-form-group">
                <label className="cap-form-label">Trạng thái hiện tại: {selectedAppt.status}</label>
                <select
                  className="cap-filter-select"
                  value={targetApptStatus}
                  onChange={(e) => setTargetApptStatus(e.target.value)}
                  required
                >
                  <option value="scheduled">Scheduled (Đã lên lịch)</option>
                  <option value="in_progress">In Progress (Đang khám)</option>
                  <option value="completed">Completed (Đã khám xong)</option>
                  <option value="cancelled">Cancelled (Hủy bỏ)</option>
                </select>
              </div>

              <div className="cap-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="cap-modal-btn-cancel"
                  disabled={updatingStatus}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cap-modal-btn-submit"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 className="animate-spin mr-1" size={13} />
                      Đang cập nhật...
                    </>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
