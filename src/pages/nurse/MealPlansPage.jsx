import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mealPlanService from '../../services/mealPlan.service';
import mealTimeScheduleService from '../../services/mealTimeSchedule.service';
import specialDietService from '../../services/specialDiet.service';
import dishService from '../../services/dish.service';
import { todayVN, addDaysToDateStr } from '../../utils/dateUtils';
import {
  careStageLabel,
  dietTypeLabel,
  formatLocaleDate,
  mealTypeLabel,
  planStatusLabel,
  sourceLabel,
} from '../../utils/nutritionLabels';
import '../../styles/nurse/MealPlansPage.css';
import { resolveApiError } from '../../utils/apiMessage';
import {
  getResidentCoverage,
  ResidentCoverageBadge,
  SelectedCoverageBanner,
  useNutritionCoverage,
} from './components/mealPlanCoverage';

const MP = 'nurse.mealPlans';
const CUSTOM_DISH_VALUE = '__custom__';

const today = () => todayVN();
const addDays = (dateStr, delta) => addDaysToDateStr(dateStr, delta);
const clampWorkDate = (dateStr) => {
  const normalized = (dateStr || '').slice(0, 10) || today();
  return normalized < today() ? today() : normalized;
};

function WorkDatePicker({ value, onChange, t }) {
  return (
    <div className="mp-date-switch mp-date-switch--form">
      <button type="button" className="mp-btn-secondary" onClick={() => onChange(today())}>
        {t('common.today')}
      </button>
      <button type="button" className="mp-btn-secondary" onClick={() => onChange(addDays(today(), 1))}>
        {t(`${MP}.tomorrow`)}
      </button>
      <button type="button" className="mp-btn-secondary" onClick={() => onChange(addDays(today(), 7))}>
        {t(`${MP}.in7Days`)}
      </button>
      <input type="date" min={today()} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
const defaultMealTimeByType = (mealType) => {
  if (mealType === 'breakfast') return '07:30';
  if (mealType === 'lunch') return '11:30';
  return '17:30';
};

const residentIdsFromScheduleEntries = (scheduleEntries) =>
  [...new Set((scheduleEntries || []).map((e) => String(e.residentId?._id || e.residentId || '')).filter(Boolean))];

const publishedTimesFromScheduleEntries = (scheduleEntries) => {
  const byResident = {};
  for (const entry of scheduleEntries || []) {
    const rid = String(entry.residentId?._id || entry.residentId || '');
    if (!rid) continue;
    byResident[rid] = {
      breakfast: entry.breakfastTime,
      lunch: entry.lunchTime,
      dinner: entry.dinnerTime,
    };
  }
  return {
    byResident,
    source: Object.keys(byResident).length ? 'published_schedule' : 'system_default',
  };
};

const scheduleResidentCount = (schedule) =>
  residentIdsFromScheduleEntries(schedule?.entries).length;

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
  const [publishedTimes, setPublishedTimes] = useState({ byResident: {}, source: 'system_default' });
  const [mealTimeScheduleDayId, setMealTimeScheduleDayId] = useState('');
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [scheduleResidentIds, setScheduleResidentIds] = useState([]);
  const [dishCatalog, setDishCatalog] = useState([]);
  const [error, setError] = useState('');
  const suppressScheduleLoadRef = useRef(false);
  const coverageByResident = useNutritionCoverage(formWorkDate, residents);

  const hasSelectedSchedule = Boolean(mealTimeScheduleDayId);

  const selectableResidents = useMemo(() => {
    if (!hasSelectedSchedule) return [];
    const allowed = new Set(scheduleResidentIds);
    return residents.filter((r) => allowed.has(String(r._id)));
  }, [residents, hasSelectedSchedule, scheduleResidentIds]);

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

  const mealPlanCoverageBannerItems = useMemo(
    () =>
      selectedResidents
        .map((id) => {
          const info = getResidentCoverage(coverageByResident, id, 'mealPlan');
          if (!info.published) return null;
          const name = residentMap[id] || id;
          const titleSuffix = info.planTitle ? ` (${info.planTitle})` : '';
          return {
            key: id,
            text: t(`${MP}.coverageWarningMealPlan`, {
              name,
              publisher: info.publishedByName || '—',
              title: titleSuffix,
            }),
          };
        })
        .filter(Boolean),
    [selectedResidents, coverageByResident, residentMap, t]
  );

  const loadBoot = async () => {
    setLoading(true);
    setError('');
    try {
      const [tplRes, residentRes, dishRes] = await Promise.all([
        mealPlanService.getTemplates(),
        mealPlanService.listResidents({ status: 'admitted' }),
        dishService.listDishes({ activeOnly: true }),
      ]);
      setCareStages(Array.isArray(tplRes.careStages) ? tplRes.careStages : []);
      setCareStage(Array.isArray(tplRes.careStages) && tplRes.careStages[0] ? tplRes.careStages[0] : '');
      setTemplates(Array.isArray(tplRes.templates) ? tplRes.templates : []);
      setResidents(Array.isArray(residentRes?.data) ? residentRes.data : []);
      setDishCatalog(Array.isArray(dishRes?.data) ? dishRes.data : []);
    } catch (e) {
      setError(resolveApiError(e, t, `${MP}.loadBootFailed`));
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedMealTimes = useCallback(() => {
    if (!mealTimeScheduleDayId) {
      setPublishedTimes({ byResident: {}, source: 'system_default' });
      return;
    }
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
  }, [formWorkDate, selectedResidents, mealTimeScheduleDayId]);

  const syncScheduleContext = useCallback(
    async (scheduleId, { preserveSelections = false } = {}) => {
      if (!scheduleId) {
        setMealTimeScheduleDayId('');
        setScheduleResidentIds([]);
        setPublishedTimes({ byResident: {}, source: 'system_default' });
        if (!preserveSelections) {
          setSelectedResidents([]);
          setEntries([]);
        }
        return;
      }
      const data = await mealTimeScheduleService.getSchedule(scheduleId);
      const ids = residentIdsFromScheduleEntries(data.entries);
      setMealTimeScheduleDayId(String(scheduleId));
      setScheduleResidentIds(ids);
      setPublishedTimes(publishedTimesFromScheduleEntries(data.entries));
      if (!preserveSelections) {
        setSelectedResidents(ids);
        setEntries([]);
      }
    },
    []
  );

  const loadPublishedSchedules = useCallback(
    async (date, { preferredId } = {}) => {
      try {
        const res = await mealTimeScheduleService.listSchedules({
          workDate: date,
          status: 'published',
          limit: 50,
        });
        const list = Array.isArray(res?.data) ? res.data : [];
        setPublishedSchedules(list);
        const preferred = preferredId ? String(preferredId) : '';
        if (preferred && list.some((s) => String(s._id) === preferred)) {
          await syncScheduleContext(preferred, { preserveSelections: true });
          return;
        }
        if (list.length === 1) {
          await syncScheduleContext(String(list[0]._id));
          return;
        }
        if (!preferred) {
          setMealTimeScheduleDayId('');
          setScheduleResidentIds([]);
          setPublishedTimes({ byResident: {}, source: 'system_default' });
        }
      } catch {
        setPublishedSchedules([]);
        if (!preferredId) {
          setMealTimeScheduleDayId('');
          setScheduleResidentIds([]);
          setPublishedTimes({ byResident: {}, source: 'system_default' });
        }
      }
    },
    [syncScheduleContext]
  );

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
    if (suppressScheduleLoadRef.current) {
      suppressScheduleLoadRef.current = false;
      return;
    }
    loadPublishedSchedules(formWorkDate);
  }, [formWorkDate, loadPublishedSchedules]);

  useEffect(() => {
    loadPublishedMealTimes();
  }, [loadPublishedMealTimes]);

  const handleWorkDateChange = (nextDate) => {
    setFormWorkDate(nextDate);
    setMealTimeScheduleDayId('');
    setScheduleResidentIds([]);
    setSelectedResidents([]);
    setEntries([]);
    setError('');
  };

  const handleScheduleChange = async (e) => {
    const nextId = e.target.value;
    setError('');
    try {
      await syncScheduleContext(nextId);
    } catch (err) {
      setError(resolveApiError(err, t, `${MP}.loadScheduleBootFailed`));
    }
  };

  const addFromTemplate = () => {
    setError('');
    if (!mealTimeScheduleDayId) return setError(t(`${MP}.selectSchedule`));
    const tpl = templates.find((tp) => tp.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.selectResidents`));
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
    if (!mealTimeScheduleDayId) return setError(t(`${MP}.selectSchedule`));
    const rid = selectedResidents[0] || '';
    if (!rid) return setError(t(`${MP}.selectResidents`));
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
        dishId: '',
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

  const handleDishSelect = (idx, value) => {
    if (value === CUSTOM_DISH_VALUE) {
      patchEntry(idx, { dishId: '', source: 'manual' });
      return;
    }
    const dish = dishCatalog.find((d) => String(d._id) === String(value));
    if (!dish) return;
    patchEntry(idx, {
      dishId: String(dish._id),
      mealName: dish.name,
      calories: dish.calories,
      ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
      source: 'catalog',
    });
  };

  const dishCatalogIds = useMemo(
    () => new Set(dishCatalog.map((d) => String(d._id))),
    [dishCatalog]
  );

  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle('');
    setSelectedTemplate('');
    setSelectedResidents([]);
    setEntries([]);
    setEditingId('');
    setMealTimeScheduleDayId('');
    setScheduleResidentIds([]);
    setPublishedTimes({ byResident: {}, source: 'system_default' });
    setError('');
    loadPublishedSchedules(formWorkDate);
  };

  const validate = () => {
    if (!careStage) return t(`${MP}.selectCareStage`);
    if (formWorkDate < today()) return t(`${MP}.pastDateMealPlan`);
    if (!mealTimeScheduleDayId) return t(`${MP}.selectSchedule`);
    if (selectedResidents.length < 1) return t(`${MP}.selectResidents`);
    const allowedResidents = new Set(scheduleResidentIds);
    if (selectedResidents.some((id) => !allowedResidents.has(String(id)))) {
      return t(`${TAB}.scheduleNoResidentsWarn`);
    }
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
    mealTimeScheduleDayId,
    careStage,
    title,
    entries: entries.map((e) => ({
      residentId: e.residentId,
      mealType: e.mealType,
      mealName: e.mealName,
      calories: e.calories === '' ? undefined : Number(e.calories),
      dishId: e.dishId || undefined,
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
      setError(resolveApiError(e, t, `${MP}.saveDraftFailed`));
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
          dishId: String(r.dishId?._id || r.dishId || ''),
          mealTime: r.mealTime || defaultMealTimeByType(r.mealType),
        }))
      );
      const picked = [...new Set(rows.map((r) => String(r.residentId?._id || r.residentId || '')).filter(Boolean))];
      const scheduleId = String(data.mealTimeScheduleDayId?._id || data.mealTimeScheduleDayId || '');
      const workDateStr = clampWorkDate(data.workDate);
      suppressScheduleLoadRef.current = true;
      setFormWorkDate(workDateStr);
      await loadPublishedSchedules(workDateStr, { preferredId: scheduleId });
      setSelectedResidents(picked);
    } catch (e) {
      setError(resolveApiError(e, t, `${MP}.openDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.publishFailed`));
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
      setError(resolveApiError(e, t, `${MP}.deleteDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="mp-page">
      <h2 className="mp-page__title">{t(`${TAB}.title`)}</h2>
      <p className="mp-intro">
        {t(`${TAB}.intro`)}
      </p>
      {error && <p className="mp-error">{error}</p>}
      {loading && <p className="mp-loading">{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="mp-form-grid form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)} *</label>
              <WorkDatePicker value={formWorkDate} onChange={handleWorkDateChange} t={t} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.mealTimeSchedule`)}</label>
              <select
                className="mp-schedule-select"
                value={mealTimeScheduleDayId}
                onChange={handleScheduleChange}
              >
                <option value="">{t(`${TAB}.selectPublishedSchedule`)}</option>
                {publishedSchedules.map((s) => (
                  <option key={s._id} value={s._id}>
                    {t(`${TAB}.scheduleOption`, {
                      title: s.title || t(`${TAB}.defaultScheduleTitle`),
                      count: scheduleResidentCount(s),
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.careStage`)} *</label>
              <select value={careStage} onChange={(e) => setCareStage(e.target.value)}>
                <option value="">{t(`${TAB}.selectOption`)}</option>
                {careStages.map((s) => (
                  <option key={s} value={s}>{careStageLabel(s, t)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          <SelectedCoverageBanner items={mealPlanCoverageBannerItems} />

          <div className={`mp-resident-section${!hasSelectedSchedule ? ' mp-resident-section--disabled' : ''}`}>
            <label className="mp-resident-label">
              {hasSelectedSchedule
                ? t(`${TAB}.residentsFromSchedule`, { count: scheduleResidentIds.length })
                : t(`${TAB}.residentsLabel`)} *
            </label>
            <div className="mp-resident-grid">
              {(hasSelectedSchedule ? selectableResidents : residents).map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                const disabled = !hasSelectedSchedule;
                const planCoverage = getResidentCoverage(coverageByResident, id, 'mealPlan');
                return (
                  <label
                    key={id}
                    className={`mp-resident-item${disabled ? ' mp-resident-item--disabled' : ''}${planCoverage.published ? ' mp-resident-item--covered' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                    <ResidentCoverageBadge
                      info={planCoverage}
                      label={t(`${MP}.coverageBadgeMealPlan`)}
                      publisherLabel={
                        planCoverage.publishedByName
                          ? t(`${MP}.coveragePublishedBy`, { name: planCoverage.publishedByName })
                          : undefined
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <p className="mp-hint">
            {!hasSelectedSchedule
              ? publishedSchedules.length
                ? t(`${TAB}.selectScheduleHint`)
                : t(`${TAB}.noPublishedScheduleHint`)
              : publishedTimes.source === 'published_schedule'
                ? t(`${TAB}.timesFromScheduleHint`)
                : t(`${TAB}.scheduleNoResidentsWarn`)}
          </p>

          <div className={`mp-toolbar${!hasSelectedSchedule ? ' mp-toolbar--disabled' : ''}`}>
            <select
              value={selectedTemplate}
              disabled={!hasSelectedSchedule}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">{t(`${TAB}.selectThreeMealTemplate`)}</option>
              {templates.map((tpl) => <option key={tpl.key} value={tpl.key}>{tpl.name}</option>)}
            </select>
            <button type="button" className="mp-btn-primary" disabled={!hasSelectedSchedule} onClick={addFromTemplate}>+ {t(`${MP}.addFromTemplate`)}</button>
            <button type="button" className="mp-btn-secondary" disabled={!hasSelectedSchedule} onClick={addManual}>+ {t(`${MP}.addManual`)}</button>
          </div>

          {!dishCatalog.length && <p className="mp-hint mp-hint--catalog">{t(`${TAB}.noDishCatalog`)}</p>}

          <table className="mp-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colMeal`)}</th><th>{t(`${TAB}.colDish`)}</th><th>{t(`${TAB}.colKcal`)}</th><th>{t(`${TAB}.colTime`)}</th><th>{t(`${TAB}.colIngredients`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={9} className="mp-empty">{t(`${MP}.emptyEntries`)}</td></tr>}
              {entries.map((row, idx) => (
                <tr key={`${idx}-${row.residentId}-${row.mealType}`}>
                  <td>
                    <select
                      value={row.residentId}
                      disabled={!hasSelectedSchedule}
                      onChange={(e) => patchEntry(idx, { residentId: e.target.value })}
                    >
                      <option value="">—</option>
                      {(hasSelectedSchedule ? selectableResidents : residents).map((r) => (
                        <option key={r._id} value={r._id}>{r.fullName || r.residentCode}</option>
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
                  <td>
                    <div className="mp-dish-cell">
                      <select
                        className="mp-dish-select"
                        value={
                          row.dishId && (row.source === 'catalog' || dishCatalogIds.has(String(row.dishId)))
                            ? String(row.dishId)
                            : CUSTOM_DISH_VALUE
                        }
                        onChange={(e) => handleDishSelect(idx, e.target.value)}
                      >
                        <option value={CUSTOM_DISH_VALUE}>{t(`${TAB}.customDish`)}</option>
                        {dishCatalog.map((dish) => (
                          <option key={dish._id} value={dish._id}>
                            {t(`${TAB}.dishOption`, { name: dish.name, calories: dish.calories })}
                          </option>
                        ))}
                        {row.dishId &&
                          row.source === 'catalog' &&
                          !dishCatalogIds.has(String(row.dishId)) && (
                            <option value={row.dishId}>
                              {row.mealName} — {t(`${TAB}.dishUnavailable`)}
                            </option>
                          )}
                      </select>
                      {(!row.dishId || row.source !== 'catalog') && (
                        <input
                          className="mp-dish-custom-input"
                          value={row.mealName}
                          onChange={(e) => patchEntry(idx, { mealName: e.target.value, dishId: '', source: 'manual' })}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={row.calories}
                      readOnly={Boolean(row.dishId && row.source === 'catalog')}
                      onChange={(e) => patchEntry(idx, { calories: e.target.value })}
                    />
                  </td>
                  <td><input type="time" value={row.mealTime || defaultMealTimeByType(row.mealType)} onChange={(e) => patchEntry(idx, { mealTime: e.target.value })} /></td>
                  <td><input value={Array.isArray(row.ingredients) ? row.ingredients.join(', ') : row.ingredients || ''} onChange={(e) => patchEntry(idx, { ingredients: e.target.value })} /></td>
                  <td>{sourceLabel(row.source, t)}</td>
                  <td><input value={row.nutritionNote || ''} onChange={(e) => patchEntry(idx, { nutritionNote: e.target.value })} /></td>
                  <td><button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mp-toolbar">
            <button type="button" className="mp-btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="mp-btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="mp-list-header">
            <h3 className="mp-draft-title">{t(`${MP}.listTitleMealPlans`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="mp-date-switch">
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="mp-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t(`${TAB}.detailStage`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={5} className="mp-empty">{t(`${MP}.emptyPlans`)}</td></tr>}
              {plans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{careStageLabel(d.careStage, t) || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="mp-btn-sm mp-btn-sm--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--publish" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => deleteDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="mp-btn-sm mp-btn-sm--view" onClick={() => openPlanDetail(d._id)}>
                        {t('common.viewDetails')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!!editingId && (
            <p className="mp-editing-meta">
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
        <div className="mp-modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="mp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="mp-modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="mp-modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailPlan && (
              <div className="mp-modal-body">
                <p className="mp-modal-meta">
                  <strong>{t(`${TAB}.detailTitle`)}:</strong> {detailPlan.title || '—'} · <strong>{t(`${TAB}.detailDate`)}:</strong> {formatLocaleDate((detailPlan.workDate || '').slice(0, 10), i18n.language)} · <strong>{t(`${TAB}.detailStage`)}:</strong> {careStageLabel(detailPlan.careStage, t) || '—'}
                </p>
                <table className="mp-table mp-detail-table">
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
                      <tr><td colSpan={8} className="mp-empty">{t(`${TAB}.emptyDetailMeals`)}</td></tr>
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
  const coverageByResident = useNutritionCoverage(workDate, residents);

  const residentMap = useMemo(
    () => Object.fromEntries(residents.map((r) => [String(r._id), r.fullName || r.residentCode])),
    [residents]
  );

  const specialCoverageBannerItems = useMemo(
    () =>
      selectedResidents
        .map((id) => {
          const info = getResidentCoverage(coverageByResident, id, 'specialDiet');
          if (!info.published) return null;
          const name = residentMap[id] || id;
          const titleSuffix = info.planTitle ? ` (${info.planTitle})` : '';
          return {
            key: id,
            text: t(`${MP}.coverageWarningSpecialDiet`, {
              name,
              publisher: info.publishedByName || '—',
              title: titleSuffix,
            }),
          };
        })
        .filter(Boolean),
    [selectedResidents, coverageByResident, residentMap, t]
  );

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
      setError(resolveApiError(e, t, `${MP}.loadSpecialBootFailed`));
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
    const tpl = templates.find((tp) => tp.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.selectResidents`));
    const eligibleResidents = selectedResidents.filter(
      (id) => !getResidentCoverage(coverageByResident, id, 'specialDiet').published
    );
    if (!eligibleResidents.length) return setError(t(`${MP}.residentsAlreadyPublished`));
    const generated = eligibleResidents.map((residentId) => ({
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
    const rid = selectedResidents[0] || '';
    if (!rid) return setError(t(`${MP}.selectResidentsBeforeManual`));
    if (getResidentCoverage(coverageByResident, rid, 'specialDiet').published) {
      return setError(t(`${MP}.residentsAlreadyPublished`));
    }
    setEntries((prev) => [
      ...prev,
      {
        residentId: rid,
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
      setError(resolveApiError(e, t, `${MP}.saveDraftFailed`));
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
      setWorkDate(clampWorkDate(data.workDate));
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
      setError(resolveApiError(e, t, `${MP}.openDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.publishFailed`));
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
      setError(resolveApiError(e, t, `${MP}.deleteDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closePlanDetail = () => setDetailPlan(null);

  return (
    <div className="mp-page">
      <p className="mp-intro">
        {t(`${TAB}.intro`)}
      </p>
      {error && <p className="mp-error">{error}</p>}
      {loading && <p className="mp-loading">{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="mp-form-grid form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)} *</label>
              <WorkDatePicker value={workDate} onChange={setWorkDate} t={t} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          <SelectedCoverageBanner items={specialCoverageBannerItems} />

          <div className="mp-resident-section">
            <label className="mp-resident-label">{t(`${TAB}.residentsLabel`)} *</label>
            <div className="mp-resident-grid">
              {residents.map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                const dietCoverage = getResidentCoverage(coverageByResident, id, 'specialDiet');
                const covered = dietCoverage.published;
                return (
                  <label
                    key={id}
                    className={`mp-resident-item${covered ? ' mp-resident-item--covered' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={covered}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                    <ResidentCoverageBadge
                      info={dietCoverage}
                      label={t(`${MP}.coverageBadgeSpecialDiet`)}
                      publisherLabel={
                        dietCoverage.publishedByName
                          ? t(`${MP}.coveragePublishedBy`, { name: dietCoverage.publishedByName })
                          : undefined
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mp-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">{t(`${TAB}.selectSpecialTemplate`)}</option>
              {templates.map((tp) => <option key={tp.key} value={tp.key}>{tp.name}</option>)}
            </select>
            <button type="button" className="mp-btn-primary" onClick={addFromTemplate}>+ {t(`${MP}.addFromTemplate`)}</button>
            <button type="button" className="mp-btn-secondary" onClick={addManual}>+ {t(`${MP}.addManual`)}</button>
          </div>

          <table className="mp-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colDietType`)}</th><th>{t(`${TAB}.colRestrictions`)}</th><th>{t(`${TAB}.colGoal`)}</th><th>{t(`${TAB}.colEffectiveTime`)}</th><th>{t(`${TAB}.colSource`)}</th><th>{t(`${TAB}.colNotes`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={8} className="mp-empty">{t(`${TAB}.emptyEntries`)}</td></tr>}
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
                  <td><button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mp-toolbar">
            <button type="button" className="mp-btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="mp-btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="mp-list-header">
            <h3 className="mp-draft-title">{t(`${MP}.listTitleSpecialDiets`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="mp-date-switch">
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="mp-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {plans.length === 0 && <tr><td colSpan={4} className="mp-empty">{t(`${MP}.emptyPlans`)}</td></tr>}
              {plans.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="mp-btn-sm mp-btn-sm--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--publish" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => deleteDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="mp-btn-sm mp-btn-sm--view" onClick={() => openPlanDetail(d._id)}>
                        {t('common.viewDetails')}
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
        <div className="mp-modal-overlay" onClick={!detailLoading ? closePlanDetail : undefined}>
          <div className="mp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="mp-modal-close" onClick={closePlanDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="mp-modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailPlan && (
              <div className="mp-modal-body">
                <p className="mp-modal-meta">
                  <strong>{t(`${TAB}.titleLabel`)}:</strong> {detailPlan.title || '—'} · <strong>{t('common.date')}:</strong> {formatLocaleDate((detailPlan.workDate || '').slice(0, 10), i18n.language)}
                </p>
                <table className="mp-table mp-detail-table">
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
                      <tr><td colSpan={7} className="mp-empty">{t(`${TAB}.emptyDetail`)}</td></tr>
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
  const coverageByResident = useNutritionCoverage(formWorkDate, residents);

  const residentMap = useMemo(
    () => Object.fromEntries(residents.map((r) => [String(r._id), r.fullName || r.residentCode])),
    [residents]
  );

  const scheduleCoverageBannerItems = useMemo(
    () =>
      selectedResidents
        .map((id) => {
          const info = getResidentCoverage(coverageByResident, id, 'mealTimeSchedule');
          if (!info.published) return null;
          const name = residentMap[id] || id;
          const titleSuffix = info.scheduleTitle ? ` (${info.scheduleTitle})` : '';
          return {
            key: id,
            text: t(`${MP}.coverageWarningSchedule`, {
              name,
              publisher: info.publishedByName || '—',
              title: titleSuffix,
            }),
          };
        })
        .filter(Boolean),
    [selectedResidents, coverageByResident, residentMap, t]
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
      setError(resolveApiError(e, t, `${MP}.loadScheduleBootFailed`));
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
    const tpl = templates.find((tp) => tp.key === selectedTemplate);
    if (!tpl) return setError(t(`${MP}.selectTemplate`));
    if (selectedResidents.length < 1) return setError(t(`${MP}.selectResidents`));
    const existing = new Set(entries.map((e) => String(e.residentId)));
    const generated = selectedResidents
      .filter((id) => !existing.has(String(id)))
      .filter((id) => !getResidentCoverage(coverageByResident, id, 'mealTimeSchedule').published)
      .map((residentId) => ({
        residentId,
        breakfastTime: tpl.breakfastTime || defaultMealTimes.breakfast,
        lunchTime: tpl.lunchTime || defaultMealTimes.lunch,
        dinnerTime: tpl.dinnerTime || defaultMealTimes.dinner,
        notes: '',
        source: 'template',
        templateKey: tpl.key,
      }));
    if (!generated.length) return setError(t(`${MP}.residentsAlreadyPublished`));
    setEntries((prev) => [...prev, ...generated]);
  };

  const addManual = () => {
    const rid = selectedResidents[0] || '';
    if (!rid) return setError(t(`${MP}.selectResidentsBeforeManual`));
    if (getResidentCoverage(coverageByResident, rid, 'mealTimeSchedule').published) {
      return setError(t(`${MP}.residentsAlreadyPublished`));
    }
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
      setError(resolveApiError(e, t, `${MP}.saveDraftFailed`));
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
      setFormWorkDate(clampWorkDate(data.workDate));
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
      setError(resolveApiError(e, t, `${MP}.openDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.publishFailed`));
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
      setError(resolveApiError(e, t, `${MP}.deleteDraftFailed`));
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
      setError(resolveApiError(e, t, `${MP}.detailLoadFailed`));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeScheduleDetail = () => setDetailSchedule(null);

  return (
    <div className="mp-page">
      <h2 className="mp-page__title">{t(`${TAB}.title`)}</h2>
      <p className="mp-intro">
        {t(`${TAB}.intro`)}
      </p>
      {error && <p className="mp-error">{error}</p>}
      {loading && <p className="mp-loading">{t('common.loading')}</p>}

      {!loading && (
        <>
          <div className="mp-form-grid form-grid">
            <div className="form-group">
              <label>{t(`${TAB}.workDate`)}</label>
              <WorkDatePicker value={formWorkDate} onChange={setFormWorkDate} t={t} />
            </div>
            <div className="form-group">
              <label>{t(`${TAB}.titleLabel`)}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`${TAB}.titlePlaceholder`)} />
            </div>
          </div>

          <SelectedCoverageBanner items={scheduleCoverageBannerItems} />

          <div className="mp-resident-section">
            <label className="mp-resident-label">{t(`${TAB}.residentsLabel`)} *</label>
            <div className="mp-resident-grid">
              {residents.map((r) => {
                const id = String(r._id);
                const checked = selectedResidents.includes(id);
                const scheduleCoverage = getResidentCoverage(coverageByResident, id, 'mealTimeSchedule');
                const covered = scheduleCoverage.published;
                return (
                  <label
                    key={id}
                    className={`mp-resident-item${covered ? ' mp-resident-item--covered' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={covered}
                      onChange={(e) =>
                        setSelectedResidents((prev) => (e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)))
                      }
                    />{' '}
                    {r.fullName || r.residentCode}
                    <ResidentCoverageBadge
                      info={scheduleCoverage}
                      label={t(`${MP}.coverageBadgeSchedule`)}
                      publisherLabel={
                        scheduleCoverage.publishedByName
                          ? t(`${MP}.coveragePublishedBy`, { name: scheduleCoverage.publishedByName })
                          : undefined
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mp-toolbar">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">{t(`${TAB}.selectPattern`)}</option>
              {templates.map((tp) => (
                <option key={tp.key} value={tp.key}>{tp.name}</option>
              ))}
            </select>
            <button type="button" className="mp-btn-primary" onClick={addFromTemplate}>+ {t(`${MP}.addFromPattern`)}</button>
            <button type="button" className="mp-btn-secondary" onClick={addManual}>+ {t(`${MP}.addManual`)}</button>
          </div>

          <table className="mp-table">
            <thead>
              <tr>
                <th>{t(`${TAB}.colResident`)}</th><th>{t(`${TAB}.colBreakfast`)}</th><th>{t(`${TAB}.colLunch`)}</th><th>{t(`${TAB}.colDinner`)}</th><th>{t(`${TAB}.colNotes`)}</th><th>{t(`${TAB}.colSource`)}</th><th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={7} className="mp-empty">{t(`${TAB}.emptyEntries`)}</td></tr>}
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
                  <td><button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => removeEntry(idx)}>{t('common.delete')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mp-toolbar">
            <button type="button" className="mp-btn-primary" disabled={saving} onClick={saveDraft}>
              {saving ? t('common.saving') : editingId ? t(`${MP}.updateDraft`) : t(`${MP}.saveDraft`)}
            </button>
            <button type="button" className="mp-btn-secondary" onClick={resetForm}>{t(`${MP}.reset`)}</button>
          </div>

          <div className="mp-list-header">
            <h3 className="mp-draft-title">{t(`${MP}.listTitleMealTimes`, { date: formatLocaleDate(listDate, i18n.language) })}</h3>
            <div className="mp-date-switch">
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, -1))}>{t(`${MP}.yesterday`)}</button>
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(today())}>{t('common.today')}</button>
              <input type="date" value={listDate} onChange={(e) => setListDate(e.target.value)} />
              <button type="button" className="mp-btn-secondary" onClick={() => setListDate(addDays(listDate, 1))}>{t(`${MP}.tomorrow`)}</button>
            </div>
          </div>
          <table className="mp-table">
            <thead><tr><th>{t(`${TAB}.titleLabel`)}</th><th>{t('common.date')}</th><th>{t('common.colStatus')}</th><th>{t('common.colActions')}</th></tr></thead>
            <tbody>
              {schedules.length === 0 && <tr><td colSpan={4} className="mp-empty">{t(`${MP}.emptyPlans`)}</td></tr>}
              {schedules.map((d) => (
                <tr key={d._id}>
                  <td>{d.title || '—'}</td>
                  <td>{formatLocaleDate((d.workDate || '').slice(0, 10), i18n.language)}</td>
                  <td>{planStatusLabel(d.status, t)}</td>
                  <td>
                    {d.status === 'draft' ? (
                      <>
                        <button type="button" className="mp-btn-sm mp-btn-sm--edit" onClick={() => openDraft(d._id)}>{t(`${MP}.open`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--publish" onClick={() => publishDraft(d._id)}>{t(`${MP}.publish`)}</button>{' '}
                        <button type="button" className="mp-btn-sm mp-btn-sm--delete" onClick={() => removeDraft(d._id)}>{t('common.delete')}</button>
                      </>
                    ) : (
                      <button type="button" className="mp-btn-sm mp-btn-sm--view" onClick={() => openScheduleDetail(d._id)}>
                        {t('common.viewDetails')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!!editingId && (
            <p className="mp-editing-meta">
              {t(`${MP}.updateDraft`)}: <code>{editingId}</code>
              {entries.length > 0 && (
                <> · {t('common.residents')}: {[...new Set(entries.map((e) => residentMap[e.residentId]).filter(Boolean))].join(', ')}</>
              )}
            </p>
          )}
        </>
      )}

      {(detailLoading || detailSchedule) && (
        <div className="mp-modal-overlay" onClick={!detailLoading ? closeScheduleDetail : undefined}>
          <div className="mp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">{t(`${TAB}.detailPublishedTitle`)}</h3>
              {!detailLoading && (
                <button type="button" className="mp-modal-close" onClick={closeScheduleDetail}>×</button>
              )}
            </div>
            {detailLoading && <p className="mp-modal-loading">{t('common.loading')}</p>}
            {!detailLoading && detailSchedule && (
              <div className="mp-modal-body">
                <p className="mp-modal-meta">
                  <strong>{t(`${TAB}.titleLabel`)}:</strong> {detailSchedule.title || '—'} · <strong>{t('common.date')}:</strong>{' '}
                  {formatLocaleDate((detailSchedule.workDate || '').slice(0, 10), i18n.language)}
                </p>
                <table className="mp-table mp-detail-table">
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
                      <tr><td colSpan={6} className="mp-empty">{t(`${TAB}.emptyDetail`)}</td></tr>
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
    <div className="page card mp-page">
      <h1 className="mp-page__title">{t(`${MP}.title`)}</h1>
      <div className="mp-tabs">
        <button className={`mp-tab-btn ${tab === 'schedule' ? 'mp-tab-btn--active' : ''}`} onClick={() => setTab('schedule')}>
          {t(`${MP}.tabSchedule`)}
        </button>
        <button className={`mp-tab-btn ${tab === 'meal' ? 'mp-tab-btn--active' : ''}`} onClick={() => setTab('meal')}>
          {t(`${MP}.tabMealPlans`)}
        </button>
        <button className={`mp-tab-btn ${tab === 'special' ? 'mp-tab-btn--active' : ''}`} onClick={() => setTab('special')}>
          {t(`${MP}.tabSpecialDiets`)}
        </button>
      </div>

      {tab === 'schedule' && <MealTimeScheduleTab />}
      {tab === 'meal' && <MealPlanTab />}
      {tab === 'special' && <SpecialDietTab />}
    </div>
  );
}
