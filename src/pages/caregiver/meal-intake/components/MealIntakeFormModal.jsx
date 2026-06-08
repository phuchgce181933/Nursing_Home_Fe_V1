import { useCallback, useEffect, useState } from 'react';
import mealIntakeNoteService from '../../../../services/mealIntakeNote.service';
import { mealTypeLabel } from '../../../../utils/nutritionLabels';
import { INTAKE_STATUS_OPTIONS, MEAL_TYPE_OPTIONS } from '../constants';
import MealIntakePlannedMealBanner from './MealIntakePlannedMealBanner';

function MealIntakeFormModal({ open, mode, recordId, residents, defaultWorkDate, maxDate, onClose, onSuccess }) {
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);

  const [workDate, setWorkDate] = useState(defaultWorkDate || '');
  const [residentId, setResidentId] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [intakeStatus, setIntakeStatus] = useState('full');
  const [portionPercent, setPortionPercent] = useState('50');
  const [notes, setNotes] = useState('');
  const [plannedMealName, setPlannedMealName] = useState('');
  const [readOnlyMeta, setReadOnlyMeta] = useState(null);

  const loadContext = useCallback(async () => {
    if (!residentId || !mealType || !workDate || isEdit) return;
    setContext(null);
    try {
      const data = await mealIntakeNoteService.getContext({ residentId, workDate, mealType });
      setContext(data);
      if (data?.plannedMeal?.mealName) setPlannedMealName(data.plannedMeal.mealName);
      else setPlannedMealName('');
    } catch {
      setContext(null);
      setPlannedMealName('');
    }
  }, [residentId, workDate, mealType, isEdit]);

  const loadRecord = useCallback(async () => {
    if (!open || !isEdit || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await mealIntakeNoteService.getNote(recordId);
      const rid = String(data.residentId?._id || data.residentId || '');
      const wd = (data.workDate || '').slice(0, 10);
      setWorkDate(wd);
      setResidentId(rid);
      setMealType(data.mealType);
      setIntakeStatus(data.intakeStatus);
      setPortionPercent(data.portionPercent != null ? String(data.portionPercent) : '50');
      setNotes(data.notes || '');
      setPlannedMealName(data.plannedMealName || '');
      setReadOnlyMeta({
        residentName: data.residentId?.fullName || data.residentId?.residentCode,
        workDate: wd,
        mealType: data.mealType,
        plannedMealName: data.plannedMealName,
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
      setMealType('breakfast');
      setIntakeStatus('full');
      setPortionPercent('50');
      setNotes('');
      setPlannedMealName('');
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
      return setError('Đã có ghi nhận cho bữa này. Vui lòng sửa từ danh sách.');
    }
    if (!isEdit && context && !context.plannedMeal) {
      return setError('Chưa có thực đơn publish cho bữa này. Không thể ghi nhận.');
    }
    if (!isEdit && !context?.plannedMeal) {
      return setError('Vui lòng chờ tải thực đơn hoặc chọn đủ ngày, cư dân và bữa.');
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await mealIntakeNoteService.updateNote(recordId, {
          intakeStatus,
          portionPercent: intakeStatus === 'partial' ? Number(portionPercent) : undefined,
          notes: notes.trim() || undefined,
          plannedMealName: plannedMealName || undefined,
        });
      } else {
        await mealIntakeNoteService.createNote({
          residentId,
          workDate,
          mealType,
          intakeStatus,
          notes: notes.trim() || undefined,
          portionPercent: intakeStatus === 'partial' ? Number(portionPercent) : undefined,
          plannedMealName: plannedMealName || context?.plannedMeal?.mealName,
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

  const title = isEdit ? 'Sửa ghi nhận bữa ăn' : 'Ghi nhận bữa ăn mới';
  const createBlockedNoMenu =
    !isEdit && context && !context.hasExistingRecord && !context.plannedMeal;
  const createBlockedPending = !isEdit && (!residentId || !workDate || !mealType || !context);
  const saveDisabled =
    saving ||
    loading ||
    (!isEdit && context?.hasExistingRecord) ||
    createBlockedNoMenu ||
    createBlockedPending;

  return (
    <div className="meal-intake-page__modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="meal-intake-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="meal-intake-page__modal-header">
          <h3 className="meal-intake-page__modal-title">{title}</h3>
          <button type="button" className="meal-intake-page__modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <div className="meal-intake-page__modal-body">
          {loading && <p>Đang tải...</p>}
          {!loading && (
            <form onSubmit={handleSubmit}>
              {isEdit && readOnlyMeta && (
                <div className="meal-intake-page__readonly-meta">
                  <p>
                    <strong>Cư dân:</strong> {readOnlyMeta.residentName || '—'} · <strong>Ngày:</strong>{' '}
                    {readOnlyMeta.workDate} · <strong>Bữa:</strong> {mealTypeLabel(readOnlyMeta.mealType)}
                  </p>
                  {readOnlyMeta.plannedMealName && (
                    <p>
                      <strong>Món đã lưu:</strong> {readOnlyMeta.plannedMealName}
                    </p>
                  )}
                </div>
              )}

              {!isEdit && <MealIntakePlannedMealBanner context={context} />}

              <div className="meal-intake-page__form-grid">
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
                      Bữa *
                      <select required value={mealType} onChange={(e) => setMealType(e.target.value)}>
                        {MEAL_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <label>
                  Tình trạng *
                  <select required value={intakeStatus} onChange={(e) => setIntakeStatus(e.target.value)}>
                    {INTAKE_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                {intakeStatus === 'partial' && (
                  <label>
                    % ăn *
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={portionPercent}
                      onChange={(e) => setPortionPercent(e.target.value)}
                    />
                  </label>
                )}
                <label className="meal-intake-page__field-full">
                  Ghi chú thêm
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="meal-intake-page__actions">
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

export default MealIntakeFormModal;
