import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, RefreshCw, Users } from 'lucide-react';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import useClientPagination from '../../../../hooks/useClientPagination';
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
import { resolveApiError } from '../../../../utils/apiMessage';
import { staffDateOfBirthValidationKey, validateStaffDateOfBirth } from '../../../../utils/staffAgeValidation';
import './profiles.css';

const emptyEditForm = {
  fullName: '', phone: '', gender: '', dateOfBirth: '',
  specialty: '', role: 'nurse', address: '',
  avatarFile: null, avatarUrl: '', password: '',
};

export default function StaffManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const actorRole = user?.role;
  const roleOptions = useMemo(() => getCreatableRoleOptions(actorRole), [actorRole]);
  const filterRoleOptions = useMemo(() => getFilterRoleOptions(actorRole), [actorRole]);
  const canManage = (member) => canActorManageStaffMember(actorRole, member);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [filterRole, setFilterRole] = useState('');
  const [filterBanned, setFilterBanned] = useState('');
  const [pageError, setPageError] = useState('');
  const [useClientFallback, setUseClientFallback] = useState(false);
  const [allStaff, setAllStaff] = useState([]);

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
  const loadStaff = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await staffService.getAll({
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        role: filterRole || undefined,
        search: debouncedSearch || undefined,
        isBanned: filterBanned !== '' ? filterBanned : undefined,
      });

      if (Array.isArray(res)) {
        setUseClientFallback(true);
        setAllStaff(res);
        setStaffTotal(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / ADMIN_LIST_PAGE_SIZE)));
      } else {
        setUseClientFallback(false);
        setAllStaff([]);
        const data = res.data || [];
        setStaff(data);
        setStaffTotal(res.total ?? data.length);
        setTotalPages(res.totalPages ?? Math.max(1, Math.ceil((res.total ?? data.length) / ADMIN_LIST_PAGE_SIZE)));
      }
    } catch (e) {
      setPageError(resolveApiError(e, t, 'admin.staff.common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterRole, filterBanned, t]);

  const {
    paginatedItems: clientPaginatedStaff,
    page: clientPage,
    setPage: setClientPage,
    totalPages: clientTotalPages,
    total: clientTotal,
    resetPage: resetClientPage,
  } = useClientPagination(useClientFallback ? allStaff : [], ADMIN_LIST_PAGE_SIZE);

  const displayStaff = useClientFallback ? clientPaginatedStaff : staff;
  const displayPage = useClientFallback ? clientPage : page;
  const displayTotalPages = useClientFallback ? clientTotalPages : totalPages;
  const displayTotal = useClientFallback ? clientTotal : staffTotal;
  const handlePageChange = useClientFallback ? setClientPage : setPage;

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    setPage(1);
    if (useClientFallback) {
      resetClientPage();
    }
  }, [filterRole, filterBanned, useClientFallback, resetClientPage]);

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
      setEditError(resolveApiError(e, t, 'admin.staff.profiles.loadProfilePartial'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.fullName.trim()) { setEditError(t('admin.staff.profiles.fullNameRequired')); return; }

    const effectiveRole = editForm.role !== editStaff.role ? editForm.role : editStaff.role;
    const dobErrorKey = validateStaffDateOfBirth(editForm.dateOfBirth, {
      role: effectiveRole,
      gender: editForm.gender,
    });
    if (dobErrorKey) {
      setEditError(staffDateOfBirthValidationKey(dobErrorKey, t));
      return;
    }

    try {
      const profileBody = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        gender: editForm.gender,
        dateOfBirth: editForm.dateOfBirth || undefined,
        specialty: editForm.specialty,
        address: editForm.address,
        avatarFile: editForm.avatarFile || undefined,
        certificationFiles: editForm.certificationFiles?.length ? editForm.certificationFiles : undefined,
        removedCertPublicIds: editForm.removedCertPublicIds?.length ? editForm.removedCertPublicIds : undefined,
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
      setEditError(resolveApiError(e, t, 'common.saveFailed'));
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
      alert(resolveApiError(e, t, 'admin.staff.profiles.banFailed'));
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
      alert(resolveApiError(e, t, 'admin.staff.profiles.unbanFailed'));
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
      setCreateError(resolveApiError(e, t, 'admin.staff.profiles.createFailed'));
    }
  };

  const activeCount = displayStaff.filter((s) => s.isActive && !s.isBanned).length;
  const bannedCount = displayStaff.filter((s) => s.isBanned).length;

  return (
    <AdminPageShell
      title={t('admin.staff.profiles.title')}
      subtitle={
        actorRole === 'manager'
          ? t('admin.staff.profiles.subtitleManager')
          : t('admin.staff.profiles.subtitle')
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
            {t('admin.staff.common.refresh')}
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
            {t('admin.staff.common.addStaff')}
          </button>
        </>
      }
      stats={[
        { label: t('admin.staff.common.statTotal'), value: String(displayTotal).padStart(2, '0'), icon: <Users size={20} /> },
        {
          label: t('admin.staff.common.statActive'),
          value: String(activeCount).padStart(2, '0'),
          icon: <Users size={20} />,
          iconClass: 'resident-stat__icon--admitted',
        },
        {
          label: t('admin.staff.common.statBanned'),
          value: String(bannedCount).padStart(2, '0'),
          icon: <Users size={20} />,
          iconClass: 'resident-stat__icon--inactive',
        },
      ]}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('common.search')}</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="search"
                placeholder={t('admin.staff.common.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.staff.common.roleFilter')}</span>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">{t('admin.staff.common.allRoles')}</option>
              {filterRoleOptions.map((r) => (
                <option key={r.value} value={r.value}>{t(`common.roles.${r.value}`, { defaultValue: r.value })}</option>
              ))}
            </select>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.staff.common.banStatus')}</span>
            <select value={filterBanned} onChange={(e) => setFilterBanned(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="false">{t('admin.staff.common.notBanned')}</option>
              <option value="true">{t('admin.staff.common.banned')}</option>
            </select>
          </label>
        </div>
      </div>

      {pageError && <div className="resident-page__error">{pageError}</div>}

      <StaffTable
        staff={displayStaff}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onBan={handleBanOpen}
        canManage={canManage}
      />

      {!loading && displayStaff.length > 0 && (
        <ListPagination
          page={displayPage}
          totalPages={Math.max(displayTotalPages, 1)}
          total={displayTotal}
          onPageChange={handlePageChange}
        />
      )}

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
