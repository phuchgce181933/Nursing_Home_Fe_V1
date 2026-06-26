import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminPageShell from '../../components/admin/AdminPageShell';
import ListPagination from '../../components/ui/ListPagination';
import useClientPagination from '../../hooks/useClientPagination';
import mealPlanService from '../../services/mealPlan.service';
import mealTimeScheduleService from '../../services/mealTimeSchedule.service';
import specialDietService from '../../services/specialDiet.service';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  dietTypeLabel,
  formatLocaleDate,
  mealTypeLabel,
  planStatusLabel,
  sourceLabel,
} from '../../utils/nutritionLabels';
import '../../styles/nurse/MealPlansPage.css';

const MP = 'nurse.mealPlans';

const today = () => getLocalDateString();
const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalDateString(d);
};
const defaultMealTimeByType = (mealType) => {
  if (mealType === 'breakfast') return '07:30';
  if (mealType === 'lunch') return '11:30';
  return '17:30';
};

function MealPlanTab() {
  const { t, i18n } = useTranslation();
  const TAB = `${MP}.mealTab`;
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
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [publishedTimes, setPublishedTimes] = useState({ byResident: {}, source: 'none' });
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [error, setError] = useState('');

  const residentIdsFromScheduleEntries = (entries) =>
    [...new Set(
      (entries || [])
        .map((e) => String(e.residentId?._id || e.residentId || ''))
        .filter(Boolean)
    )];

  const timesFromScheduleEntries = (scheduleEntries) => {
    const byResident = {};
    (scheduleEntries || []).forEach((e) => {
      const rid = String(e.residentId?._id || e.residentId || '');
      if (!rid) return;
      byResident[rid] = {
        breakfast: e.breakfastTime,
        lunch: e.lunchTime,
        dinner: e.dinnerTime,
      };
    });
    return byResident;
  };

  const resolveMealTime = (residentId, mealType) => {
    const rid = String(residentId || '');
    const fromSchedule = publishedTimes.byResident?.[rid]?.[mealType];
    return fromSchedule || '';
  };

  const residentMap = useMemo(
    () => Object.fromEntries(residents.map((r) => [String(r._id), r.fullName || r.residentCode])),
    [residents]
  );

  const scheduleResidentOptions = useMemo(() => {
    const idSet = new Set(selectedResidents);
    return residents.filter((r) => idSet.has(String(r._id)));
  }, [residents, selectedResidents]);

  const scheduleResidentLabel = (residentId) => {
    const rid = String(residentId || '');
    if (residentMap[rid]) return residentMap[rid];
    const entry = scheduleEntries.find(
      (e) => String(e.residentId?._id || e.residentId) === rid
    );
    const r = entry?.residentId;
    return r?.fullName || r?.residentCode || rid;
  };

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
      setError(e?.response?.data?.message || t(`${MP}.loadBootFailed`));
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedSchedules = async () => {
    try {
      const res = await mealTimeScheduleService.listSchedules({
        workDate: formWorkDate,
        status: 'published',
        limit: 50,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setPublishedSchedules(list);
      if (list.length === 1) {
        setSelectedScheduleId(String(list[0]._id));
      } else if (!list.some((s) => String(s._id) === String(selectedScheduleId))) {
        setSelectedScheduleId('');
        setPublishedTimes({ byResident: {}, source: 'none' });
        setScheduleEntries([]);
        setSelectedResidents([]);
      }
    } catch {
      setPublishedSchedules([]);
      setSelectedScheduleId('');
      setPublishedTimes({ byResident: {}, source: 'none' });
      setScheduleEntries([]);
      setSelectedResidents([]);
    }
  };

  const loadScheduleTimes = async (scheduleId) => {
    if (!scheduleId) {
      setPublishedTimes({ byResident: {}, source: 'none' });
      setScheduleEntries([]);
      setSelectedResidents([]);
      return;
    }
    try {
      const data = await mealTimeScheduleService.getSchedule(scheduleId);
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      const ids = residentIdsFromScheduleEntries(entries);
      setScheduleEntries(entries);
      setSelectedResidents(ids);
      setPublishedTimes({
        byResident: timesFromScheduleEntries(entries),
        source: 'published_schedule',
      });
      setEntries((prev) => prev.filter((e) => ids.includes(String(e.residentId))));
    } catch {
      setPublishedTimes({ byResident: {}, source: 'none' });
      setScheduleEntries([]);
      setSelectedResidents([]);
    }
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
    loadPublishedSchedules();
  }, [formWorkDate]);

  useEffect(() => {
    loadScheduleTimes(selectedScheduleId);
  }, [selectedScheduleId]);

  const {
    paginatedItems: paginatedPlans,
    page: plansPage,
    setPage: setPlansPage,
    totalPages: plansTotalPages,
    total: plansTotal,
  } = useClientPagination(plans);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (!selectedScheduleId) return setError(t(`${MP}.selectSchedule`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.scheduleNoResidents`));
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
    setEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => `${String(e.residentId)}:${e.mealType}`));
      const toAdd = generated.filter((g) => !existingKeys.has(`${String(g.residentId)}:${g.mealType}`));
      return [...prev, ...toAdd];
    });
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
    setSelectedScheduleId('');
    setScheduleEntries([]);
    setEntries([]);
    setEditingId('');
    setError('');
  };

  const validate = () => {
    if (!selectedScheduleId) return t(`${MP}.selectSchedule`);
    if (!careStage) return t(`${MP}.selectCareStage`);
    if (formWorkDate < today()) return t(`${MP}.pastDateMealPlan`);
    if (selectedResidents.length < 1) return t(`${MP}.scheduleNoResidents`);
    if (!entries.length) return t(`${MP}.addAtLeastOneMealEntry`);
    const typeKeys = new Set();
    const timeKeys = new Set();
    for (const e of entries) {
      const rid = String(e.residentId || '');
      const typeKey = `${rid}:${e.mealType}`;
      if (typeKeys.has(typeKey)) return t(`${TAB}.duplicateMealType`);
      typeKeys.add(typeKey);
      const mealTime = e.mealTime || resolveMealTime(e.residentId, e.mealType);
      if (mealTime) {
        const timeKey = `${rid}:${mealTime}`;
        if (timeKeys.has(timeKey)) return t(`${TAB}.duplicateMealTime`, { time: mealTime });
        timeKeys.add(timeKey);
      }
    }
    const hasInvalid = entries.some((e) => !e.residentId || !e.mealType || !e.mealName?.trim() || !e.mealTime);
    if (hasInvalid) return t(`${MP}.invalidMealRow`);
    return '';
  };

  const buildPayload = () => ({
    workDate: formWorkDate,
    mealTimeScheduleDayId: selectedScheduleId,
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
      setError(e?.response?.data?.message || t(`${MP}.saveDraftFailed`));
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
      const scheduleId = String(data.mealTimeScheduleDayId?._id || data.mealTimeScheduleDayId || '');
      setSelectedScheduleId(scheduleId);
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
    } catch (e) {
      setError(e?.response?.data?.message || t(`${MP}.openDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.publishFailed`));
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm(t(`${MP}.confirmDeleteMealPlan`))) return;
    setSaving(true);
    setError('');
    try {
      await mealPlanService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || t(`${MP}.deleteDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="page card meal-page">
      <h1 className="meal-page__title">{t(`${TAB}.title`)}</h1>
      <p className="meal-page__intro">{t(`${TAB}.intro`)}</p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)}</label>
              <input type="date" min={today()} value={formWorkDate} onChange={(e) => setFormWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.mealTimeSchedule`)}</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                disabled={!publishedSchedules.length}
              >
                <option value="">{t(`${TAB}.selectPublishedSchedule`)}</option>
                {publishedSchedules.map((s) => (
                  <option key={s._id} value={s._id}>
                    {t(`${TAB}.scheduleOption`, {
                      title: s.title || t(`${TAB}.defaultScheduleTitle`),
                      count: Array.isArray(s.entries) ? s.entries.length : '…',
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.careStage`)}</label>
              <select value={careStage} onChange={(e) => setCareStage(e.target.value)}>
                <option value="">{t(`${TAB}.selectOption`)}</option>
                {careStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          {selectedScheduleId ? (
            <div className="meal-page__resident-section">
              <label className="meal-page__resident-label">
                {t(`${TAB}.residentsFromSchedule`, { count: selectedResidents.length })}
              </label>
              {selectedResidents.length === 0 ? (
                <p className="field-hint field-hint--warn">{t(`${TAB}.scheduleNoResidentsWarn`)}</p>
              ) : (
                <ul className="meal-page__resident-readonly">
                  {selectedResidents.map((id) => (
                    <li key={id}>{scheduleResidentLabel(id)}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="meal-page__hint">{t(`${TAB}.selectScheduleHint`)}</p>
          )}

          <p className="meal-page__hint">
            {selectedScheduleId && publishedTimes.source === 'published_schedule'
              ? t(`${TAB}.timesFromScheduleHint`)
              : publishedSchedules.length
                ? ''
                : t(`${TAB}.noPublishedScheduleHint`)}
          </p>

          <div className="tab-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">{t(`${TAB}.selectThreeMealTemplate`)}</option>
              {templates.map((tpl) => <option key={tpl.key} value={tpl.key}>{tpl.name}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>{t(`${MP}.addFromTemplate`)}</button>
            <button type="button" className="btn-secondary" onClick={addManual} disabled={!selectedScheduleId}>{t(`${MP}.addManual`)}</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colMeal`)}</th><th>{t(`${TAB}.colDish`)}</th><th>{t(`${TAB}.colKcal`)}</th><th>{t(`${TAB}.colTime`)}</th><th>{t(`${TAB}.colIngredients`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={9} className="empty-state">{t(`${MP}.emptyEntries`)}</td></tr>}
              {entries.map((row, idx) => (
                <tr key={`${idx}-${row.residentId}-${row.mealType}`}>
                  <td>
                    <select
                      value={row.residentId}
                      onChange={(e) => patchEntry(idx, { residentId: e.target.value })}
                      disabled={!selectedScheduleId}
                    >
                      <option value="">—</option>
                      {scheduleResidentOptions.map((r) => (
                        <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>
                      ))}
                      {selectedResidents
                        .filter((id) => !scheduleResidentOptions.some((r) => String(r._id) === id))
                        .map((id) => (
                          <option key={id} value={id}>{scheduleResidentLabel(id)}</option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <select value={row.mealType} onChange={(e) => patchEntry(idx, { mealType: e.target.value })}>
                      <option value="breakfast">{mealTypeLabel('breakfast', t)}</option>
                      <option value="lunch">{mealTypeLabel('lunch', t)}</option>
                      <option value="dinner">{mealTypeLabel('dinner', t)}</option>
                    </select>
                  </td>
                  <td><input value={row.mealName} onChange={(e) => patchEntry(idx, { mealName: e.target.value })} /></td>
                  <td><input type="number" min="0" value={row.calories} onChange={(e) => patchEntry(idx, { calories: e.target.value })} /></td>
                  <td><input type="time" value={row.mealTime || defaultMealTimeByType(row.mealType)} onChange={(e) => patchEntry(idx, { mealTime: e.target.value })} /></td>
                  <td><input value={Array.isArray(row.ingredients) ? row.ingredients.join(', ') : row.ingredients || ''} onChange={(e) => patchEntry(idx, { ingredients: e.target.value })} /></td>
                  <td>{sourceLabel(row.source, t)}</td>
                  <td><input value={row.nutritionNote || ''} onChange={(e) => patchEntry(idx, { nutritionNote: e.target.value })} /></td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">{t(`${MP}.listTitleMealPlans`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t(`${TAB}.detailStage`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={5} className="empty-state">{t(`${MP}.emptyPlans`)}</td></tr>}
              {paginatedPlans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{d.careStage || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openPlanDetail(d._id)}>
                        {t('common.viewDetails')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length > 0 && (
            <ListPagination
              page={plansPage}
              totalPages={plansTotalPages}
              total={plansTotal}
              onPageChange={setPlansPage}
            />
          )}

          {!!editingId && (
            <p className="meal-page__editing-meta">
              {t(`${MP}.updateDraft`)}: <code>{editingId}</code>
              {entries.length > 0 && (
                <> · {t('common.residents')}: {[...new Set(entries.map((e) => residentMap[e.residentId]).filter(Boolean))].join(', ')}</>
              )}
              {entries.length > 0 && (
                <> · {t(`${TAB}.colMeal`)}: {[...new Set(entries.map((e) => mealTypeLabel(e.mealType, t)))].join(', ')}</>
              )}
            </p>
          )}
        </>
      )}

      {(detailLoading || detailPlan) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailPlan && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>{t(`${TAB}.detailTitle`)}:</strong> {detailPlan.title || '—'} · <strong>{t(`${TAB}.detailDate`)}:</strong> {formatLocaleDate((detailPlan.workDate || '').slice(0, 10), i18n.language)} · <strong>{t(`${TAB}.detailStage`)}:</strong> {detailPlan.careStage || '—'}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colMeal`)}</th><th>{t(`${TAB}.colDish`)}</th><th>{t(`${TAB}.colKcal`)}</th><th>{t(`${TAB}.colTime`)}</th><th>{t(`${TAB}.colIngredients`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailPlan.entries) && detailPlan.entries.length > 0 ? detailPlan.entries.map((row, idx) => {
                      const rid = String(row.residentId?._id || row.residentId || '');
                      const name = row.residentId?.fullName || residentMap[rid] || row.residentId?.residentCode || '—';
                      return (
                        <tr key={`${rid}-${row.mealType}-${idx}`}>
                          <td>{name}</td>
                          <td>{mealTypeLabel(row.mealType, t)}</td>
                          <td>{row.mealName || '—'}</td>
                          <td>{row.calories ?? '—'}</td>
                          <td>{row.mealTime || '—'}</td>
                          <td>{Array.isArray(row.ingredients) ? row.ingredients.join(', ') || '—' : row.ingredients || '—'}</td>
                          <td>{sourceLabel(row.source, t)}</td>
                          <td>{row.nutritionNote || row.stageNote || '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={8} className="empty-state">{t(`${TAB}.emptyDetailMeals`)}</td></tr>
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
  const { t, i18n } = useTranslation();
  const TAB = `${MP}.specialTab`;
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
      setError(e?.response?.data?.message || t(`${MP}.loadSpecialBootFailed`));
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

  const {
    paginatedItems: paginatedPlans,
    page: plansPage,
    setPage: setPlansPage,
    totalPages: plansTotalPages,
    total: plansTotal,
  } = useClientPagination(plans);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.selectResidents`));
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
    if (workDate < today()) return t(`${MP}.pastDateSpecialDiet`);
    if (selectedResidents.length < 1) return t(`${MP}.selectResidents`);
    if (!entries.length) return t(`${MP}.addAtLeastOneSpecialEntry`);
    const hasInvalid = entries.some((e) => !e.residentId || !e.dietType || !e.effectiveTime);
    if (hasInvalid) return t(`${MP}.invalidSpecialRow`);
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
      setError(e?.response?.data?.message || t(`${MP}.saveDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.openDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.publishFailed`));
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm(t(`${MP}.confirmDeleteSpecialDiet`))) return;
    setSaving(true);
    setError('');
    try {
      await specialDietService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadPlans(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || t(`${MP}.deleteDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="meal-page">
      <p className="meal-page__intro">{t(`${TAB}.intro`)}</p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)}</label>
              <input type="date" min={today()} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          <div className="meal-page__resident-section">
            <label className="meal-page__resident-label">{t(`${TAB}.residentsLabel`)}</label>
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
              <option value="">{t(`${TAB}.selectSpecialTemplate`)}</option>
              {templates.map((tpl) => <option key={tpl.key} value={tpl.key}>{tpl.name}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>{t(`${MP}.addFromTemplate`)}</button>
            <button type="button" className="btn-secondary" onClick={addManual}>{t(`${MP}.addManual`)}</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colDietType`)}</th><th>{t(`${TAB}.colRestrictions`)}</th><th>{t(`${TAB}.colGoal`)}</th><th>{t(`${TAB}.colEffectiveTime`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={8} className="empty-state">{t(`${TAB}.emptyEntries`)}</td></tr>}
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
                      {dietTypes.map((dt) => <option key={dt} value={dt}>{dietTypeLabel(dt, t)}</option>)}
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
                  <td>{sourceLabel(row.source, t)}</td>
                  <td><input value={row.notes || ''} onChange={(e) => patchEntry(idx, { notes: e.target.value })} /></td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">{t(`${MP}.listTitleSpecialDiets`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={4} className="empty-state">{t(`${MP}.emptyPlans`)}</td></tr>}
              {paginatedPlans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => deleteDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openPlanDetail(d._id)}>
                        {t('common.viewDetails')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length > 0 && (
            <ListPagination
              page={plansPage}
              totalPages={plansTotalPages}
              total={plansTotal}
              onPageChange={setPlansPage}
            />
          )}
        </>
      )}

      {(detailLoading || detailPlan) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailPlan && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>{t(`${TAB}.titleLabel`)}:</strong> {detailPlan.title || '—'} · <strong>{t('common.date')}:</strong> {formatLocaleDate((detailPlan.workDate || '').slice(0, 10), i18n.language)}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colDietType`)}</th><th>{t(`${TAB}.colRestrictions`)}</th><th>{t(`${TAB}.colGoal`)}</th><th>{t(`${TAB}.colEffectiveTime`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(detailPlan.entries) && detailPlan.entries.length > 0 ? detailPlan.entries.map((row, idx) => {
                      const name = row.residentId?.fullName || row.residentId?.residentCode || '—';
                      return (
                        <tr key={`${detailPlan._id || 'detail-special'}-${idx}`}>
                          <td>{name}</td>
                          <td>{dietTypeLabel(row.dietType, t) || '—'}</td>
                          <td>{Array.isArray(row.restrictions) ? row.restrictions.join(', ') || '—' : row.restrictions || '—'}</td>
                          <td>{row.nutritionGoal || '—'}</td>
                          <td>{row.effectiveTime || '—'}</td>
                          <td>{sourceLabel(row.source, t)}</td>
                          <td>{row.notes || '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="empty-state">{t(`${TAB}.emptyDetail`)}</td></tr>
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
  const { t, i18n } = useTranslation();
  const TAB = `${MP}.scheduleTab`;
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
      setError(e?.response?.data?.message || t(`${MP}.loadScheduleBootFailed`));
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

  const {
    paginatedItems: paginatedSchedules,
    page: schedulesPage,
    setPage: setSchedulesPage,
    totalPages: schedulesTotalPages,
    total: schedulesTotal,
  } = useClientPagination(schedules);

  const addFromTemplate = () => {
    setError('');
    const tpl = templates.find((t) => t.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.selectResidents`));
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
    if (!generated.length) return setError(t(`${MP}.residentsAlreadyInTable`));
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManual = () => {
    const rid = selectedResidents[0] || '';
    if (!rid) return setError(t(`${MP}.selectResidentsBeforeManual`));
    if (entries.some((e) => String(e.residentId) === String(rid))) {
      return setError(t(`${MP}.residentAlreadyInTable`));
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
    if (formWorkDate < today()) return t(`${MP}.pastDateMealTime`);
    if (selectedResidents.length < 1) return t(`${MP}.selectResidents`);
    if (!entries.length) return t(`${MP}.addAtLeastOneTimeEntry`);
    const hasInvalid = entries.some(
      (e) => !e.residentId || !e.breakfastTime || !e.lunchTime || !e.dinnerTime
    );
    if (hasInvalid) return t(`${MP}.invalidTimeRow`);
    const uniqueResidents = new Set(entries.map((e) => String(e.residentId)));
    if (uniqueResidents.size !== entries.length) return t(`${MP}.oneRowPerResident`);
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
      setError(e?.response?.data?.message || t(`${MP}.saveDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.openDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.publishFailed`));
    } finally {
      setSaving(false);
    }
  };

  const removeDraft = async (id) => {
    if (!window.confirm(t(`${MP}.confirmDeleteMealTime`))) return;
    setSaving(true);
    setError('');
    try {
      await mealTimeScheduleService.deleteDraft(id);
      if (editingId === id) resetForm();
      loadSchedules(listDate);
    } catch (e) {
      setError(e?.response?.data?.message || t(`${MP}.deleteDraftFailed`));
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
      setError(e?.response?.data?.message || t(`${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeScheduleDetail = () => setDetailSchedule(null);

  return (
    <div className="page card meal-page">
      <h1 className="meal-page__title">{t(`${TAB}.title`)}</h1>
      <p className="meal-page__intro">{t(`${TAB}.intro`)}</p>
      {error && <p className="form-error">{error}</p>}
      {loading && <p>{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)}</label>
              <input type="date" min={today()} value={formWorkDate} onChange={(e) => setFormWorkDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          <div className="meal-page__resident-section">
            <label className="meal-page__resident-label">{t(`${TAB}.residentsLabel`)}</label>
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
              <option value="">{t(`${TAB}.selectPattern`)}</option>
              {templates.map((tpl) => (
                <option key={tpl.key} value={tpl.key}>{tpl.name}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={addFromTemplate}>{t(`${MP}.addFromPattern`)}</button>
            <button type="button" className="btn-secondary" onClick={addManual}>{t(`${MP}.addManual`)}</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colBreakfast`)}</th><th>{t(`${TAB}.colLunch`)}</th><th>{t(`${TAB}.colDinner`)}</th><th>{t(`${TAB}.colNotes`)}</th><th>{t(`${TAB}.colSource`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={7} className="empty-state">{t(`${TAB}.emptyEntries`)}</td></tr>}
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
                  <td>{row.source === 'template' ? t(`${MP}.sourcePattern`) : sourceLabel(row.source, t)}</td>
                  <td><button type="button" className="btn btn--sm btn--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tab-toolbar">
            <button type="button" className="btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="meal-page__list-header">
            <h3 className="meal-page__draft-title">{t(`${MP}.listTitleMealTimes`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="meal-page__date-switch">
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {schedules.length === 0 && <tr><td colSpan={4} className="empty-state">{t(`${MP}.emptyPlans`)}</td></tr>}
              {paginatedSchedules.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="btn btn--sm btn--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="btn btn--sm btn--delete" onClick={() => removeDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn--sm meal-page__btn-view" onClick={() => openScheduleDetail(d._id)}>
                        {t('common.viewDetails')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {schedules.length > 0 && (
            <ListPagination
              page={schedulesPage}
              totalPages={schedulesTotalPages}
              total={schedulesTotal}
              onPageChange={setSchedulesPage}
            />
          )}

          {!!editingId && (
            <p className="meal-page__editing-meta">
              {t(`${MP}.updateDraft`)}: <code>{editingId}</code>
              {entries.length > 0 && (
                <> · {t('common.residents')}: {[...new Set(entries.map((e) => residentMap[e.residentId]).filter(Boolean))].join(', ')}</>
              )}
            </p>
          )}
        </>
      )}

      {(detailLoading || detailSchedule) && (
        <div className="meal-page__modal-overlay" onClick={!detailLoading ? closeScheduleDetail : undefined}>
          <div className="meal-page__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="meal-page__modal-header">
              <h3 className="meal-page__modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="meal-page__modal-close" onClick={closeScheduleDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="meal-page__modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailSchedule && (
              <div className="meal-page__modal-body">
                <p className="meal-page__modal-meta">
                  <strong>{t(`${TAB}.titleLabel`)}:</strong> {detailSchedule.title || '—'} · <strong>{t('common.date')}:</strong>{' '}
                  {formatLocaleDate((detailSchedule.workDate || '').slice(0, 10), i18n.language)}
                </p>
                <table className="data-table meal-page__detail-table">
                  <thead>
                    <tr>
                      <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colBreakfast`)}</th><th>{t(`${TAB}.colLunch`)}</th><th>{t(`${TAB}.colDinner`)}</th><th>{t(`${TAB}.colNotes`)}</th><th>{t(`${TAB}.colSource`)}</th>
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
                            <td>{row.source === 'template' ? t(`${MP}.sourcePattern`) : sourceLabel(row.source, t)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={6} className="empty-state">{t(`${TAB}.emptyDetail`)}</td></tr>
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
  const { t } = useTranslation();
  const [tab, setTab] = useState('meal');

  return (
    <AdminPageShell title={t('nurse.mealPlans.title')}>
      <div className="meal-page">
      <div className="tabs meal-page__tabs">
        <button className={`tab-btn ${tab === 'schedule' ? 'tab-btn--active' : ''}`} onClick={() => setTab('schedule')}>
          {t('nurse.mealPlans.tabSchedule')}
        </button>
        <button className={`tab-btn ${tab === 'meal' ? 'tab-btn--active' : ''}`} onClick={() => setTab('meal')}>
          {t('nurse.mealPlans.tabMealPlans')}
        </button>
        <button className={`tab-btn ${tab === 'special' ? 'tab-btn--active' : ''}`} onClick={() => setTab('special')}>
          {t('nurse.mealPlans.tabSpecialDiets')}
        </button>
      </div>

      {tab === 'schedule' && <MealTimeScheduleTab />}
      {tab === 'meal' && <MealPlanTab />}
      {tab === 'special' && <SpecialDietTab />}
      </div>
    </AdminPageShell>
  );
}

