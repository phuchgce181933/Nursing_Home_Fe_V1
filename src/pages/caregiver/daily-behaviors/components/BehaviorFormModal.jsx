import { useCallback, useEffect, useState } from 'react';
import dailyBehaviorService from '../../../../services/dailyBehavior.service';
import { observationCategoryLabel } from '../../../../utils/behaviorLabels';
import {
  ABNORMAL_SEVERITY_OPTIONS,
  BEHAVIOR_TYPE_OPTIONS,
  MOOD_LEVEL_OPTIONS,
  OBSERVATION_CATEGORY_OPTIONS,
  SEVERITY_OPTIONS,
} from '../constants';

const toDatetimeLocalValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function BehaviorFormModal({ open, mode, recordId, residents, defaultWorkDate, maxDate, onClose, onSuccess }) {
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [workDate, setWorkDate] = useState(defaultWorkDate || '');
  const [residentId, setResidentId] = useState('');
  const [observationCategory, setObservationCategory] = useState('mood');
  const [moodLevel, setMoodLevel] = useState('neutral');
  const [behaviorType, setBehaviorType] = useState('');
  const [severity, setSeverity] = useState('normal');
  const [observedAtLocal, setObservedAtLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [readOnlyMeta, setReadOnlyMeta] = useState(null);

  const handleCategoryChange = (cat) => {
    setObservationCategory(cat);
    if (cat === 'abnormal' && severity === 'normal') {
      setSeverity('mild');
    }
    if (cat === 'mood' && !moodLevel) {
      setMoodLevel('neutral');
    }
  };

  const loadRecord = useCallback(async () => {
    if (!open || !isEdit || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await dailyBehaviorService.getRecord(recordId);
      const rid = String(data.residentId?._id || data.residentId || '');
      const wd = (data.workDate || '').slice(0, 10);
      setWorkDate(wd);
      setResidentId(rid);
      setObservationCategory(data.observationCategory);
      setMoodLevel(data.moodLevel || 'neutral');
      setBehaviorType(data.behaviorType || '');
      setSeverity(data.severity || 'normal');
      setObservedAtLocal(toDatetimeLocalValue(data.observedAt));
      setNotes(data.notes || '');
      setReadOnlyMeta({
        residentName: data.residentId?.fullName || data.residentId?.residentCode,
        workDate: wd,
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
    if (isEdit) {
      loadRecord();
    } else {
      setWorkDate(defaultWorkDate || maxDate);
      setResidentId(residents[0] ? String(residents[0]._id) : '');
      setObservationCategory('mood');
      setMoodLevel('neutral');
      setBehaviorType('');
      setSeverity('normal');
      setObservedAtLocal('');
      setNotes('');
      setReadOnlyMeta(null);
      setLoading(false);
    }
  }, [open, isEdit, defaultWorkDate, maxDate, residents, loadRecord]);

  const buildPayload = () => {
    const payload = {
      observationCategory,
      notes: notes.trim(),
    };
    if (observationCategory === 'mood') {
      payload.moodLevel = moodLevel;
    } else {
      payload.moodLevel = moodLevel || undefined;
    }
    if (behaviorType) payload.behaviorType = behaviorType;
    if (observationCategory === 'abnormal') {
      payload.severity = severity === 'normal' ? 'mild' : severity;
    } else if (severity && severity !== 'normal') {
      payload.severity = severity;
    } else if (isEdit) {
      payload.severity = severity;
    }
    if (observedAtLocal) {
      payload.observedAt = new Date(observedAtLocal).toISOString();
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !residentId) return setError('Vui lòng chọn cư dân');
    if (observationCategory === 'mood' && !moodLevel) {
      return setError('Vui lòng chọn mức tâm trạng');
    }
    if (notes.trim().length < 5) {
      return setError('Mô tả phải có ít nhất 5 ký tự');
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await dailyBehaviorService.updateRecord(recordId, buildPayload());
      } else {
        await dailyBehaviorService.createRecord({
          residentId,
          workDate,
          ...buildPayload(),
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

  const title = isEdit ? 'Sửa ghi nhận hành vi' : 'Ghi nhận hành vi / tâm trạng';
  const severityOptions =
    observationCategory === 'abnormal' ? ABNORMAL_SEVERITY_OPTIONS : SEVERITY_OPTIONS;

  return (
    <div className="behavior-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="behavior-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="behavior-page__modal-header">
          <h3 className="behavior-page__modal-title">{title}</h3>
          <button type="button" className="behavior-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="behavior-page__modal-body">
          {loading && <p>Đang tải...</p>}
          {!loading && (
            <form onSubmit={handleSubmit}>
              {isEdit && readOnlyMeta && (
                <div className="behavior-page__readonly-meta">
                  <p>
                    <strong>Cư dân:</strong> {readOnlyMeta.residentName || '—'} · <strong>Ngày:</strong>{' '}
                    {readOnlyMeta.workDate}
                  </p>
                </div>
              )}

              <div className="behavior-page__form-grid">
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
                  </>
                )}
                <label>
                  Loại quan sát *
                  <select
                    required
                    value={observationCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {OBSERVATION_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Thời điểm quan sát
                  <input
                    type="datetime-local"
                    value={observedAtLocal}
                    onChange={(e) => setObservedAtLocal(e.target.value)}
                  />
                </label>
                {observationCategory === 'mood' && (
                  <label>
                    Tâm trạng *
                    <select required value={moodLevel} onChange={(e) => setMoodLevel(e.target.value)}>
                      {MOOD_LEVEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(observationCategory === 'behavior' || observationCategory === 'abnormal') && (
                  <label>
                    Kiểu hành vi
                    <select value={behaviorType} onChange={(e) => setBehaviorType(e.target.value)}>
                      <option value="">— Không chọn —</option>
                      {BEHAVIOR_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Mức độ {observationCategory === 'abnormal' ? '*' : ''}
                  <select
                    required={observationCategory === 'abnormal'}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {severityOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!isEdit && observationCategory && (
                  <p className="behavior-page__field-hint behavior-page__field-full">
                    Đang ghi: {observationCategoryLabel(observationCategory)}. Có thể ghi nhiều lần trong ngày.
                  </p>
                )}
                <label className="behavior-page__field-full">
                  Mô tả chi tiết * (tối thiểu 5 ký tự)
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mô tả hành vi, tâm trạng hoặc biểu hiện bất thường..."
                  />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="behavior-page__actions">
                <button type="submit" className="btn-primary" disabled={saving}>
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

export default BehaviorFormModal;
