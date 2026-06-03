import { useCallback, useEffect, useMemo, useState } from 'react';
import hygieneActivityService from '../../../../services/hygieneActivity.service';
import {
  hygieneActivityLabel,
  hygieneCategoryLabel,
} from '../../../../utils/hygieneLabels';
import {
  ACTIVITY_TYPE_OPTIONS,
  COMPLETION_STATUS_OPTIONS,
} from '../constants';
import HygieneContextBanner from './HygieneContextBanner';

function HygieneFormModal({ open, mode, recordId, residents, defaultWorkDate, maxDate, onClose, onSuccess }) {
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);

  const [workDate, setWorkDate] = useState(defaultWorkDate || '');
  const [residentId, setResidentId] = useState('');
  const [activityType, setActivityType] = useState('bathing');
  const [completionStatus, setCompletionStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [readOnlyMeta, setReadOnlyMeta] = useState(null);

  const selectedActivity = useMemo(
    () => ACTIVITY_TYPE_OPTIONS.find((o) => o.value === activityType),
    [activityType]
  );

  const loadContext = useCallback(async () => {
    if (!residentId || !activityType || !workDate || isEdit) return;
    setContext(null);
    try {
      const data = await hygieneActivityService.getContext({ residentId, workDate, activityType });
      setContext(data);
    } catch {
      setContext(null);
    }
  }, [residentId, workDate, activityType, isEdit]);

  const loadRecord = useCallback(async () => {
    if (!open || !isEdit || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await hygieneActivityService.getRecord(recordId);
      const rid = String(data.residentId?._id || data.residentId || '');
      const wd = (data.workDate || '').slice(0, 10);
      setWorkDate(wd);
      setResidentId(rid);
      setActivityType(data.activityType);
      setCompletionStatus(data.completionStatus);
      setNotes(data.notes || '');
      setReadOnlyMeta({
        residentName: data.residentId?.fullName || data.residentId?.residentCode,
        workDate: wd,
        activityType: data.activityType,
        activityCategory: data.activityCategory,
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết ghi nhận');
    } finally {
      setLoading(false);
    }
  }, [open, isEdit, recordId]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setContext(null);
    if (isEdit) {
      loadRecord();
    } else {
      setWorkDate(defaultWorkDate || maxDate);
      setResidentId(residents[0] ? String(residents[0]._id) : '');
      setActivityType('bathing');
      setCompletionStatus('completed');
      setNotes('');
      setReadOnlyMeta(null);
      setLoading(false);
    }
  }, [open, isEdit, defaultWorkDate, maxDate, residents, loadRecord]);

  useEffect(() => {
    if (open && !isEdit) loadContext();
  }, [open, isEdit, loadContext]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !residentId) return setError('Vui lòng chọn cư dân');
    if (!isEdit && context?.hasExistingRecord) {
      return setError('Đã có ghi nhận cho hoạt động này. Vui lòng sửa từ danh sách.');
    }
    if (!isEdit && !context) {
      return setError('Vui lòng chờ kiểm tra hoặc chọn đủ ngày, cư dân và hoạt động.');
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await hygieneActivityService.updateRecord(recordId, {
          completionStatus,
          notes: notes.trim() || undefined,
        });
      } else {
        await hygieneActivityService.createRecord({
          residentId,
          workDate,
          activityType,
          completionStatus,
          notes: notes.trim() || undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEdit ? 'Sửa ghi nhận vệ sinh' : 'Ghi nhận hoạt động vệ sinh';
  const saveDisabled = saving || loading || (!isEdit && (context?.hasExistingRecord || !context));

  return (
    <div className="hygiene-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="hygiene-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hygiene-page__modal-header">
          <h3 className="hygiene-page__modal-title">{title}</h3>
          <button type="button" className="hygiene-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="hygiene-page__modal-body">
          {loading && <p>Đang tải...</p>}
          {!loading && (
            <form onSubmit={handleSubmit}>
              {isEdit && readOnlyMeta && (
                <div className="hygiene-page__readonly-meta">
                  <p>
                    <strong>Cư dân:</strong> {readOnlyMeta.residentName || '—'} · <strong>Ngày:</strong>{' '}
                    {readOnlyMeta.workDate}
                  </p>
                  <p>
                    <strong>Hoạt động:</strong> {hygieneActivityLabel(readOnlyMeta.activityType)} (
                    {hygieneCategoryLabel(readOnlyMeta.activityCategory)})
                  </p>
                </div>
              )}

              {!isEdit && <HygieneContextBanner context={context} />}

              <div className="hygiene-page__form-grid">
                {!isEdit && (
                  <>
                    <label>
                      Ngày *
                      <input
                        type="date"
                        max={maxDate}
                        required
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Cư dân *
                      <select required value={residentId} onChange={(e) => setResidentId(e.target.value)}>
                        <option value="">— Chọn —</option>
                        {residents.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.fullName || r.residentCode}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Hoạt động *
                      <select required value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                        <optgroup label="Vệ sinh cá nhân">
                          {ACTIVITY_TYPE_OPTIONS.filter((o) => o.category === 'personal').map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Dọn dẹp / môi trường">
                          {ACTIVITY_TYPE_OPTIONS.filter((o) => o.category === 'environment').map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </label>
                    {selectedActivity && (
                      <p className="hygiene-page__field-hint hygiene-page__field-full">
                        Nhóm: {hygieneCategoryLabel(selectedActivity.category)}
                      </p>
                    )}
                  </>
                )}
                <label>
                  Kết quả *
                  <select
                    required
                    value={completionStatus}
                    onChange={(e) => setCompletionStatus(e.target.value)}
                  >
                    {COMPLETION_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hygiene-page__field-full">
                  Ghi chú thêm
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="hygiene-page__actions">
                <button type="submit" className="btn-primary" disabled={saveDisabled}>
                  {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Lưu ghi nhận'}
                </button>
                <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default HygieneFormModal;
