import { useCallback, useEffect, useState } from 'react';
import residentService from '../../../../services/resident.service';
import { formatLeaveDate } from '../../../../utils/leaveUtils';
import { FaEye } from 'react-icons/fa';
import '../../../../styles/admin/FamilyManagementPage.css';
import '../../../../styles/admin/residentActionIcons.css';
import { GENDER_LABELS, RESIDENCY_LABELS } from '../_shared/residentLabels';

const RELATIONSHIP_SUGGESTIONS = [
  'Con trai', 'Con gái', 'Vợ/Chồng', 'Anh/Chị/Em', 'Cháu', 'Người giám hộ', 'Khác',
];

const emptyContact = () => ({
  fullName: '',
  relationship: '',
  phone: '',
  email: '',
  address: '',
  isPrimary: false,
});

function formatRoom(room) {
  if (!room) return '—';
  const floor = room.floorId;
  const floorPart = floor?.name || (floor?.floorNumber != null ? `Tầng ${floor.floorNumber}` : '');
  return [floorPart, room.roomNumber ? `Phòng ${room.roomNumber}` : ''].filter(Boolean).join(' · ') || '—';
}

function ContactFormModal({ mode, initial, saving, error, onSave, onClose }) {
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
          {mode === 'edit' ? 'Cập nhật liên hệ khẩn cấp' : 'Thêm liên hệ khẩn cấp'}
        </h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-grid--full">
              <label>Họ tên *</label>
              <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Quan hệ *</label>
              <input
                list="relationship-options"
                value={form.relationship}
                onChange={(e) => set('relationship', e.target.value)}
                required
              />
              <datalist id="relationship-options">
                {RELATIONSHIP_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Số điện thoại *</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </div>
            <div className="form-group form-grid--full">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="form-group form-grid--full">
              <label>Địa chỉ</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="form-group form-grid--full">
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => set('isPrimary', e.target.checked)}
                />
                Liên hệ chính (ưu tiên khi khẩn cấp)
              </label>
            </div>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FamilyManagementPage() {
  const [residents, setResidents]       = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
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
        limit: 15,
        search: search || undefined,
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
  }, [page, search, statusFilter]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

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

  return (
    <div className="family-page">
      <div className="family-page__header">
        <h1 className="family-page__title">Quản lý thông tin thân nhân</h1>
        <p className="family-page__subtitle">
          Quản lý liên hệ khẩn cấp và thông tin gia đình của cư dân đang điều trị.
        </p>
      </div>

      <form className="family-toolbar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc mã cư dân..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="admitted">Đang điều trị</option>
          <option value="pending">Chờ nhập viện</option>
          <option value="discharged">Đã xuất viện</option>
          <option value="">Tất cả trạng thái</option>
        </select>
        <button type="submit" className="btn btn--primary">Tìm kiếm</button>
      </form>

      {listError && <p className="form-error">{listError}</p>}

      <div className="family-layout">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Họ tên</th>
                <th>Số LH</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listLoading && (
                <tr><td colSpan={4} className="empty-state">Đang tải...</td></tr>
              )}
              {!listLoading && residents.length === 0 && (
                <tr><td colSpan={4} className="empty-state">Không có cư dân nào</td></tr>
              )}
              {!listLoading && residents.map((r) => (
                <tr
                  key={r._id}
                  className={selectedId === r._id ? 'is-selected' : ''}
                  onClick={() => handleSelect(r)}
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
          {!listLoading && totalPages > 1 && (
            <div className="pagination">
              <span>{total} cư dân · Trang {page}/{totalPages}</span>
              <div className="pagination__btns">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="family-panel">
          {!selectedId ? (
            <div className="empty-state">Chọn cư dân để xem và quản lý liên hệ thân nhân</div>
          ) : detailLoading ? (
            <div className="empty-state">Đang tải thông tin...</div>
          ) : detailError ? (
            <div className="empty-state">{detailError}</div>
          ) : (
            <>
              <h2 className="family-panel__title">Liên hệ khẩn cấp</h2>
              <p className="family-panel__subtitle">
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
                  Phòng: {formatRoom(resident?.roomId || selectedSummary?.roomId)}
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
                  className="btn btn--primary btn--sm"
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
                  <strong>Phòng:</strong> {formatRoom(residentDetailPopup.resident.roomId)}
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
    </div>
  );
}
