import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Users, Phone } from 'lucide-react';
import residentService from '../../../../services/resident.service';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import { FaEye } from 'react-icons/fa';
import AdminPageShell from '../../../../components/admin/AdminPageShell';
import ListPagination from '../../../../components/ui/ListPagination';
import { ADMIN_LIST_PAGE_SIZE } from '../../../../constants/adminListPage';
import useDebouncedSearch from '../../../../hooks/useDebouncedSearch';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';

const emptyContact = () => ({
  fullName: '',
  relationship: '',
  phone: '',
  email: '',
  address: '',
  isPrimary: false,
});

function formatRoom(room, t) {
  if (!room) return '—';
  const floor = room.floorId;
  const floorPart = floor?.name || (floor?.floorNumber != null ? `${t('admin.residents.common.floor')} ${floor.floorNumber}` : '');
  return [floorPart, room.roomNumber ? `${t('admin.residents.common.room')} ${room.roomNumber}` : ''].filter(Boolean).join(' · ') || '—';
}

function ContactFormModal({ mode, initial, saving, error, onSave, onClose, relationshipSuggestions, t }) {
  const [form, setForm] = useState(initial || emptyContact());
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    setForm(initial || emptyContact());
  }, [initial, mode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      fullName: form.fullName.trim(),
      relationship: form.relationship.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      isPrimary: Boolean(form.isPrimary),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {mode === 'edit' ? t('admin.residents.family.editContact') : t('admin.residents.family.addContact')}
        </h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-grid--full">
              <label>{t('admin.residents.family.fullName')} *</label>
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('admin.residents.family.relationship')} *</label>
              <input
                list="relationship-options"
                value={form.relationship}
                onChange={(e) => set('relationship', e.target.value)}
                required
              />
              <datalist id="relationship-options">
                {relationshipSuggestions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>{t('admin.residents.family.phone')} *</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </div>
            <div className="form-group form-grid--full">
              <label>{t('admin.residents.family.email')}</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="form-group form-grid--full">
              <label>{t('admin.residents.family.address')}</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group form-grid--full">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => set('isPrimary', e.target.checked)}
                />
                {t('admin.residents.family.primaryContact')}
              </label>
            </div>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FamilyManagementPage() {
  const { t } = useTranslation();
  const relationshipSuggestions = useMemo(
    () => [
      t('admin.residents.family.relationships.son'),
      t('admin.residents.family.relationships.daughter'),
      t('admin.residents.family.relationships.spouse'),
      t('admin.residents.family.relationships.sibling'),
      t('admin.residents.family.relationships.grandchild'),
      t('admin.residents.family.relationships.guardian'),
      t('admin.residents.family.relationships.other'),
    ],
    [t]
  );
  const [residents, setResidents]       = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resetPageOnSearch = useCallback(() => setPage(1), []);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({
    onDebouncedChange: resetPageOnSearch,
  });
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [listLoading, setListLoading]   = useState(false);
  const [listError, setListError]       = useState('');

  const [selectedId, setSelectedId]     = useState(null);
  const [familyData, setFamilyData]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]   = useState('');
  const [panelMsg, setPanelMsg]         = useState('');

  const [contactModal, setContactModal] = useState(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState('');
  const [detailContact, setDetailContact] = useState(null);
  const [residentDetailPopup, setResidentDetailPopup] = useState(null);

  const loadList = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setListLoading(true);
    setListError('');
    try {
      const res = await residentService.listForFamilyManagement({
        page,
        limit: ADMIN_LIST_PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
      setResidents(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setListError(e.response?.data?.message || 'Không thể tải danh sách cư dân');
      setResidents([]);
    } finally {
      if (!silent) setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  const loadDetail = useCallback(async (residentId) => {
    if (!residentId) {
      setFamilyData(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    try {
      const data = await residentService.getFamilyInfo(residentId);
      setFamilyData(data);
    } catch (e) {
      setDetailError(e.response?.data?.message || 'Không thể tải thông tin thân nhân');
      setFamilyData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const handleSelect = (r) => {
    setSelectedId(r._id);
    setPanelMsg('');
    setDetailError('');
    setDetailContact(null);
  };

  const refreshAfterContactChange = async () => {
    if (!selectedId) return;
    await Promise.all([loadDetail(selectedId), loadList({ silent: true })]);
  };

  const handleSaveContact = async (payload) => {
    setContactSaving(true);
    setContactError('');
    try {
      if (contactModal?.mode === 'edit' && contactModal.contact?._id) {
        await residentService.updateEmergencyContact(
          selectedId,
          contactModal.contact._id,
          payload
        );
        setPanelMsg('Đã cập nhật liên hệ khẩn cấp.');
      } else {
        await residentService.addEmergencyContact(selectedId, payload);
        setPanelMsg('Đã thêm liên hệ khẩn cấp.');
      }
      setContactModal(null);
      await refreshAfterContactChange();
    } catch (e) {
      setContactError(e.response?.data?.message || 'Lưu thất bại');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Xóa liên hệ "${contact.fullName}"?`)) return;
    try {
      await residentService.removeEmergencyContact(selectedId, contact._id);
      setPanelMsg('Đã xóa liên hệ khẩn cấp.');
      await refreshAfterContactChange();
    } catch (e) {
      alert(e.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSetPrimary = async (contact) => {
    if (contact.isPrimary) return;
    try {
      await residentService.updateEmergencyContact(selectedId, contact._id, { isPrimary: true });
      setPanelMsg(`Đã đặt "${contact.fullName}" làm liên hệ chính.`);
      await refreshAfterContactChange();
    } catch (e) {
      alert(e.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const openResidentDetail = async (r, e) => {
    e?.stopPropagation();
    setResidentDetailPopup({ loading: true, error: '', resident: null, summary: r });
    try {
      const data = await residentService.getFamilyInfo(r._id);
      setResidentDetailPopup({
        loading: false,
        error: '',
        resident: data.resident,
        contactCount: data.emergencyContacts?.length ?? r.emergencyContactCount ?? 0,
        summary: r,
      });
    } catch (err) {
      setResidentDetailPopup({
        loading: false,
        error: err.response?.data?.message || 'Không thể tải chi tiết cư dân',
        resident: null,
        summary: r,
      });
    }
  };

  const resident = familyData?.resident;
  const contacts = familyData?.emergencyContacts ?? [];
  const selectedSummary = residents.find((r) => r._id === selectedId);

  const stats = useMemo(() => {
    const withContacts = residents.filter((r) => (r.emergencyContactCount ?? 0) > 0).length;
    const noContacts = residents.filter((r) => !(r.emergencyContactCount ?? 0)).length;
    return { withContacts, noContacts };
  }, [residents]);

  return (
    <AdminPageShell
      title={t('admin.residents.family.title')}
      subtitle={t('admin.residents.family.subtitle')}
      actions={
        <button
          type="button"
          className="resident-page__button resident-page__button--ghost"
          onClick={() => loadList()}
          disabled={listLoading}
        >
          <RefreshCw size={16} className={listLoading ? 'spin' : ''} />
          {t('admin.residents.common.refresh')}
        </button>
      }
      stats={[
        { label: t('admin.residents.family.statTotal'), value: String(total).padStart(2, '0'), icon: <Users size={20} /> },
        {
          label: t('admin.residents.family.statWithContacts'),
          value: String(stats.withContacts).padStart(2, '0'),
          icon: <Phone size={20} />,
          iconClass: 'resident-stat__icon--admitted',
        },
        {
          label: t('admin.residents.family.statWithoutContacts'),
          value: String(stats.noContacts).padStart(2, '0'),
          icon: <Phone size={20} />,
          iconClass: 'resident-stat__icon--pending',
        },
      ]}
    >
      <div className="resident-page__filters">
        <div className="resident-page__filter-row">
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.search')}</span>
            <div className="resident-page__filter-input">
              <Search size={16} />
              <input
                type="search"
                placeholder={t('admin.residents.common.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="resident-page__filter">
            <span>{t('admin.residents.common.status')}</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="admitted">{t('common.residency.admitted')}</option>
              <option value="pending">{t('common.residency.pending')}</option>
              <option value="discharged">{t('common.residency.discharged')}</option>
              <option value="">{t('common.allStatuses')}</option>
            </select>
          </label>
        </div>
      </div>

      {listError && <div className="resident-page__error">{listError}</div>}

      <div className="resident-page__split">
        <div>
          <div className="resident-page__table">
          <table className="resident-page__table-element">
            <thead>
              <tr className="resident-page__table-header">
                <th>Mã</th>
                <th>Họ tên</th>
                <th>Số LH</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listLoading && (
                <tr><td colSpan={4} className="resident-page__empty">Đang tải...</td></tr>
              )}
              {!listLoading && residents.length === 0 && (
                <tr><td colSpan={4} className="resident-page__empty">Không có cư dân nào</td></tr>
              )}
              {!listLoading && residents.map((r) => (
                <tr
                  key={r._id}
                  className={`resident-page__table-row${selectedId === r._id ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.residentCode}</td>
                  <td style={{ fontWeight: 600 }}>{r.fullName}</td>
                  <td>{r.emergencyContactCount ?? 0}</td>
                  <td className="resident-action-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="resident-icon-btn resident-icon-btn--view"
                      title="Xem chi tiết cư dân"
                      onClick={(e) => openResidentDetail(r, e)}
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!listLoading && residents.length > 0 && (
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className="resident-page__panel">
          {!selectedId ? (
            <div className="empty-state">Chọn cư dân để xem và quản lý liên hệ thân nhân</div>
          ) : detailLoading ? (
            <div className="empty-state">Đang tải thông tin...</div>
          ) : detailError ? (
            <div className="empty-state">{detailError}</div>
          ) : (
            <>
              <h2 className="resident-page__panel-title">Liên hệ khẩn cấp</h2>
              <p className="resident-page__panel-subtitle">
                {selectedSummary?.fullName || resident?.fullName}
                {' · '}
                {selectedSummary?.residentCode || resident?.residentCode}
                {resident?.residencyStatus && (
                  <> · {RESIDENCY_LABELS[resident.residencyStatus] || resident.residencyStatus}</>
                )}
              </p>
              <div className="resident-summary">
                <div className="resident-summary__name">
                  {selectedSummary?.fullName || resident?.fullName}
                </div>
                <div className="resident-summary__meta">
                  Phòng: {formatRoom(resident?.roomId || selectedSummary?.roomId, t)}
                  <br />
                  {contacts.length} liên hệ khẩn cấp
                </div>
              </div>

              {panelMsg && <p className="form-success">{panelMsg}</p>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  Danh sách liên hệ
                </span>
                <button
                  type="button"
                  className="resident-page__button resident-page__button--primary resident-page__button--sm"
                  onClick={() => {
                    setContactError('');
                    setContactModal({ mode: 'add' });
                  }}
                >
                  + Thêm liên hệ
                </button>
              </div>

              {contacts.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  Chưa có liên hệ khẩn cấp. Nhấn &quot;Thêm liên hệ&quot; để bổ sung.
                </div>
              ) : (
                <div className="contact-list">
                  {contacts.map((c) => (
                    <div
                      key={c._id}
                      className={`contact-card ${c.isPrimary ? 'contact-card--primary' : ''}`}
                    >
                      <div className="contact-card__header">
                        <span className="contact-card__name">{c.fullName}</span>
                        {c.isPrimary && <span className="contact-card__primary">Liên hệ chính</span>}
                      </div>
                      <div className="contact-card__row">{c.phone}</div>
                      <div className="contact-card__row">{c.relationship}</div>
                      <div className="contact-card__actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => setDetailContact(c)}
                        >
                          Xem chi tiết
                        </button>
                        {!c.isPrimary && (
                          <button
                            type="button"
                            className="btn btn--sm btn--ghost"
                            onClick={() => handleSetPrimary(c)}
                          >
                            Đặt làm chính
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--sm btn--edit"
                          onClick={() => {
                            setContactError('');
                            setContactModal({ mode: 'edit', contact: c });
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--delete"
                          onClick={() => handleDeleteContact(c)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {contactModal && (
        <ContactFormModal
          mode={contactModal.mode}
          initial={
            contactModal.mode === 'edit' && contactModal.contact
              ? {
                  fullName: contactModal.contact.fullName || '',
                  relationship: contactModal.contact.relationship || '',
                  phone: contactModal.contact.phone || '',
                  email: contactModal.contact.email || '',
                  address: contactModal.contact.address || '',
                  isPrimary: Boolean(contactModal.contact.isPrimary),
                }
              : emptyContact()
          }
          saving={contactSaving}
          error={contactError}
          onSave={handleSaveContact}
          onClose={() => setContactModal(null)}
          relationshipSuggestions={relationshipSuggestions}
          t={t}
        />
      )}

      {detailContact && (
        <div className="modal-overlay" onClick={() => setDetailContact(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chi tiết liên hệ thân nhân</h2>
            <div className="detail-row"><strong>Họ tên:</strong> {detailContact.fullName}</div>
            <div className="detail-row"><strong>Số điện thoại:</strong> {detailContact.phone}</div>
            <div className="detail-row"><strong>Quan hệ:</strong> {detailContact.relationship}</div>
            <div className="detail-row"><strong>Email:</strong> {detailContact.email || '—'}</div>
            <div className="detail-row"><strong>Địa chỉ:</strong> {detailContact.address || '—'}</div>
            <div className="detail-row">
              <strong>Loại liên hệ:</strong> {detailContact.isPrimary ? 'Liên hệ chính' : 'Liên hệ phụ'}
            </div>
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setDetailContact(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {residentDetailPopup && (
        <div className="modal-overlay" onClick={() => setResidentDetailPopup(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Chi tiết cư dân</h2>
            {residentDetailPopup.loading && (
              <p className="empty-state" style={{ padding: '16px 0' }}>Đang tải...</p>
            )}
            {!residentDetailPopup.loading && residentDetailPopup.error && (
              <p className="form-error">{residentDetailPopup.error}</p>
            )}
            {!residentDetailPopup.loading && !residentDetailPopup.error && residentDetailPopup.resident && (
              <>
                <div className="detail-row">
                  <strong>Mã cư dân:</strong> {residentDetailPopup.resident.residentCode}
                </div>
                <div className="detail-row">
                  <strong>Họ tên:</strong> {residentDetailPopup.resident.fullName}
                </div>
                <div className="detail-row">
                  <strong>Ngày sinh:</strong>{' '}
                  {residentDetailPopup.resident.dateOfBirth
                    ? formatLeaveDate(residentDetailPopup.resident.dateOfBirth)
                    : '—'}
                </div>
                <div className="detail-row">
                  <strong>Giới tính:</strong>{' '}
                  {GENDER_LABELS[residentDetailPopup.resident.gender]
                    || residentDetailPopup.resident.gender
                    || '—'}
                </div>
                <div className="detail-row">
                  <strong>Phòng:</strong> {formatRoom(residentDetailPopup.resident.roomId, t)}
                </div>
                <div className="detail-row">
                  <strong>Trạng thái:</strong>{' '}
                  {RESIDENCY_LABELS[residentDetailPopup.resident.residencyStatus]
                    || residentDetailPopup.resident.residencyStatus
                    || '—'}
                </div>
                <div className="detail-row">
                  <strong>Số liên hệ khẩn cấp:</strong> {residentDetailPopup.contactCount ?? 0}
                </div>
              </>
            )}
            <div className="modal__actions">
              <button type="button" className="btn-cancel" onClick={() => setResidentDetailPopup(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
