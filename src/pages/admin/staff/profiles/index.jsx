import { useEffect, useMemo, useState } from 'react';
import staffService from '../../../../services/staff.service';
import useAuth from '../../../../hooks/useAuth';
import {
  canActorManageStaffMember,
  getCreatableRoleOptions,
  getFilterRoleOptions,
} from '../../../../constants/rolePolicy';
import StaffTable from './StaffTable';
import StaffDetailModal from './StaffDetailModal';
import StaffEditModal from './StaffEditModal';
import StaffBanModal from './StaffBanModal';
import StaffCreateModal from './StaffCreateModal';
import './profiles.css';

const emptyEditForm = {
  fullName: '', phone: '', gender: '', dateOfBirth: '',
  specialty: '', role: 'nurse', roleCategory: '', address: '',
  avatarFile: null, avatarUrl: '', password: '',
};

export default function StaffManagementPage() {
  const { user } = useAuth();
  const actorRole = user?.role;
  const roleOptions = useMemo(() => getCreatableRoleOptions(actorRole), [actorRole]);
  const filterRoleOptions = useMemo(() => getFilterRoleOptions(actorRole), [actorRole]);
  const canManage = (member) => canActorManageStaffMember(actorRole, member);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBanned, setFilterBanned] = useState('');
  const [pageError, setPageError] = useState('');

  // Modal state
  const [detailStaff, setDetailStaff] = useState(null);
  const [editStaff, setEditStaff] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editError, setEditError] = useState('');
  const [banStaff, setBanStaff] = useState(null);
  const [banLoading, setBanLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  /* ---- Data loading ---- */
  const loadStaff = async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await staffService.getAll({
        role: filterRole || undefined,
        search: search || undefined,
        isBanned: filterBanned !== '' ? filterBanned : undefined,
      });
      setStaff(res.data || res);
    } catch (e) {
      setPageError(e.response?.data?.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, [filterRole, filterBanned]);

  const handleSearch = (e) => { e.preventDefault(); loadStaff(); };

  /* ---- View detail ---- */
  const handleView = (s) => setDetailStaff(s);

  /* ---- Edit ---- */
  const handleEdit = (s) => {
    if (!canManage(s)) return;
    setEditStaff(s);
    setEditForm({
      fullName: s.fullName || '',
      phone: s.phone || '',
      gender: s.gender || '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
      specialty: s.staffProfile?.specialty || '',
      role: s.role || 'nurse',
      roleCategory: s.staffProfile?.roleCategory || '',
      address: s.address || '',
      avatarFile: null,
      avatarUrl: s.avatarUrl || '',
      password: '',
    });
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editForm.fullName.trim()) { setEditError('Họ tên không được để trống'); return; }
    try {
      const profileBody = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        gender: editForm.gender,
        dateOfBirth: editForm.dateOfBirth || undefined,
        specialty: editForm.specialty,
        address: editForm.address,
        avatarFile: editForm.avatarFile || undefined,
        password: editForm.password || undefined,
      };
      const roleChanged =
        editForm.role !== editStaff.role ||
        editForm.roleCategory !== (editStaff.staffProfile?.roleCategory || '');

      await Promise.all([
        staffService.update(editStaff._id, profileBody),
        roleChanged
          ? staffService.updateRole(editStaff._id, {
              role: editForm.role,
              roleCategory: editForm.roleCategory || undefined,
            })
          : Promise.resolve(),
      ]);
      setEditStaff(null);
      loadStaff();
    } catch (e) {
      setEditError(e.response?.data?.message || 'Lưu thất bại');
    }
  };

  /* ---- Ban / Unban ---- */
  const handleBanOpen = (s) => {
    if (!canManage(s)) return;
    setBanStaff(s);
  };

  const handleBan = async (id, banReason) => {
    setBanLoading(true);
    try {
      await staffService.ban(id, banReason);
      setStaff((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isBanned: true, banReason } : s))
      );
      setBanStaff(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Ban thất bại');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnban = async (id) => {
    setBanLoading(true);
    try {
      await staffService.unban(id);
      setStaff((prev) =>
        prev.map((s) => (s._id === id ? { ...s, isBanned: false, banReason: undefined } : s))
      );
      setBanStaff(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Gỡ ban thất bại');
    } finally {
      setBanLoading(false);
    }
  };

  /* ---- Create ---- */
  const handleCreate = async (data) => {
    setCreateError('');
    try {
      await staffService.create(data);
      setShowCreate(false);
      loadStaff();
    } catch (e) {
      setCreateError(e.response?.data?.message || 'Tạo tài khoản thất bại');
    }
  };

  return (
    <div className="staff-page">
      {/* Header */}
      <div className="staff-page__header">
        <div>
          <h1 className="staff-page__title">Hồ sơ nhân viên</h1>
          <p className="staff-page__subtitle">
            {actorRole === 'manager'
              ? 'Quản lý nhân viên vận hành (bác sĩ, y tá, chăm sóc). Không tạo hoặc sửa tài khoản admin/quản lý.'
              : 'Quản lý và phân loại vai trò nhân viên'}
          </p>
        </div>
        <button className="staff-page__btn staff-page__btn--primary" onClick={() => { setCreateError(''); setShowCreate(true); }}>
          + Thêm nhân viên
        </button>
      </div>

      {/* Search & filter bar */}
      <form className="staff-page__search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm tên, email, username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {filterRoleOptions.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select value={filterBanned} onChange={(e) => setFilterBanned(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="false">Không bị ban</option>
          <option value="true">Đang bị ban</option>
        </select>
        <button type="submit" className="staff-page__btn staff-page__btn--secondary">
          Tìm kiếm
        </button>
      </form>

      {pageError && <p className="form-error">{pageError}</p>}

      <StaffTable
        staff={staff}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onBan={handleBanOpen}
        canManage={canManage}
      />

      {/* Detail modal */}
      {detailStaff && (
        <StaffDetailModal
          staff={detailStaff}
          onClose={() => setDetailStaff(null)}
          onEdit={handleEdit}
          canEdit={canManage(detailStaff)}
        />
      )}

      {/* Edit modal */}
      {editStaff && (
        <StaffEditModal
          form={editForm}
          onChange={setEditForm}
          onSave={handleSaveEdit}
          onClose={() => setEditStaff(null)}
          error={editError}
          roleOptions={roleOptions}
        />
      )}

      {/* Ban / Unban modal */}
      {banStaff && (
        <StaffBanModal
          staff={banStaff}
          onBan={handleBan}
          onUnban={handleUnban}
          onClose={() => setBanStaff(null)}
          loading={banLoading}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <StaffCreateModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          serverError={createError}
          roleOptions={roleOptions}
        />
      )}
    </div>
  );
}
