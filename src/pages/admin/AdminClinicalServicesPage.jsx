import React, { useEffect, useState, useCallback } from 'react';
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
  { value: 'PHYSICAL_EXAM', label: 'Khám tổng quát' },
  { value: 'ECG', label: 'ECG' },
  { value: 'IMAGING', label: 'Hình ảnh' },
  { value: 'LAB_RESULT', label: 'Xét nghiệm' },
  { value: 'COGNITIVE', label: 'Đánh giá nhận thức' },
  { value: 'FUNCTIONAL', label: 'Đánh giá chức năng' },
  { value: 'FALL_RISK', label: 'Đánh giá nguy hiểm rơi' },
  { value: 'NUTRITION', label: 'Đánh giá dinh dưỡng' },
];

const SERVICE_NAME_REGEX = /^[A-Za-zÀ-ỹ0-9\s(),.+\/\-]+$/;

export default function AdminClinicalServicesPage() {
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
      return `Trường "${field.label}" không thể vừa dùng ngưỡng chung vừa dùng ngưỡng riêng cho nam/nữ.`;
    }

    if (hasMale || hasFemale) {
      const maleMin = field.maleMin === '' || field.maleMin === undefined || field.maleMin === null ? null : Number(field.maleMin);
      const maleMax = field.maleMax === '' || field.maleMax === undefined || field.maleMax === null ? null : Number(field.maleMax);
      const femaleMin = field.femaleMin === '' || field.femaleMin === undefined || field.femaleMin === null ? null : Number(field.femaleMin);
      const femaleMax = field.femaleMax === '' || field.femaleMax === undefined || field.femaleMax === null ? null : Number(field.femaleMax);

      if (maleMin === null || maleMax === null || femaleMin === null || femaleMax === null) {
        return `Trường "${field.label}" khi dùng ngưỡng riêng cho nam/nữ cần nhập đầy đủ Min/Max cho cả nam và nữ.`;
      }

      if ([maleMin, maleMax, femaleMin, femaleMax].some((value) => Number.isNaN(value) || value <= 1)) {
        return `Trường "${field.label}" cần có giá trị ngưỡng riêng lớn hơn 1.`;
      }

      if (maleMin >= maleMax || femaleMin >= femaleMax) {
        return `Trường "${field.label}" có Min lớn hơn hoặc bằng Max.`;
      }
    }

    if (hasCommon) {
      const min = field.min === '' || field.min === undefined || field.min === null ? null : Number(field.min);
      const max = field.max === '' || field.max === undefined || field.max === null ? null : Number(field.max);
      if (min === null || max === null) {
        return `Trường "${field.label}" khi dùng ngưỡng chung cần nhập đầy đủ Min chung và Max chung.`;
      }
      if ([min, max].some((value) => Number.isNaN(value) || value <= 1)) {
        return `Trường "${field.label}" cần có giá trị ngưỡng chung lớn hơn 1.`;
      }
      if (min >= max) {
        return `Trường "${field.label}" có Min chung lớn hơn hoặc bằng Max chung.`;
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
      setError(err.response?.data?.message || 'Không thể tải danh sách dịch vụ.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError('Vui lòng nhập mã dịch vụ.');
      return;
    }
    if (!formData.serviceName?.trim()) {
      setError('Vui lòng nhập tên dịch vụ.');
      return;
    }
    if (!SERVICE_NAME_REGEX.test(formData.serviceName.trim())) {
      setError('Tên dịch vụ chỉ được chứa chữ, số, khoảng trắng và ký tự (),.+/-');
      return;
    }
    if (!formData.category) {
      setError('Vui lòng chọn danh mục.');
      return;
    }
    if (formData.unitPrice === '' || formData.unitPrice < 0) {
      setError('Vui lòng nhập đơn giá hợp lệ.');
      return;
    }
    if (formData.fields && formData.fields.length > 0) {
      const codes = new Set();
      for (const [index, field] of formData.fields.entries()) {
        if (!field.label?.trim()) {
          setError(`Vui lòng nhập nhãn cho trường thứ ${index + 1}.`);
          return;
        }
        if (!field.fieldCode?.trim()) {
          setError(`Vui lòng nhập mã trường cho "${field.label}".`);
          return;
        }
        if (codes.has(field.fieldCode)) {
          setError(`Mã trường "${field.fieldCode}" bị trùng. Vui lòng đổi lại.`);
          return;
        }
        if (field.type === 'NUMBER') {
          const thresholds = [
            ['Min chung', field.min],
            ['Max chung', field.max],
            ['Min nam', field.maleMin],
            ['Max nam', field.maleMax],
            ['Min nữ', field.femaleMin],
            ['Max nữ', field.femaleMax],
          ];
          for (const [label, value] of thresholds) {
            if (value !== '' && value !== undefined && value !== null && Number.isNaN(Number(value))) {
              setError(`Giá trị ${label} phải là số hợp lệ cho trường "${field.label}".`);
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
            setError(`Vui lòng nhập ít nhất một lựa chọn cho Dropdown "${field.label}".`);
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
        setSuccess('Cập nhật dịch vụ thành công!');
      } else {
        await clinicalServiceService.createService(formData);
        setSuccess('Tạo dịch vụ mới thành công!');
      }

      loadServices();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể lưu dịch vụ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa dịch vụ này không?')) return;

    try {
      setError('');
      await clinicalServiceService.deleteService(id);
      setSuccess('Xóa dịch vụ thành công!');
      loadServices();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể xóa dịch vụ.');
    }
  };

  const handleReopen = async (service) => {
    if (!window.confirm('Bạn có chắc muốn mở lại dịch vụ này không?')) return;

    try {
      setError('');
      await clinicalServiceService.updateService(service._id, {
        ...service,
        active: true,
      });
      setSuccess('Mở lại dịch vụ thành công!');
      loadServices();
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể mở lại dịch vụ.');
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
            <DollarSign size={28} /> Quản lý Dịch vụ Lâm sàng
          </h1>
          <p>Quản lý danh mục dịch vụ và đơn giá.</p>
        </div>
        <div className="adm-header__buttons">
          <button className="adm-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> Thêm dịch vụ
          </button>
          <button className="adm-btn-refresh" onClick={loadServices}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {error && <div className="adm-error-banner">{error}</div>}
      {success && <div className="adm-success-banner">{success}</div>}

      {showModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>{editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</h2>
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
                <label>Mã dịch vụ *</label>
                <input
                  type="text"
                  placeholder="VD: ECG_12LEAD, X_RAY_CHEST"
                  value={formData.serviceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceCode: e.target.value })
                  }
                  className="adm-form-input"
                  disabled={!!editingId}
                />
                {editingId && (
                  <small style={{ color: '#6b7280' }}>
                    (Không thể thay đổi mã dịch vụ đã tồn tại)
                  </small>
                )}
              </div>
              <div className="adm-form-group">
                <label>Tên dịch vụ *</label>
                <input
                  type="text"
                  placeholder="VD: ECG 12 Leads"
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
                <label>Danh mục *</label>
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
                  <option value="">-- Chọn danh mục --</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-form-group">
                <label>Mô tả</label>
                <textarea
                  placeholder="Mô tả chi tiết dịch vụ"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="adm-form-input"
                  rows="3"
                />
              </div>

              <div className="adm-form-group">
                <label>Trường dịch vụ bổ sung</label>
                {formData.fields.map((field, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 240px' }}>
                        <label className="adm-form-label">Nhãn</label>
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
                        <label className="adm-form-label">Mã trường</label>
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
                        <label className="adm-form-label">Loại</label>
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
                          <option value="TEXT">Văn bản</option>
                          <option value="NUMBER">Số</option>
                          <option value="DROPDOWN">Dropdown</option>
                          <option value="IMAGE">Ảnh URL</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 180px' }}>
                        <label className="adm-form-label">Placeholder</label>
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
                          Xóa trường
                        </button>
                      </div>
                    </div>
                    {field.type === 'NUMBER' && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ flex: '1 1 180px' }}>
                            <label className="adm-form-label">Min chung</label>
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
                            <label className="adm-form-label">Max chung</label>
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
                            <label className="adm-form-label">Min nam</label>
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
                            <label className="adm-form-label">Max nam</label>
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
                            <label className="adm-form-label">Min nữ</label>
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
                            <label className="adm-form-label">Max nữ</label>
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
                        <label className="adm-form-label">Lựa chọn (phân tách bằng dấu phẩy)</label>
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
                          placeholder="VD: Bình thường, Bất thường, Chưa xác định"
                        />
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <label className="adm-form-label">Bắt buộc</label>
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
                  + Thêm trường
                </button>
              </div>

              <div className="adm-form-group">
                <label>Đơn giá (VND) *</label>
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
                  Kích hoạt
                </label>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                className="adm-btn-secondary"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="adm-btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-filters">
        <input
          type="text"
          placeholder="Tìm theo mã hoặc tên dịch vụ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-filter-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="adm-filter-select"
        >
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Mã dịch vụ</th>
              <th>Tên dịch vụ</th>
              <th>Danh mục</th>
              <th>Ngày tạo</th>
              <th>Đơn giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Đang tải...
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  Không có dịch vụ nào.
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
                    <td>{category?.label || service.category}</td>
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
                          <CheckCircle size={16} style={{ display: 'inline' }} /> Kích
                          hoạt
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>
                          <AlertCircle size={16} style={{ display: 'inline' }} /> Vô
                          hiệu
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="adm-btn-small"
                        onClick={() => handleOpenModal(service)}
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={14} />
                      </button>
                      {service.active ? (
                        <button
                          className="adm-btn-small adm-btn-danger"
                          onClick={() => handleDelete(service._id)}
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          className="adm-btn-small adm-btn-secondary"
                          onClick={() => handleReopen(service)}
                          title="Mở lại"
                        >
                          Mở lại
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
