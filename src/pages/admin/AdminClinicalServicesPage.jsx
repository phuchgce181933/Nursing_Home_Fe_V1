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
    });
    setEditingId(null);
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setFormData(service);
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
    if (!formData.category) {
      setError('Vui lòng chọn danh mục.');
      return;
    }
    if (formData.unitPrice === '' || formData.unitPrice < 0) {
      setError('Vui lòng nhập đơn giá hợp lệ.');
      return;
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
        <div className="adm-modal-overlay" onClick={handleCloseModal}>
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
                      // If creating new and serviceCode is empty or was auto-generated from category, update it
                      const shouldUpdateCode = !editingId && (!prev.serviceCode || (prev.category && prev.serviceCode.startsWith(prev.category + '_')));
                      return {
                        ...prev,
                        serviceName: nextName,
                        serviceCode: shouldUpdateCode ? generateServiceCode(prev.category, nextName) : prev.serviceCode,
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
              <th>Đơn giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  Đang tải...
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
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
                      <button
                        className="adm-btn-small adm-btn-danger"
                        onClick={() => handleDelete(service._id)}
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
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
