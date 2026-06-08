import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, RefreshCw, Users } from 'lucide-react';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
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
import { staffToEditForm } from '../../../../utils/staffFormSnapshot';
import './profiles.css';

const emptyEditForm = {
  fullName: '', phone: '', gender: '', dateOfBirth: '',
  specialty: '', role: 'nurse', address: '',
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
  const [editLoading, setEditLoading] = useState(false);
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

  const closeEditModal = () => {
    setEditStaff(null);
    setEditLoading(false);
    setEditError('');
    setEditForm(emptyEditForm);
  };

  /* ---- Edit: pre-fill inputs from list, then refresh full profile from API ---- */
  const handleEdit = async (s) => {
    if (!canManage(s)) return;
    setDetailStaff(null);
    setEditStaff(s);
    setEditError('');
    setEditForm(staffToEditForm(s));
    setEditLoading(true);

    try {
      const fresh = await staffService.getById(s._id);
      setEditStaff(fresh);
      setEditForm(staffToEditForm(fresh));
    } catch (e) {
      setEditError(e.response?.data?.message || 'Không tải đủ hồ sơ — đang dùng dữ liệu từ danh sách');
    } finally {
      setEditLoading(false);
    }
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
      const roleChanged = editForm.role !== editStaff.role;

      await Promise.all([
        staffService.update(editStaff._id, profileBody),
        roleChanged
          ? staffService.updateRole(editStaff._id, { role: editForm.role })
          : Promise.resolve(),
      ]);
      closeEditModal();
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

  const activeCount = staff.filter((s) => s.isActive && !s.isBanned).length;
  const bannedCount = staff.filter((s) => s.isBanned).length;

  return (
    <AdminPageShell
      title="Hồ sơ nhân viên"
      subtitle={
        actorRole === 'manager'
          ? 'Quản lý nhân viên vận hành (bác sĩ, y tá, chăm sóc). Không tạo hoặc sửa tài khoản admin/quản lý.'
          : 'Quản lý và phân loại vai trò nhân viên'
      }
      actions={
        <>
          <button
            type="button"
            className="resident-page__button resident-page__button--ghost"
            onClick={loadStaff}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            className="resident-page__button resident-page__button--primary"
            onClick={() => {
              setCreateError('');
              setShowCreate(true);
            }}
          >
            <Plus size={16} />
            Thêm nhân viên
          </button>
        </>
      }
      stats={[
        { label: 'Tổng nhân viên', value: String(staff.length).padStart(2, '0'), icon: <Users size={20} /> },
        {
          label: 'Đang làm việc',
          value: String(activeCount).padStart(2, '0'),
          icon: <Users size={20} />,
          iconClass: 'resident-stat__icon--admitted',
        },
        {
          label: 'Đang bị ban',
          value: String(bannedCount).padStart(2, '0'),
          icon: <Users size={20} />,
          iconClass: 'resident-stat__icon--inactive',
        },
      ]}
    >
      <form className="resident-page__filters" onSubmit={handleSearch}>
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>Tìm kiếm</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tên, email, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="resident-page__filter">
            <span>Vai trò</span>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">Tất cả vai trò</option>
              {filterRoleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>Trạng thái</span>
            <select value={filterBanned} onChange={(e) => setFilterBanned(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="false">Không bị ban</option>
              <option value="true">Đang bị ban</option>
            </select>
          </label>
          <div className="resident-page__filter-actions">
            <button type="submit" className="resident-page__button resident-page__button--primary">
              Áp dụng
            </button>
          </div>
        </div>
      </form>

      {pageError && <div className="resident-page__error">{pageError}</div>}

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
          loading={editLoading}
          form={editForm}
          onChange={setEditForm}
          onSave={handleSaveEdit}
          onClose={closeEditModal}
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
    </AdminPageShell>
  );
}
