import React, { useEffect, useState } from 'react';
import { LifeBuoy, Plus, X, Send, CheckCircle2, XCircle, Clock, User, Phone, MapPin, FileText } from 'lucide-react';
import supportRequestService from '../../services/supportRequest.service';
import authService from '../../services/auth.service';

const INPUT_CLASS =
  'w-full rounded-lg border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-navy-deep focus:outline-none focus:ring-2 focus:ring-navy-deep/10';

const STATUS_META = {
  open: { label: 'Mới', className: 'bg-status-info/10 text-status-info' },
  in_progress: { label: 'Đang xử lý', className: 'bg-status-warning/10 text-status-warning' },
  resolved: { label: 'Đã giải quyết', className: 'bg-status-success/10 text-status-success' },
  closed: { label: 'Đã đóng', className: 'bg-slate-200 text-slate-500' },
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'open', label: 'Mới' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: 'closed', label: 'Đã đóng' },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN');
}

const emptyForm = { fullName: '', age: '', phone: '', address: '', notes: '' };

export default function SupportRequestsPage() {
  const [role, setRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [closing, setClosing] = useState(false);

  const isStaff = role === 'admin' || role === 'manager';

  useEffect(() => {
    (async () => {
      try {
        const p = await authService.fetchProfile();
        const profile = p.data || p;
        setRole(profile.role || null);
        setCurrentUserId(profile._id || profile.id || null);
      } catch (err) {
        console.warn('Unable to load profile for support requests page', err?.message || err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!role) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setListError(null);
      const params = {};
      if (isStaff && statusFilter) params.status = statusFilter;
      const res = await supportRequestService.listSupportRequests(params);
      setRequests(res.items || []);
    } catch (err) {
      setListError(err?.response?.data?.message || err.message || 'Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (req) => {
    setSelected(req);
    setSendError(null);
    setMessageText('');
    try {
      setDetailLoading(true);
      setDetailError(null);
      const full = await supportRequestService.getSupportRequest(req._id);
      setSelected(full);
    } catch (err) {
      setDetailError(err?.response?.data?.message || err.message || 'Không thể tải chi tiết yêu cầu');
    } finally {
      setDetailLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
    else if (form.fullName.trim().length > 100) errors.fullName = 'Họ tên tối đa 100 ký tự';
    const ageNum = Number(form.age);
    if (form.age === '' || Number.isNaN(ageNum)) errors.age = 'Vui lòng nhập tuổi';
    else if (ageNum < 0 || ageNum > 150) errors.age = 'Tuổi không hợp lệ';
    if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
    if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ';
    else if (form.address.trim().length > 300) errors.address = 'Địa chỉ tối đa 300 ký tự';
    if (form.notes && form.notes.length > 1000) errors.notes = 'Ghi chú tối đa 1000 ký tự';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      setCreating(true);
      setCreateError(null);
      await supportRequestService.createSupportRequest({
        fullName: form.fullName.trim(),
        age: Number(form.age),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim() || undefined,
      });
      setCreateOpen(false);
      setForm(emptyForm);
      setFormErrors({});
      await loadRequests();
    } catch (err) {
      setCreateError(err?.response?.data?.message || err.message || 'Không thể gửi yêu cầu');
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selected || !messageText.trim()) return;
    try {
      setSending(true);
      setSendError(null);
      const updated = await supportRequestService.addMessage(selected._id, messageText.trim());
      setSelected(updated);
      setMessageText('');
      await loadRequests();
    } catch (err) {
      setSendError(err?.response?.data?.message || err.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (action) => {
    if (!selected) return;
    try {
      setClosing(true);
      setSendError(null);
      const updated = await supportRequestService.closeSupportRequest(selected._id, action);
      setSelected(updated);
      await loadRequests();
    } catch (err) {
      setSendError(err?.response?.data?.message || err.message || 'Không thể cập nhật trạng thái');
    } finally {
      setClosing(false);
    }
  };

  const isClosedState = selected && ['closed', 'resolved'].includes(selected.status);

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm">
      {/* List panel */}
      <div className="flex w-[360px] flex-shrink-0 flex-col border-r border-slate-100">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Yêu cầu hỗ trợ</h2>
            {!isStaff && (
              <button
                type="button"
                onClick={() => { setCreateOpen((s) => !s); setCreateError(null); }}
                title="Gửi yêu cầu mới"
                className={`press-effect flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  createOpen ? 'bg-navy-deep text-white' : 'bg-navy-deep/10 text-navy-deep hover:bg-navy-deep/15'
                }`}
              >
                {createOpen ? <X size={16} /> : <Plus size={16} />}
              </button>
            )}
          </div>

          {isStaff && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === f.value ? 'bg-navy-deep text-white' : 'bg-surface-container-low text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {createOpen && !isStaff && (
          <div className="animate-slide-down space-y-2 border-b border-slate-100 bg-surface-container-low p-3.5">
            <div>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Họ và tên"
                maxLength={100}
                className={`${INPUT_CLASS} bg-white ${formErrors.fullName ? 'border-error' : ''}`}
              />
              {formErrors.fullName && <p className="mt-1 text-xs text-error">{formErrors.fullName}</p>}
            </div>
            <div>
              <input
                type="number"
                min={0}
                max={150}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="Tuổi"
                className={`${INPUT_CLASS} bg-white ${formErrors.age ? 'border-error' : ''}`}
              />
              {formErrors.age && <p className="mt-1 text-xs text-error">{formErrors.age}</p>}
            </div>
            <div>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Số điện thoại"
                className={`${INPUT_CLASS} bg-white ${formErrors.phone ? 'border-error' : ''}`}
              />
              {formErrors.phone && <p className="mt-1 text-xs text-error">{formErrors.phone}</p>}
            </div>
            <div>
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Địa chỉ"
                maxLength={300}
                className={`${INPUT_CLASS} bg-white ${formErrors.address ? 'border-error' : ''}`}
              />
              {formErrors.address && <p className="mt-1 text-xs text-error">{formErrors.address}</p>}
            </div>
            <div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ghi chú (tuỳ chọn)"
                rows={2}
                maxLength={1000}
                className={`${INPUT_CLASS} resize-none bg-white ${formErrors.notes ? 'border-error' : ''}`}
              />
              <div className="mt-0.5 text-right text-[11px] text-slate-400">{form.notes.length}/1000</div>
              {formErrors.notes && <p className="text-xs text-error">{formErrors.notes}</p>}
            </div>
            {createError && <p className="text-xs text-error">{createError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="press-effect flex-1 rounded-lg bg-navy-deep py-2 text-sm font-semibold text-white transition-colors hover:bg-[#132745] disabled:opacity-60"
              >
                {creating ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
              <button
                onClick={() => { setCreateOpen(false); setForm(emptyForm); setFormErrors({}); }}
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {listError && (
            <div className="m-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{listError}</div>
          )}
          {loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`skeleton h-16 delay-${i}`} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-300">
              <LifeBuoy size={40} strokeWidth={1.5} />
              <span className="text-sm text-slate-400">Chưa có yêu cầu hỗ trợ nào</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {requests.map((req, i) => (
                <button
                  key={req._id}
                  type="button"
                  onClick={() => openDetail(req)}
                  className={`animate-fade-in-up delay-${(i % 6) + 1} glow-hover rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    selected && String(selected._id) === String(req._id)
                      ? 'border-navy-deep/30 bg-navy-deep/5'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {isStaff ? req.fullName : req.subject}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  {isStaff && (
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {req.familyAccountId?.fullName || req.familyAccountId?.email || ''}
                    </div>
                  )}
                  <div className="mt-1 truncate text-xs text-slate-400">{req.phone}</div>
                  <div className="mt-1 text-[11px] text-slate-300">{formatDateTime(req.updatedAt || req.createdAt)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-300">
            <LifeBuoy size={48} strokeWidth={1.5} />
            <span className="text-sm text-slate-400">Chọn một yêu cầu để xem chi tiết</span>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">{selected.fullName}</div>
                  <div className="text-xs text-slate-400">{selected.subject}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><User size={12} /> {selected.age} tuổi</span>
                <span className="flex items-center gap-1"><Phone size={12} /> {selected.phone}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {selected.address}</span>
              </div>
              {selected.notes && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-slate-600">
                  <FileText size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span className="whitespace-pre-wrap">{selected.notes}</span>
                </div>
              )}
              {isStaff && !isClosedState && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleClose('close')}
                    disabled={closing}
                    className="press-effect flex items-center gap-1.5 rounded-lg bg-status-success/10 px-3 py-1.5 text-xs font-semibold text-status-success transition-colors hover:bg-status-success/20 disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> Đánh dấu đã xử lý
                  </button>
                  <button
                    onClick={() => handleClose('cancel')}
                    disabled={closing}
                    className="press-effect flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-60"
                  >
                    <XCircle size={14} /> Đóng yêu cầu
                  </button>
                </div>
              )}
              {!isStaff && !isClosedState && (
                <div className="mt-3">
                  <button
                    onClick={() => handleClose('cancel')}
                    disabled={closing}
                    className="press-effect flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-60"
                  >
                    <XCircle size={14} /> Hủy yêu cầu
                  </button>
                </div>
              )}
            </div>

            {detailError && (
              <div className="m-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{detailError}</div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {detailLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-10 w-2/3" />
                  <div className="skeleton delay-2 ml-auto h-10 w-1/2" />
                </div>
              ) : (selected.messages || []).length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Chưa có phản hồi nào cho yêu cầu này.
                </div>
              ) : (
                (selected.messages || []).map((m, i) => {
                  const isMine = String(m.senderId) === String(currentUserId) || (isStaff && m.senderRole && m.senderRole !== 'family');
                  return (
                    <div key={i} className={`animate-fade-in-up flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && <span className="mb-1 px-1 text-[11px] font-medium text-slate-400">Gia đình</span>}
                      <div
                        className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                          isMine ? 'rounded-tr-sm bg-navy-deep text-white' : 'rounded-tl-sm bg-surface-container-low text-slate-700'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {formatDateTime(m.sentAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {sendError && (
              <div className="mx-5 mb-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{sendError}</div>
            )}

            {isClosedState ? (
              <div className="border-t border-slate-100 px-5 py-3.5 text-center text-xs text-slate-400">
                Yêu cầu này đã được đóng, không thể gửi thêm phản hồi.
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập phản hồi..."
                  maxLength={2000}
                  className={`${INPUT_CLASS} flex-1`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim()}
                  className="press-effect flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-deep text-white transition-colors hover:bg-[#132745] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
