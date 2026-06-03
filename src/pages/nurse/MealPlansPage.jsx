import { useEffect, useMemo, useState } from 'react';
import mealPlanService from '../../services/mealPlan.service';
import mealTimeScheduleService from '../../services/mealTimeSchedule.service';
import specialDietService from '../../services/specialDiet.service';
import { getLocalDateString } from '../../utils/dateUtils';
import '../../styles/nurse/MealPlansPage.css';

const today = () => getLocalDateString();
const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};
const formatVNDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN');
};
const defaultMealTimeByType = (mealType) => {
  if (mealType === 'breakfast') return '07:30';
  if (mealType === 'lunch') return '11:30';
  return '17:30';
};

const mealTypeLabel = (v) => {
  if (v === 'breakfast') return 'Sáng';
  if (v === 'lunch') return 'Trưa';
  if (v === 'dinner') return 'Tối';
  return v;
};

const statusLabel = (v) => {
  if (v === 'draft') return 'Nháp';
  if (v === 'published') return 'Đã đăng';
  return v;
};

const dietTypeLabel = (v) => {
  if (v === 'diabetic') return 'Tiểu đường';
  if (v === 'low_sodium') return 'Ít muối';
  if (v === 'renal') return 'Hỗ trợ thận';
  if (v === 'high_protein') return 'Giàu đạm';
  if (v === 'soft_texture') return 'Mềm dễ nuốt';
  if (v === 'liquid_only') return 'Lỏng hoàn toàn';
  if (v === 'custom') return 'Tùy chỉnh';
  return v;
};

function MealPlanTab() {
  const [formWorkDate, setFormWorkDate] = useState(today());
  const [listDate, setListDate] = useState(today());
  const [careStages, setCareStages] = useState([]);
  const [careStage, setCareStage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [residents, setResidents] = useState([]);
  const [selectedResidents, setSelectedResidents] = useState([]);
  const [title, setTitle] = useState('');
  const [entries, setEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);
  const [publishedTimes, setPublishedTimes] = useState({ byResident: {}, source: 'system_default' });
  const [error, setError] = useState('');

  const resolveMealTime = (residentId, mealType) => {
    const rid = String(residentId || '');
    const fromSchedule = publishedTimes.byResident?.[rid]?.[mealType];
    if (fromSchedule) return fromSchedule;
    return defaultMealTimeByType(mealType);
  };

  const residentMap = useMemo(
    () => Object.fromEntries(residents.map((r) => [String(r._id), r.fullName || r.residentCode])),
    [residents]
  );

  const loadBoot = async () => {
    setLoading(true);
    setError('');
    try {
      const [tplRes, residentRes] = await Promise.all([
        mealPlanService.getTemplates(),
        mealPlanService.listResidents({ status: 'admitted' }),
      ]);
      setCareStages(Array.isArray(tplRes.careStages) ? tplRes.careStages : []);
      setCareStage(Array.isArray(tplRes.careStages) && tplRes.careStages[0] ? tplRes.careStages[0] : '');
      setTemplates(Array.isArray(tplRes.templates) ? tplRes.templates : []);
      setResidents(Array.isArray(residentRes?.data) ? residentRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dữ liệu khởi tạo');
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedMealTimes = () => {
    mealTimeScheduleService
      .getPublishedTimes({
        workDate: formWorkDate,
        residentIds: selectedResidents.join(','),
      })
      .then((data) => {
        setPublishedTimes({
          byResident: data?.byResident || {},
          source: data?.source || 'system_default',
        });
      })
      .catch(() => {
        setPublishedTimes({ byResident: {}, source: 'system_default' });
      });
  };

  const loadPlans = async (date) => {
    try {
      const [draftRes, publishedRes] = await Promise.all([
        mealPlanService.listPlans({ workDate: date, status: 'draft', limit: 50 }),
        mealPlanService.listPlans({ workDate: date, status: 'published', limit: 50 }),
      ]);
      const all = [
        ...(Array.isArray(draftRes?.data) ? draftRes.data : []),
        ...(Array.isArray(publishedRes?.data) ? publishedRes.data : []),
      ];
      all.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
      setPlans(all);
    } catch {
      setPlans([]);
    }
  };

  useEffect(() => {
    loadBoot();
  }, []);

  useEffect(() => {
    loadPlans(listDate);
  }, [listDate]);

  useEffect(() => {
    loadPublishedMealTimes();
  }, [formWorkDate, selectedResidents]);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError('Vui lòng chọn template');
    if (selectedResidents.length < 2) return setError('Vui lòng chọn ít nhất 2 cư dân');
    const generated = [];
    selectedResidents.forEach((residentId) => {
      tpl.entries.forEach((it) => {
        generated.push({
          residentId,
          mealType: it.mealType,
          mealName: it.mealName,
          calories: it.calories,
          ingredients: [],
          nutritionNote: '',
          stageNote: '',
          source: 'template',
          templateKey: tpl.key,
          mealTime: it.mealTime || resolveMealTime(residentId, it.mealType),
        });
      });
    });
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManual = () => {
    const rid = selectedResidents[0] || '';
    setEntries((prev) => [
      ...prev,
      {
        residentId: rid,
        mealType: 'breakfast',
        mealName: '',
        calories: '',
        ingredients: [],
        nutritionNote: '',
        stageNote: '',
        source: 'manual',
        mealTime: resolveMealTime(rid, 'breakfast'),
      },
    ]);
  };

  const patchEntry = (idx, patch) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const next = { ...e, ...patch };
        if (patch.mealType && !patch.mealTime) {
          next.mealTime = resolveMealTime(next.residentId, next.mealType);
        }
        if (patch.residentId && !patch.mealTime) {
          next.mealTime = resolveMealTime(next.residentId, next.mealType);
        }
        return next;
      })
    );
  };

  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle('');
    setSelectedTemplate('');
    setSelectedResidents([]);
    setEntries([]);
    setEditingId('');
    setError('');
  };

  const validate = () => {
    if (!careStage) return 'Vui lòng chọn giai đoạn chăm sóc';
    if (formWorkDate < today()) return 'Không thể tạo meal plan cho ngày quá khứ';
    if (selectedResidents.length < 2) return 'Vui lòng chọn tối thiểu 2 cư dân';
    if (!entries.length) return 'Vui lòng thêm ít nhất 1 dòng thực đơn';
    const hasInvalid = entries.some((e) => !e.residentId || !e.mealType || !e.mealName?.trim() || !e.mealTime);
    if (hasInvalid) return 'Mỗi dòng phải có cư dân, loại bữa, tên món và giờ';
    return '';
  };

  const buildPayload = () => ({
    workDate: formWorkDate,
    careStage,
    title,
    entries: entries.map((e) => ({
      residentId: e.residentId,
      mealType: e.mealType,
      mealName: e.mealName,
      calories: e.calories === '' ? undefined : Number(e.calories),
      ingredients: Array.isArray(e.ingredients)
        ? e.ingredients
        : String(e.ingredients || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
      nutritionNote: e.nutritionNote || undefined,
      stageNote: e.stageNote || undefined,
      source: e.source || 'manual',
      templateKey: e.templateKey || undefined,
      mealTime: e.mealTime || resolveMealTime(e.residentId, e.mealType),
    })),
  });

  const saveDraft = async () => {
    const msg = validate();
    if (msg) return setError(msg);
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await mealPlanService.updateDraft(editingId, payload);
      } else {
        await mealPlanService.createDraft(payload);
      }
      resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Lưu draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      const data = await mealPlanService.getPlan(id);
      setEditingId(data._id);
      setTitle(data.title || '');
      setFormWorkDate((data.workDate || '').slice(0, 10) || today());
      setCareStage(data.careStage || '');
      const rows = Array.isArray(data.entries) ? data.entries : [];
      setEntries(
        rows.map((r) => ({
          residentId: String(r.residentId?._id || r.residentId || ''),
          mealType: r.mealType,
          mealName: r.mealName,
          calories: r.calories ?? '',
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          nutritionNote: r.nutritionNote || '',
          stageNote: r.stageNote || '',
          source: r.source || 'manual',
          templateKey: r.templateKey || '',
          mealTime: r.mealTime || defaultMealTimeByType(r.mealType),
        }))
      );
      const picked = [...new Set(rows.map((r) => String(r.residentId?._id || r.residentId || '')).filter(Boolean))];
      setSelectedResidents(picked);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không mở được draft');
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      await mealPlanService.publishPlan(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Publish thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản nháp meal plan này?')) return;
    setSaving(true);
    setError('');
    try {
      await mealPlanService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Xóa draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openPlanDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await mealPlanService.getPlan(id);
      setDetailPlan(data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết lịch');
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="page card meal-page">
      <h1 className="meal-page__title">Create Meal Plans</h1>
      <p className="meal-page__intro">
        Điều dưỡng tạo thực đơn theo ngày cho nhiều cư dân theo từng giai đoạn chăm sóc (Draft → Publish).
      </p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>Đang tải...</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>Ngày áp dụng *</label>
              <input type="date" min={today()} value={formWorkDate} onChange={(e) => setFormWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Giai đoạn chăm sóc *</label>
              <select value={careStage} onChange={(e) => setCareStage(e.target.value)}>
                <option value="">— Chọn —</option>
                {careStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tiêu đề</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Tuần phục hồi đầu tháng 6" />
            </div>
          </div>

          <div className="meal-page__resident-section">
            <label className="meal-page__resident-label">Cư dân áp dụng (nhiều người) *</label>
            <div className="meal-page__resident-grid">
              {residents.map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                return (
                  <label key={id} className="meal-page__resident-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                  </label>
                );
              })}
            </div>
          </div>

          <p className="meal-page__hint">
            {publishedTimes.source === 'published_schedule'
              ? 'Đang dùng giờ từ lịch đã publish cho ngày này.'
              : 'Chưa có lịch publish — dùng giờ mặc định hệ thống (07:30 / 11:30 / 17:30).'}
          </p>

          <div className="tab-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">— Chọn template 3 bữa —</option>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>+ Thêm từ template</button>
            <button type="button" className="btn-secondary" onClick={addManual}>+ Thêm thủ công</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Cư dân</th><th>Bữa</th><th>Tên món</th><th>Kcal</th><th>Giờ</th><th>Thành phần</th><th>Nguồn</th><th>Ghi chú</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={9} className="empty-state">Chưa có dòng thực đơn</td></tr>}
              {entries.map((row, idx) => (
                <tr key={`${idx}-${row.residentId}-${row.mealType}`}>
                  <td>
                    <select value={row.residentId} onChange={(e) => patchEntry(idx, { residentId: e.target.value })}>
                      <option value="">—</option>
                      {residents.map((r) => <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={row.mealType} onChange={(e) => patchEntry(idx, { mealType: e.target.value })}>
                      <option value="breakfast">Sáng</option>
                      <option value="lunch">Trưa</option>
                      <option value="dinner">Tối</option>
                    </select>
                  </td>
                  <td><input value={row.mealName} onChange={(e) => patchEntry(idx, { mealName: e.target.value })} /></td>
                  <td><input type="number" min="0" value={row.calories} onChange={(e) => patchEntry(idx, { calories: e.target.value })} /></td>
                  <td><input type="time" value={row.mealTime || defaultMealTimeByType(row.mealType)} onChange={(e) => patchEntry(idx, { mealTime: e.target.value })} /></td>
                  <td><input value={Array.isArray(row.ingredients) ? row.ingredients.join(', ') : row.ingredients || ''} onChange={(e) => patchEntry(idx, { ingredients: e.target.value })} /></td>
                  <td>{row.source === 'template' ? 'Template' : 'Thủ công'}</td>
                  <td><input value={row.nutritionNote || ''} onChange={(e) => patchEntry(idx, { nutritionNote: e.target.value })} /></td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật Draft' : 'Lưu Draft'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Làm mới</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">Lịch meal plans ngày {formatVNDate(listDate)}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>← Hôm qua</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>Hôm nay</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>Ngày mai →</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Tiêu đề</th><th>Giai đoạn</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={5} className="empty-state">Không có lịch</td></tr>}
              {plans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{d.careStage || '—'}</td>
                  <td>{formatVNDate((d.workDate || '').slice(0, 10))}</td>
                  <td>{statusLabel(d.status)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>Mở</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>Publish</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>Xóa</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openPlanDetail(d._id)}>
                        Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!!editingId && (
            <p className="meal-page__editing-meta">
              Đang chỉnh draft: <code>{editingId}</code>
              {entries.length > 0 && (
                <> · Cư dân: {[...new Set(entries.map((e) => residentMap[e.residentId]).filter(Boolean))].join(', ')}</>
              )}
              {entries.length > 0 && (
                <> · Bữa: {[...new Set(entries.map((e) => mealTypeLabel(e.mealType)))].join(', ')}</>
              )}
            </p>
          )}
        </>
      )}

      {(detailLoading || detailPlan) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">Chi tiết lịch đã publish</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">Đang tải chi tiết...</p>}
            {!detailLoading && detailPlan && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>Tiêu đề:</strong> {detailPlan.title || '—'} · <strong>Ngày:</strong> {formatVNDate((detailPlan.workDate || '').slice(0, 10))} · <strong>Giai đoạn:</strong> {detailPlan.careStage || '—'}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>Cư dân</th><th>Bữa</th><th>Món</th><th>Kcal</th><th>Giờ</th><th>Thành phần</th><th>Nguồn</th><th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailPlan.entries) && detailPlan.entries.length > 0 ? detailPlan.entries.map((row, idx) => {
                      const rid = String(row.residentId?._id || row.residentId || '');
                      const name = row.residentId?.fullName || residentMap[rid] || row.residentId?.residentCode || '—';
                      return (
                        <tr key={`${rid}-${row.mealType}-${idx}`}>
                          <td>{name}</td>
                          <td>{mealTypeLabel(row.mealType)}</td>
                          <td>{row.mealName || '—'}</td>
                          <td>{row.calories ?? '—'}</td>
                          <td>{row.mealTime || '—'}</td>
                          <td>{Array.isArray(row.ingredients) ? row.ingredients.join(', ') || '—' : row.ingredients || '—'}</td>
                          <td>{row.source === 'template' ? 'Template' : 'Thủ công'}</td>
                          <td>{row.nutritionNote || row.stageNote || '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={8} className="empty-state">Lịch chưa có chi tiết món ăn</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecialDietTab() {
  const [workDate, setWorkDate] = useState(today());
  const [listDate, setListDate] = useState(today());
  const [title, setTitle] = useState('');
  const [templates, setTemplates] = useState([]);
  const [dietTypes, setDietTypes] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [residents, setResidents] = useState([]);
  const [selectedResidents, setSelectedResidents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);
  const [error, setError] = useState('');

  const loadBoot = async () => {
    setLoading(true);
    setError('');
    try {
      const [tplRes, residentRes] = await Promise.all([
        specialDietService.getTemplates(),
        specialDietService.listResidents({ status: 'admitted' }),
      ]);
      setTemplates(Array.isArray(tplRes.templates) ? tplRes.templates : []);
      setDietTypes(Array.isArray(tplRes.dietTypes) ? tplRes.dietTypes : []);
      setResidents(Array.isArray(residentRes?.data) ? residentRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dữ liệu special diets');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async (date) => {
    try {
      const [draftRes, publishedRes] = await Promise.all([
        specialDietService.listPlans({ workDate: date, status: 'draft', limit: 50 }),
        specialDietService.listPlans({ workDate: date, status: 'published', limit: 50 }),
      ]);
      const all = [
        ...(Array.isArray(draftRes?.data) ? draftRes.data : []),
        ...(Array.isArray(publishedRes?.data) ? publishedRes.data : []),
      ];
      all.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
      setPlans(all);
    } catch {
      setPlans([]);
    }
  };

  useEffect(() => {
    loadBoot();
  }, []);

  useEffect(() => {
    loadPlans(listDate);
  }, [listDate]);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError('Vui lòng chọn template');
    if (selectedResidents.length < 2) return setError('Vui lòng chọn ít nhất 2 cư dân');
    const generated = selectedResidents.map((residentId) => ({
      residentId,
      dietType: tpl.dietType,
      restrictions: Array.isArray(tpl.restrictions) ? tpl.restrictions : [],
      nutritionGoal: tpl.nutritionGoal || '',
      notes: '',
      source: 'template',
      templateKey: tpl.key,
      effectiveTime: tpl.effectiveTime || '07:00',
    }));
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManual = () => {
    setEntries((prev) => [
      ...prev,
      {
        residentId: selectedResidents[0] || '',
        dietType: 'custom',
        restrictions: [],
        nutritionGoal: '',
        notes: '',
        source: 'manual',
        effectiveTime: '07:00',
      },
    ]);
  };

  const patchEntry = (idx, patch) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle('');
    setSelectedTemplate('');
    setSelectedResidents([]);
    setEntries([]);
    setEditingId('');
    setError('');
  };

  const validate = () => {
    if (workDate < today()) return 'Không thể tạo special diet plan cho ngày quá khứ';
    if (selectedResidents.length < 2) return 'Vui lòng chọn tối thiểu 2 cư dân';
    if (!entries.length) return 'Vui lòng thêm ít nhất 1 dòng chế độ ăn đặc biệt';
    const hasInvalid = entries.some((e) => !e.residentId || !e.dietType || !e.effectiveTime);
    if (hasInvalid) return 'Mỗi dòng phải có cư dân, loại chế độ ăn và giờ hiệu lực';
    return '';
  };

  const buildPayload = () => ({
    workDate,
    title,
    entries: entries.map((e) => ({
      residentId: e.residentId,
      dietType: e.dietType,
      restrictions: Array.isArray(e.restrictions)
        ? e.restrictions
        : String(e.restrictions || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
      nutritionGoal: e.nutritionGoal || undefined,
      notes: e.notes || undefined,
      source: e.source || 'manual',
      templateKey: e.templateKey || undefined,
      effectiveTime: e.effectiveTime || '07:00',
    })),
  });

  const saveDraft = async () => {
    const msg = validate();
    if (msg) return setError(msg);
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await specialDietService.updateDraft(editingId, payload);
      } else {
        await specialDietService.createDraft(payload);
      }
      resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Lưu draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      const data = await specialDietService.getPlan(id);
      setEditingId(data._id);
      setTitle(data.title || '');
      setWorkDate((data.workDate || '').slice(0, 10) || today());
      const rows = Array.isArray(data.entries) ? data.entries : [];
      setEntries(
        rows.map((r) => ({
          residentId: String(r.residentId?._id || r.residentId || ''),
          dietType: r.dietType,
          restrictions: Array.isArray(r.restrictions) ? r.restrictions : [],
          nutritionGoal: r.nutritionGoal || '',
          notes: r.notes || '',
          source: r.source || 'manual',
          templateKey: r.templateKey || '',
          effectiveTime: r.effectiveTime || '07:00',
        }))
      );
      const picked = [...new Set(rows.map((r) => String(r.residentId?._id || r.residentId || '')).filter(Boolean))];
      setSelectedResidents(picked);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không mở được draft');
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      await specialDietService.publishPlan(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Publish thất bại');
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản nháp special diet này?')) return;
    setSaving(true);
    setError('');
    try {
      await specialDietService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Xóa draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openPlanDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await specialDietService.getPlan(id);
      setDetailPlan(data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết lịch');
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="meal-page">
      <p className="meal-page__intro">
        Điều dưỡng chỉ định chế độ ăn đặc biệt theo ngày cho nhiều cư dân (Draft → Publish).
      </p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>Đang tải...</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>Ngày áp dụng *</label>
              <input type="date" min={today()} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tiêu đề</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Chế độ ăn đặc biệt tuần 1" />
            </div>
          </div>

          <div className="meal-page__resident-section">
            <label className="meal-page__resident-label">Cư dân áp dụng (nhiều người) *</label>
            <div className="meal-page__resident-grid">
              {residents.map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                return (
                  <label key={id} className="meal-page__resident-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="tab-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">— Chọn template special diet —</option>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>+ Thêm từ template</button>
            <button type="button" className="btn-secondary" onClick={addManual}>+ Thêm thủ công</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Cư dân</th><th>Chế độ ăn</th><th>Hạn chế</th><th>Mục tiêu</th><th>Giờ hiệu lực</th><th>Nguồn</th><th>Ghi chú</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={8} className="empty-state">Chưa có chỉ định special diet</td></tr>}
              {entries.map((row, idx) => (
                <tr key={`${idx}-${row.residentId}-${row.dietType}`}>
                  <td>
                    <select value={row.residentId} onChange={(e) => patchEntry(idx, { residentId: e.target.value })}>
                      <option value="">—</option>
                      {residents.map((r) => <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={row.dietType} onChange={(e) => patchEntry(idx, { dietType: e.target.value })}>
                      {dietTypes.map((t) => <option key={t} value={t}>{dietTypeLabel(t)}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      value={Array.isArray(row.restrictions) ? row.restrictions.join(', ') : row.restrictions || ''}
                      onChange={(e) => patchEntry(idx, { restrictions: e.target.value })}
                    />
                  </td>
                  <td><input value={row.nutritionGoal || ''} onChange={(e) => patchEntry(idx, { nutritionGoal: e.target.value })} /></td>
                  <td><input type="time" value={row.effectiveTime || '07:00'} onChange={(e) => patchEntry(idx, { effectiveTime: e.target.value })} /></td>
                  <td>{row.source === 'template' ? 'Template' : 'Thủ công'}</td>
                  <td><input value={row.notes || ''} onChange={(e) => patchEntry(idx, { notes: e.target.value })} /></td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật Draft' : 'Lưu Draft'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Làm mới</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">Lịch special diets ngày {formatVNDate(listDate)}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>← Hôm qua</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>Hôm nay</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>Ngày mai →</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Tiêu đề</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={4} className="empty-state">Không có lịch</td></tr>}
              {plans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatVNDate((d.workDate || '').slice(0, 10))}</td>
                  <td>{statusLabel(d.status)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>Mở</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>Publish</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>Xóa</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openPlanDetail(d._id)}>
                        Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(detailLoading || detailPlan) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">Chi tiết special diet đã publish</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">Đang tải chi tiết...</p>}
            {!detailLoading && detailPlan && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>Tiêu đề:</strong> {detailPlan.title || '—'} · <strong>Ngày:</strong> {formatVNDate((detailPlan.workDate || '').slice(0, 10))}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>Cư dân</th><th>Chế độ ăn</th><th>Hạn chế</th><th>Mục tiêu</th><th>Giờ hiệu lực</th><th>Nguồn</th><th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailPlan.entries) && detailPlan.entries.length > 0 ? detailPlan.entries.map((row, idx) => {
                      const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
                      return (
                        <tr key={`${detailPlan._id || 'detail-special'}-${idx}`}>
                          <td>{name}</td>
                          <td>{dietTypeLabel(row.dietType) || '—'}</td>
                          <td>{Array.isArray(row.restrictions) ? row.restrictions.join(', ') || '—' : row.restrictions || '—'}</td>
                          <td>{row.nutritionGoal || '—'}</td>
                          <td>{row.effectiveTime || '—'}</td>
                          <td>{row.source === 'template' ? 'Template' : 'Thủ công'}</td>
                          <td>{row.notes || '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="empty-state">Lịch chưa có chi tiết special diet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MealTimeScheduleTab() {
  const [formWorkDate, setFormWorkDate] = useState(today());
  const [listDate, setListDate] = useState(today());
  const [title, setTitle] = useState('');
  const [templates, setTemplates] = useState([]);
  const [defaultMealTimes, setDefaultMealTimes] = useState({
    breakfast: '07:30',
    lunch: '11:30',
    dinner: '17:30',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [residents, setResidents] = useState([]);
  const [selectedResidents, setSelectedResidents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState(null);
  const [error, setError] = useState('');

  const residentMap = useMemo(
    () => Object.fromEntries(residents.map((r) => [String(r._id), r.fullName || r.residentCode])),
    [residents]
  );

  const loadBoot = async () => {
    setLoading(true);
    setError('');
    try {
      const [tplRes, residentRes] = await Promise.all([
        mealTimeScheduleService.getTemplates(),
        mealTimeScheduleService.listResidents({ status: 'admitted' }),
      ]);
      setTemplates(Array.isArray(tplRes.templates) ? tplRes.templates : []);
      if (tplRes.metadata?.defaultMealTimes) {
        setDefaultMealTimes(tplRes.metadata.defaultMealTimes);
      }
      setResidents(Array.isArray(residentRes?.data) ? residentRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được dữ liệu lịch giờ ăn');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async (date) => {
    try {
      const [draftRes, publishedRes] = await Promise.all([
        mealTimeScheduleService.listSchedules({ workDate: date, status: 'draft', limit: 50 }),
        mealTimeScheduleService.listSchedules({ workDate: date, status: 'published', limit: 50 }),
      ]);
      const all = [
        ...(Array.isArray(draftRes?.data) ? draftRes.data : []),
        ...(Array.isArray(publishedRes?.data) ? publishedRes.data : []),
      ];
      all.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
      setSchedules(all);
    } catch {
      setSchedules([]);
    }
  };

  useEffect(() => {
    loadBoot();
  }, []);

  useEffect(() => {
    loadSchedules(listDate);
  }, [listDate]);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError('Vui lòng chọn template');
    if (selectedResidents.length < 2) return setError('Vui lòng chọn ít nhất 2 cư dân');
    const existing = new Set(entries.map((e) => String(e.residentId)));
    const generated = selectedResidents
      .filter((id) => !existing.has(String(id)))
      .map((residentId) => ({
        residentId,
        breakfastTime: tpl.breakfastTime || defaultMealTimes.breakfast,
        lunchTime: tpl.lunchTime || defaultMealTimes.lunch,
        dinnerTime: tpl.dinnerTime || defaultMealTimes.dinner,
        notes: '',
        source: 'template',
        templateKey: tpl.key,
      }));
    if (!generated.length) return setError('Các cư dân đã chọn đều có trong bảng');
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManual = () => {
    const rid = selectedResidents[0] || '';
    if (!rid) return setError('Vui lòng chọn ít nhất 1 cư dân trước khi thêm thủ công');
    if (entries.some((e) => String(e.residentId) === String(rid))) {
      return setError('Cư dân này đã có trong bảng');
    }
    setEntries((prev) => [
      ...prev,
      {
        residentId: rid,
        breakfastTime: defaultMealTimes.breakfast || '07:30',
        lunchTime: defaultMealTimes.lunch || '11:30',
        dinnerTime: defaultMealTimes.dinner || '17:30',
        notes: '',
        source: 'manual',
      },
    ]);
  };

  const patchEntry = (idx, patch) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle('');
    setSelectedTemplate('');
    setSelectedResidents([]);
    setEntries([]);
    setEditingId('');
    setError('');
  };

  const validate = () => {
    if (formWorkDate < today()) return 'Không thể tạo lịch giờ ăn cho ngày quá khứ';
    if (selectedResidents.length < 2) return 'Vui lòng chọn tối thiểu 2 cư dân';
    if (!entries.length) return 'Vui lòng thêm ít nhất 1 dòng lịch giờ ăn';
    const hasInvalid = entries.some(
      (e) => !e.residentId || !e.breakfastTime || !e.lunchTime || !e.dinnerTime
    );
    if (hasInvalid) return 'Mỗi dòng phải có cư dân và đủ 3 giờ (sáng/trưa/tối)';
    const uniqueResidents = new Set(entries.map((e) => String(e.residentId)));
    if (uniqueResidents.size !== entries.length) return 'Mỗi cư dân chỉ được 1 dòng trong lịch';
    return '';
  };

  const buildPayload = () => ({
    workDate: formWorkDate,
    title,
    entries: entries.map((e) => ({
      residentId: e.residentId,
      breakfastTime: e.breakfastTime,
      lunchTime: e.lunchTime,
      dinnerTime: e.dinnerTime,
      notes: e.notes || undefined,
      source: e.source || 'manual',
      templateKey: e.templateKey || undefined,
    })),
  });

  const saveDraft = async () => {
    const msg = validate();
    if (msg) return setError(msg);
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await mealTimeScheduleService.updateDraft(editingId, payload);
      } else {
        await mealTimeScheduleService.createDraft(payload);
      }
      resetForm();
      loadSchedules(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Lưu draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      const data = await mealTimeScheduleService.getSchedule(id);
      setEditingId(data._id);
      setTitle(data.title || '');
      setFormWorkDate((data.workDate || '').slice(0, 10) || today());
      const rows = Array.isArray(data.entries) ? data.entries : [];
      setEntries(
        rows.map((r) => ({
          residentId: String(r.residentId?._id || r.residentId || ''),
          breakfastTime: r.breakfastTime || defaultMealTimes.breakfast,
          lunchTime: r.lunchTime || defaultMealTimes.lunch,
          dinnerTime: r.dinnerTime || defaultMealTimes.dinner,
          notes: r.notes || '',
          source: r.source || 'manual',
          templateKey: r.templateKey || '',
        }))
      );
      const picked = [...new Set(rows.map((r) => String(r.residentId?._id || r.residentId || '')).filter(Boolean))];
      setSelectedResidents(picked);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không mở được draft');
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (id) => {
    setSaving(true);
    setError('');
    try {
      await mealTimeScheduleService.publishSchedule(id);
      if (editingId === id) resetForm();
      loadSchedules(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Publish thất bại');
    } finally {
      setSaving(false);
    }
  };

  const removeDraft = async (id) => {
    if (!window.confirm('Xóa lịch giờ ăn nháp này?')) return;
    setSaving(true);
    setError('');
    try {
      await mealTimeScheduleService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadSchedules(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || 'Xóa draft thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openScheduleDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const data = await mealTimeScheduleService.getSchedule(id);
      setDetailSchedule(data || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Không tải được chi tiết lịch');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeScheduleDetail = () => setDetailSchedule(null);

  return (
    <div className="page card meal-page">
      <h1 className="meal-page__title">Schedule Meal Times</h1>
      <p className="meal-page__intro">
        Thiết lập giờ ăn Sáng/Trưa/Tối theo ngày cho nhiều cư dân (Draft → Publish). Create Meal Plans sẽ tự lấy giờ từ lịch đã publish.
      </p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>Đang tải...</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>Ngày áp dụng *</label>
              <input type="date" min={today()} value={formWorkDate} onChange={(e) => setFormWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tiêu đề</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Lịch giờ ăn đầu tháng 6" />
            </div>
          </div>

          <div className="meal-page__resident-section">
            <label className="meal-page__resident-label">Cư dân áp dụng (nhiều người) *</label>
            <div className="meal-page__resident-grid">
              {residents.map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                return (
                  <label key={id} className="meal-page__resident-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="tab-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">— Chọn mẫu giờ ăn —</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>+ Thêm từ mẫu</button>
            <button type="button" className="btn-secondary" onClick={addManual}>+ Thêm thủ công</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Cư dân</th><th>Giờ sáng</th><th>Giờ trưa</th><th>Giờ tối</th><th>Ghi chú</th><th>Nguồn</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={7} className="empty-state">Chưa có dòng lịch giờ ăn</td></tr>}
              {entries.map((row, idx) => (
                <tr key={`${idx}-${row.residentId}`}>
                  <td>
                    <select value={row.residentId} onChange={(e) => patchEntry(idx, { residentId: e.target.value })}>
                      <option value="">—</option>
                      {residents.map((r) => (
                        <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>
                      ))}
                    </select>
                  </td>
                  <td><input type="time" value={row.breakfastTime} onChange={(e) => patchEntry(idx, { breakfastTime: e.target.value })} /></td>
                  <td><input type="time" value={row.lunchTime} onChange={(e) => patchEntry(idx, { lunchTime: e.target.value })} /></td>
                  <td><input type="time" value={row.dinnerTime} onChange={(e) => patchEntry(idx, { dinnerTime: e.target.value })} /></td>
                  <td><input value={row.notes || ''} onChange={(e) => patchEntry(idx, { notes: e.target.value })} /></td>
                  <td>{row.source === 'template' ? 'Mẫu' : 'Thủ công'}</td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật Draft' : 'Lưu Draft'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Làm mới</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">Lịch giờ ăn ngày {formatVNDate(listDate)}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>← Hôm qua</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>Hôm nay</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>Ngày mai →</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Tiêu đề</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {schedules.length === 0 && <tr><td colSpan={4} className="empty-state">Không có lịch</td></tr>}
              {schedules.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatVNDate((d.workDate || '').slice(0, 10))}</td>
                  <td>{statusLabel(d.status)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>Mở</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>Publish</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => removeDraft(d._id)}>Xóa</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openScheduleDetail(d._id)}>
                        Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!!editingId && (
            <p className="meal-page__editing-meta">
              Đang chỉnh draft: <code>{editingId}</code>
              {entries.length > 0 && (
                <> · Cư dân: {[...new Set(entries.map((e) => residentMap[e.residentId]).filter(Boolean))].join(', ')}</>
              )}
            </p>
          )}
        </>
      )}

      {(detailLoading || detailSchedule) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closeScheduleDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">Chi tiết lịch giờ ăn đã publish</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closeScheduleDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">Đang tải chi tiết...</p>}
            {!detailLoading && detailSchedule && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>Tiêu đề:</strong> {detailSchedule.title || '—'} · <strong>Ngày:</strong>{' '}
                  {formatVNDate((detailSchedule.workDate || '').slice(0, 10))}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>Cư dân</th><th>Sáng</th><th>Trưa</th><th>Tối</th><th>Ghi chú</th><th>Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailSchedule.entries) && detailSchedule.entries.length > 0 ? (
                      detailSchedule.entries.map((row, idx) => {
                        const rid = String(row.residentId?._id || row.residentId || '');
                        const name = row.residentId?.fullName || residentMap[rid] || row.residentId?.residentCode || '—';
                        return (
                          <tr key={`${rid}-${idx}`}>
                            <td>{name}</td>
                            <td>{row.breakfastTime || '—'}</td>
                            <td>{row.lunchTime || '—'}</td>
                            <td>{row.dinnerTime || '—'}</td>
                            <td>{row.notes || '—'}</td>
                            <td>{row.source === 'template' ? 'Mẫu' : 'Thủ công'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={6} className="empty-state">Lịch chưa có chi tiết</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MealPlansPage() {
  const [tab, setTab] = useState('meal');

  return (
    <div className="page card meal-page">
      <h1 className="meal-page__title">Nurse Nutrition Planning</h1>
      <div className="tabs meal-page__tabs">
        <button className={`tab-btn ${tab === 'schedule' ? 'tab-btn--active' : ''}`} onClick={() => setTab('schedule')}>
          Schedule Meal Times
        </button>
        <button className={`tab-btn ${tab === 'meal' ? 'tab-btn--active' : ''}`} onClick={() => setTab('meal')}>
          Create Meal Plans
        </button>
        <button className={`tab-btn ${tab === 'special' ? 'tab-btn--active' : ''}`} onClick={() => setTab('special')}>
          Assign Special Diets
        </button>
      </div>

      {tab === 'schedule' && <MealTimeScheduleTab />}
      {tab === 'meal' && <MealPlanTab />}
      {tab === 'special' && <SpecialDietTab />}
    </div>
  );
}

