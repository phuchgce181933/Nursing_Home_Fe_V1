import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import clinicalServiceService from '../../services/clinicalService.service';
import '../../styles/admin/AdminCommon.css';

const CATEGORIES = [
  { value: 'PHYSICAL_EXAM', i18nKey: 'adminClinicalServices.catPhysicalExam' },
  { value: 'ECG', i18nKey: 'adminClinicalServices.catEcg' },
  { value: 'IMAGING', i18nKey: 'adminClinicalServices.catImaging' },
  { value: 'LAB_RESULT', i18nKey: 'adminClinicalServices.catLabResult' },
  { value: 'COGNITIVE', i18nKey: 'adminClinicalServices.catCognitive' },
  { value: 'FUNCTIONAL', i18nKey: 'adminClinicalServices.catFunctional' },
  { value: 'FALL_RISK', i18nKey: 'adminClinicalServices.catFallRisk' },
  { value: 'NUTRITION', i18nKey: 'adminClinicalServices.catNutrition' },
];

const SERVICE_NAME_REGEX = /^[A-Za-zÀ-ỹ0-9\s(),.+\/\-]+$/;

export default function AdminClinicalServicesPage() {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceCode: '',
    serviceName: '',
    category: '',
    description: '',
    unitPrice: '',
    active: true,
    fields: [],
  });

  const generateServiceCode = (category, name) => {
    if (!category) return '';
    const slug = (name || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
    const base = slug ? `${category}_${slug}` : `${category}_${Date.now().toString().slice(-5)}`;
    return base.slice(0, 40);
  };

  const createEmptyField = () => ({
    fieldCode: '',
    label: '',
    type: 'TEXT',
    placeholder: '',
    required: false,
    min: '',
    max: '',
    maleMin: '',
    maleMax: '',
    femaleMin: '',
    femaleMax: '',
    options: [],
  });

  const slugifyFieldCode = (label) =>
    (label || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .slice(0, 40);

  const validateFieldThresholds = (field) => {
    const hasCommon =
      (field.min !== '' && field.min !== undefined && field.min !== null) ||
      (field.max !== '' && field.max !== undefined && field.max !== null);
    const hasMale =
      (field.maleMin !== '' && field.maleMin !== undefined && field.maleMin !== null) ||
      (field.maleMax !== '' && field.maleMax !== undefined && field.maleMax !== null);
    const hasFemale =
      (field.femaleMin !== '' && field.femaleMin !== undefined && field.femaleMin !== null) ||
      (field.femaleMax !== '' && field.femaleMax !== undefined && field.femaleMax !== null);

    if (hasCommon && (hasMale || hasFemale)) {
      return t('adminClinicalServices.validationMixedThresholds', { label: field.label });
    }

    if (hasMale || hasFemale) {
      const maleMin = field.maleMin === '' || field.maleMin === undefined || field.maleMin === null ? null : Number(field.maleMin);
      const maleMax = field.maleMax === '' || field.maleMax === undefined || field.maleMax === null ? null : Number(field.maleMax);
      const femaleMin = field.femaleMin === '' || field.femaleMin === undefined || field.femaleMin === null ? null : Number(field.femaleMin);
      const femaleMax = field.femaleMax === '' || field.femaleMax === undefined || field.femaleMax === null ? null : Number(field.femaleMax);

      if (maleMin === null || maleMax === null || femaleMin === null || femaleMax === null) {
        return t('adminClinicalServices.validationGenderThresholdsIncomplete', { label: field.label });
      }

      if ([maleMin, maleMax, femaleMin, femaleMax].some((value) => Number.isNaN(value) || value <= 1)) {
        return t('adminClinicalServices.validationGenderThresholdsAbove1', { label: field.label });
      }

      if (maleMin >= maleMax || femaleMin >= femaleMax) {
        return t('adminClinicalServices.validationGenderMinMax', { label: field.label });
      }
    }

    if (hasCommon) {
      const min = field.min === '' || field.min === undefined || field.min === null ? null : Number(field.min);
      const max = field.max === '' || field.max === undefined || field.max === null ? null : Number(field.max);
      if (min === null || max === null) {
        return t('adminClinicalServices.validationCommonThresholdsIncomplete', { label: field.label });
      }
      if ([min, max].some((value) => Number.isNaN(value) || value <= 1)) {
        return t('adminClinicalServices.validationCommonThresholdsAbove1', { label: field.label });
      }
      if (min >= max) {
        return t('adminClinicalServices.validationCommonMinMax', { label: field.label });
      }
    }

    return null;
  };

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await clinicalServiceService.listServices({
        page: 1,
        limit: 500,
      });
      setServices(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminClinicalServices.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const clearForm = () => {
    setFormData({
      serviceCode: '',
      serviceName: '',
      category: '',
      description: '',
      unitPrice: '',
      active: true,
      fields: [],
    });
    setEditingId(null);
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setFormData({
        ...service,
        unitPrice: service.unitPrice || 0,
        fields: Array.isArray(service.fields) ? service.fields : [],
      });
      setEditingId(service._id);
    } else {
      clearForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    clearForm();
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.serviceCode?.trim()) {
      setError(t('adminClinicalServices.validationServiceCode'));
      return;
    }
    if (!formData.serviceName?.trim()) {
      setError(t('adminClinicalServices.validationServiceName'));
      return;
    }
    if (!SERVICE_NAME_REGEX.test(formData.serviceName.trim())) {
      setError(t('adminClinicalServices.validationServiceNameChars'));
      return;
    }
    if (!formData.category) {
      setError(t('adminClinicalServices.validationCategory'));
      return;
    }
    if (formData.unitPrice === '' || formData.unitPrice < 0) {
      setError(t('adminClinicalServices.validationUnitPrice'));
      return;
    }
    if (formData.fields && formData.fields.length > 0) {
      const codes = new Set();
      for (const [index, field] of formData.fields.entries()) {
        if (!field.label?.trim()) {
          setError(t('adminClinicalServices.validationFieldLabel', { index: index + 1 }));
          return;
        }
        if (!field.fieldCode?.trim()) {
          setError(t('adminClinicalServices.validationFieldCode', { label: field.label }));
          return;
        }
        if (codes.has(field.fieldCode)) {
          setError(t('adminClinicalServices.validationFieldCodeDuplicate', { code: field.fieldCode }));
          return;
        }
        if (field.type === 'NUMBER') {
          const thresholds = [
            ['adminClinicalServices.thresholdMinCommon', field.min],
            ['adminClinicalServices.thresholdMaxCommon', field.max],
            ['adminClinicalServices.thresholdMinMale', field.maleMin],
            ['adminClinicalServices.thresholdMaxMale', field.maleMax],
            ['adminClinicalServices.thresholdMinFemale', field.femaleMin],
            ['adminClinicalServices.thresholdMaxFemale', field.femaleMax],
          ];
          for (const [thresholdKey, value] of thresholds) {
            if (value !== '' && value !== undefined && value !== null && Number.isNaN(Number(value))) {
              setError(t('adminClinicalServices.validationThresholdNotNumber', { label: t(thresholdKey), field: field.label }));
              return;
            }
          }

          const validationError = validateFieldThresholds(field);
          if (validationError) {
            setError(validationError);
            return;
          }
        }
        if (field.type === 'DROPDOWN') {
          const options = Array.isArray(field.options) ? field.options.filter(Boolean) : [];
          if (options.length === 0) {
            setError(t('adminClinicalServices.validationDropdownOptions', { label: field.label }));
            return;
          }
        }
        codes.add(field.fieldCode);
      }
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingId) {
        await clinicalServiceService.updateService(editingId, formData);
        setSuccess(t('adminClinicalServices.successUpdate'));
      } else {
        await clinicalServiceService.createService(formData);
        setSuccess(t('adminClinicalServices.successCreate'));
      }

      loadServices();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminClinicalServices.errorSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminClinicalServices.confirmDelete'))) return;

    try {
      setError('');
      await clinicalServiceService.deleteService(id);
      setSuccess(t('adminClinicalServices.successDelete'));
      loadServices();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminClinicalServices.errorDelete'));
    }
  };

  const handleReopen = async (service) => {
    if (!window.confirm(t('adminClinicalServices.confirmReopen'))) return;

    try {
      setError('');
      await clinicalServiceService.updateService(service._id, {
        ...service,
        active: true,
      });
      setSuccess(t('adminClinicalServices.successReopen'));
      loadServices();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('adminClinicalServices.errorReopen'));
    }
  };

  const filteredServices = services.filter((s) => {
    const matchSearch =
      s.serviceCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.serviceName?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="adm-container">
      <div className="adm-header">
        <div>
          <h1>
            <DollarSign size={28} /> {t('adminClinicalServices.pageTitle')}
          </h1>
          <p>{t('adminClinicalServices.pageSubtitle')}</p>
        </div>
        <div className="adm-header__buttons">
          <button className="adm-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> {t('adminClinicalServices.btnAdd')}
          </button>
          <button className="adm-btn-refresh" onClick={loadServices}>
            <RefreshCw size={16} /> {t('adminClinicalServices.btnRefresh')}
          </button>
        </div>
      </div>

      {error && <div className="adm-error-banner">{error}</div>}
      {success && <div className="adm-success-banner">{success}</div>}

      {showModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>{editingId ? t('adminClinicalServices.modalEditTitle') : t('adminClinicalServices.modalAddTitle')}</h2>
              <button
                className="adm-btn-close"
                onClick={handleCloseModal}
                disabled={submitting}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            {/* Show error/success inside modal so they are visible above overlay */}
            {(error || success) && (
              <div style={{ padding: '0 24px 12px' }}>
                {error && <div className="adm-error-banner">{error}</div>}
                {success && <div className="adm-success-banner">{success}</div>}
              </div>
            )}
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelServiceCode')}</label>
                <input
                  type="text"
                  placeholder={t('adminClinicalServices.placeholderServiceCode')}
                  value={formData.serviceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceCode: e.target.value })
                  }
                  className="adm-form-input"
                  disabled={!!editingId}
                />
                {editingId && (
                  <small style={{ color: '#6b7280' }}>
                    {t('adminClinicalServices.noteCannotChangeCode')}
                  </small>
                )}
              </div>
              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelServiceName')}</label>
                <input
                  type="text"
                  placeholder={t('adminClinicalServices.placeholderServiceName')}
                  value={formData.serviceName}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextName = e.target.value;
                      const normalizedName = nextName.replace(/[^A-Za-zÀ-ỹ0-9\s(),.+\/\-]/g, '');
                      // If creating new and serviceCode is empty or was auto-generated from category, update it
                      const shouldUpdateCode = !editingId && (!prev.serviceCode || (prev.category && prev.serviceCode.startsWith(prev.category + '_')));
                      return {
                        ...prev,
                        serviceName: normalizedName,
                        serviceCode: shouldUpdateCode ? generateServiceCode(prev.category, normalizedName) : prev.serviceCode,
                      };
                    })
                  }
                  className="adm-form-input"
                />
              </div>
              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelCategory')}</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextCat = e.target.value;
                      const shouldAuto = !editingId && (!prev.serviceCode || (prev.category && prev.serviceCode.startsWith(prev.category + '_')));
                      return {
                        ...prev,
                        category: nextCat,
                        serviceCode: shouldAuto ? generateServiceCode(nextCat, prev.serviceName) : prev.serviceCode,
                      };
                    })
                  }
                  className="adm-form-input"
                  disabled={!!editingId}
                >
                  <option value="">{t('adminClinicalServices.optionSelectCategory')}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {t(cat.i18nKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelDescription')}</label>
                <textarea
                  placeholder={t('adminClinicalServices.placeholderDescription')}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="adm-form-input"
                  rows="3"
                />
              </div>

              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelAdditionalFields')}</label>
                {formData.fields.map((field, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 240px' }}>
                        <label className="adm-form-label">{t('adminClinicalServices.labelFieldLabel')}</label>
                        <input
                          type="text"
                          className="adm-form-input"
                          value={field.label}
                          onChange={(e) => {
                            const nextFields = [...formData.fields];
                            nextFields[idx] = {
                              ...nextFields[idx],
                              label: e.target.value,
                              fieldCode: nextFields[idx].fieldCode || slugifyFieldCode(e.target.value),
                            };
                            setFormData({ ...formData, fields: nextFields });
                          }}
                        />
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label className="adm-form-label">{t('adminClinicalServices.labelFieldCode')}</label>
                        <input
                          type="text"
                          className="adm-form-input"
                          value={field.fieldCode}
                          onChange={(e) => {
                            const nextFields = [...formData.fields];
                            nextFields[idx] = { ...nextFields[idx], fieldCode: e.target.value.toUpperCase().trim().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') };
                            setFormData({ ...formData, fields: nextFields });
                          }}
                          placeholder="VD: PAIN_LOCATION"
                        />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <label className="adm-form-label">{t('adminClinicalServices.labelFieldType')}</label>
                        <select
                          className="adm-form-input"
                          value={field.type}
                          onChange={(e) => {
                            const nextFields = [...formData.fields];
                            nextFields[idx] = {
                              ...nextFields[idx],
                              type: e.target.value,
                              min: e.target.value === 'NUMBER' ? nextFields[idx].min : '',
                              max: e.target.value === 'NUMBER' ? nextFields[idx].max : '',
                              maleMin: e.target.value === 'NUMBER' ? nextFields[idx].maleMin : '',
                              maleMax: e.target.value === 'NUMBER' ? nextFields[idx].maleMax : '',
                              femaleMin: e.target.value === 'NUMBER' ? nextFields[idx].femaleMin : '',
                              femaleMax: e.target.value === 'NUMBER' ? nextFields[idx].femaleMax : '',
                              options: e.target.value === 'DROPDOWN' ? nextFields[idx].options : [],
                            };
                            setFormData({ ...formData, fields: nextFields });
                          }}
                        >
                          <option value="TEXT">{t('adminClinicalServices.typeText')}</option>
                          <option value="NUMBER">{t('adminClinicalServices.typeNumber')}</option>
                          <option value="DROPDOWN">{t('adminClinicalServices.typeDropdown')}</option>
                          <option value="IMAGE">{t('adminClinicalServices.typeImage')}</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label className="adm-form-label">{t('adminClinicalServices.labelFieldPlaceholder')}</label>
                        <input
                          type="text"
                          className="adm-form-input"
                          value={field.placeholder}
                          onChange={(e) => {
                            const nextFields = [...formData.fields];
                            nextFields[idx] = { ...nextFields[idx], placeholder: e.target.value };
                            setFormData({ ...formData, fields: nextFields });
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <label className="adm-form-label" style={{ visibility: 'hidden' }}>&nbsp;</label>
                        <button
                          type="button"
                          className="adm-btn-secondary"
                          onClick={() => {
                            const nextFields = [...formData.fields];
                            nextFields.splice(idx, 1);
                            setFormData({ ...formData, fields: nextFields });
                          }}
                        >
                          {t('adminClinicalServices.btnDeleteField')}
                        </button>
                      </div>
                    </div>
                    {field.type === 'NUMBER' && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMinCommon')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.min}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], min: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMaxCommon')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.max}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], max: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMinMale')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.maleMin}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], maleMin: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMaxMale')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.maleMax}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], maleMax: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMinFemale')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.femaleMin}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], femaleMin: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">{t('adminClinicalServices.labelMaxFemale')}</label>
                            <input
                              type="number"
                              className="adm-form-input"
                              value={field.femaleMax}
                              onChange={(e) => {
                                const nextFields = [...formData.fields];
                                nextFields[idx] = { ...nextFields[idx], femaleMax: e.target.value };
                                setFormData({ ...formData, fields: nextFields });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {field.type === 'DROPDOWN' && (
                      <div style={{ marginTop: 10 }}>
                        <label className="adm-form-label">{t('adminClinicalServices.labelDropdownOptions')}</label>
                        <textarea
                          className="adm-form-input"
                          rows={2}
                          value={(Array.isArray(field.options) ? field.options : []).join(', ')}
                          onChange={(e) => {
                            const nextFields = [...formData.fields];
                            nextFields[idx] = {
                              ...nextFields[idx],
                              options: e.target.value
                                .split(',')
                                .map((opt) => opt.trim())
                                .filter(Boolean),
                            };
                            setFormData({ ...formData, fields: nextFields });
                          }}
                          placeholder={t('adminClinicalServices.placeholderDropdownOptions')}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <label className="adm-form-label">{t('adminClinicalServices.labelRequired')}</label>
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => {
                          const nextFields = [...formData.fields];
                          nextFields[idx] = { ...nextFields[idx], required: e.target.checked };
                          setFormData({ ...formData, fields: nextFields });
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="adm-btn-secondary"
                  onClick={() => setFormData({ ...formData, fields: [...(formData.fields || []), createEmptyField()] })}
                >
                  {t('adminClinicalServices.btnAddField')}
                </button>
              </div>

              <div className="adm-form-group">
                <label>{t('adminClinicalServices.labelUnitPrice')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="adm-form-input"
                  min="0"
                  step="1000"
                />
              </div>
              <div className="adm-form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                  />
                  {t('adminClinicalServices.labelActive')}
                </label>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                className="adm-btn-secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                {t('adminClinicalServices.btnCancel')}
              </button>
              <button
                className="adm-btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting ? t('adminClinicalServices.btnSaving') : t('adminClinicalServices.btnSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-filters">
        <input
          type="text"
          placeholder={t('adminClinicalServices.placeholderSearch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-filter-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="adm-filter-select"
        >
          <option value="">{t('adminClinicalServices.optionAllCategories')}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {t(cat.i18nKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t('adminClinicalServices.colServiceCode')}</th>
              <th>{t('adminClinicalServices.colServiceName')}</th>
              <th>{t('adminClinicalServices.colCategory')}</th>
              <th>{t('adminClinicalServices.colCreatedAt')}</th>
              <th>{t('adminClinicalServices.colUnitPrice')}</th>
              <th>{t('adminClinicalServices.colStatus')}</th>
              <th>{t('adminClinicalServices.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  {t('adminClinicalServices.statusLoading')}
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  {t('adminClinicalServices.statusEmpty')}
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => {
                const category = CATEGORIES.find((c) => c.value === service.category);
                return (
                  <tr key={service._id}>
                    <td>
                      <code style={{ fontSize: '12px' }}>{service.serviceCode}</code>
                    </td>
                    <td>{service.serviceName}</td>
                    <td>{category ? t(category.i18nKey) : service.category}</td>
                    <td>{service.createdAt ? new Date(service.createdAt).toLocaleDateString('vi-VN') : '---'}</td>
                    <td style={{ fontWeight: '600', color: '#059669' }}>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(service.unitPrice || 0)}
                    </td>
                    <td>
                      {service.active ? (
                        <span style={{ color: '#10b981' }}>
                          <CheckCircle size={16} style={{ display: 'inline' }} /> {t('adminClinicalServices.statusActive')}
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>
                          <AlertCircle size={16} style={{ display: 'inline' }} /> {t('adminClinicalServices.statusInactive')}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="adm-btn-small"
                        onClick={() => handleOpenModal(service)}
                        title={t('adminClinicalServices.titleEdit')}
                      >
                        <Edit2 size={14} />
                      </button>
                      {service.active ? (
                        <button
                          className="adm-btn-small adm-btn-danger"
                          onClick={() => handleDelete(service._id)}
                          title={t('adminClinicalServices.titleDelete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          className="adm-btn-small adm-btn-secondary"
                          onClick={() => handleReopen(service)}
                          title={t('adminClinicalServices.titleReopen')}
                        >
                          {t('adminClinicalServices.btnReopen')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
