import React, { useEffect, useState, useMemo } from 'react';
import { User, FileText, Heart, Users, RotateCcw, Save, Check, Eye, Edit3 } from 'lucide-react';
import RepresentativeForm from './RepresentativeForm';
import HealthInfoForm from './HealthInfoForm';
import EmergencyContactsForm from './EmergencyContactsForm';

/**
 * ContractEditor - Editor chia theo từng section.
 *
 * Mỗi section có nút "Lưu" riêng. Khi lưu, section được đánh dấu đã hoàn tất.
 *
 * Lưu ý: Phần chọn Gói dịch vụ + Phân bổ phòng/giường đã được tách ra làm
 * section riêng phía trên modal (trước editor) để tránh trùng lặp UI.
 * Component này chỉ quản lý 3 mục: Thông tin các bên, Sức khỏe, Liên hệ khẩn cấp.
 *
 * Props:
 *  - admission
 *  - servicePackage
 *  - form: { representative, health, contacts, savedSections }
 *  - onChange: callback nhận form mới
 *  - onOpenPreview: callback khi click "Xem trước hợp đồng"
 *  - onSyncEmergencyContacts, syncStatus
 */
const TABS = [
  { id: 'representative', label: 'Thông tin các bên', icon: User, saveLabel: 'Lưu thông tin các bên' },
  { id: 'health', label: 'Sức khỏe người cao tuổi', icon: Heart, saveLabel: 'Lưu thông tin sức khỏe' },
  { id: 'contacts', label: 'Liên hệ khẩn cấp', icon: Users, saveLabel: 'Lưu liên hệ khẩn cấp' },
];

export default function ContractEditor({
  admission,
  form,
  onChange,
  onOpenPreview,
  onSyncEmergencyContacts,
  syncStatus,
}) {
  const [activeTab, setActiveTab] = useState('representative');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const setRepresentative = (rep) => onChange({ ...form, representative: rep });
  const setHealth = (h) => onChange({ ...form, health: h });
  const setContacts = (c) => onChange({ ...form, contacts: c });

  // Validate required fields per section
  const validateSection = (sectionId) => {
    const errors = [];
    if (sectionId === 'representative') {
      const rep = form.representative || {};
      if (!rep.fullName?.trim()) errors.push('Họ và tên người đại diện');
      if (!rep.relationship?.trim()) errors.push('Quan hệ');
      if (!rep.phone?.trim()) errors.push('Số điện thoại');
    } else if (sectionId === 'health') {
      // Health is mostly optional, just need at least one piece of info
      const h = form.health || {};
      const hasAny = h.medicalHistory || h.currentIllness || h.allergies || h.medications || h.diet;
      if (!hasAny) errors.push('ít nhất 1 thông tin sức khỏe');
    } else if (sectionId === 'contacts') {
      const contacts = form.contacts || [];
      if (contacts.length === 0) errors.push('ít nhất 1 người liên hệ');
      contacts.forEach((c, i) => {
        if (!c.fullName?.trim()) errors.push(`Liên hệ #${i + 1}: thiếu họ tên`);
        if (!c.relationship?.trim()) errors.push(`Liên hệ #${i + 1}: thiếu quan hệ`);
        if (!c.phone?.trim()) errors.push(`Liên hệ #${i + 1}: thiếu SĐT`);
      });
    }
    return errors;
  };

  const handleSaveSection = (sectionId) => {
    const errors = validateSection(sectionId);
    if (errors.length > 0) {
      // Show inline validation
      return { ok: false, errors };
    }
    const savedSections = { ...(form.savedSections || {}) };
    savedSections[sectionId] = true;
    onChange({ ...form, savedSections });
    setLastSavedAt({ section: sectionId, at: Date.now() });
    return { ok: true };
  };

  const handleEditSection = (sectionId) => {
    const savedSections = { ...(form.savedSections || {}) };
    savedSections[sectionId] = false;
    onChange({ ...form, savedSections });
  };

  // Summary: count filled fields per section
  const filledSummary = useMemo(() => {
    const rep = form.representative || {};
    const health = form.health || {};
    const contacts = form.contacts || [];
    const repCount = [rep.fullName, rep.phone, rep.relationship].filter(Boolean).length;
    const healthCount = [health.medicalHistory, health.allergies, health.medications].filter(Boolean).length;
    return { repCount, healthCount, contactCount: contacts.length };
  }, [form]);

  const savedSections = form.savedSections || {};
  const allSaved = TABS.every((t) => savedSections[t.id]);

  return (
    <div className="ctc-editor">
      {/* Tab navigation */}
      <nav className="ctc-tabs" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isSaved = savedSections[tab.id];
          let badge = null;
          if (tab.id === 'representative') badge = filledSummary.repCount;
          else if (tab.id === 'health') badge = filledSummary.healthCount;
          else if (tab.id === 'contacts') badge = filledSummary.contactCount;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ctc-tab${isActive ? ' ctc-tab--active' : ''}${isSaved ? ' ctc-tab--saved' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isSaved ? <Check size={14} /> : <Icon size={14} />}
              <span>{tab.label}</span>
              {badge > 0 && !isSaved && <span className="ctc-tab-badge">{badge}</span>}
              {isSaved && <span className="ctc-tab-checkmark" aria-label="Đã lưu">✓</span>}
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <div className="ctc-tab-content">
        {TABS.map((tab) => {
          if (activeTab !== tab.id) return null;
          const isSaved = savedSections[tab.id];
          return (
            <div key={tab.id} className="ctc-section-wrapper">
              <SectionSaveHeader
                tab={tab}
                isSaved={isSaved}
                lastSavedAt={lastSavedAt}
                onSave={() => handleSaveSection(tab.id)}
                onEdit={() => handleEditSection(tab.id)}
                validateFn={() => validateSection(tab.id)}
                validationSignature={JSON.stringify(form[tab.id === 'contacts' ? 'contacts' : tab.id] || {})}
              />

              <div className={isSaved ? 'ctc-section-readonly' : ''}>
                {tab.id === 'representative' && (
                  <RepresentativeForm
                    representative={form.representative}
                    onChange={isSaved ? () => {} : setRepresentative}
                    admission={admission}
                    readOnly={isSaved}
                  />
                )}
                {tab.id === 'health' && (
                  <HealthInfoForm
                    health={form.health}
                    onChange={isSaved ? () => {} : setHealth}
                    applicant={admission?.applicant}
                    readOnly={isSaved}
                  />
                )}
                {tab.id === 'contacts' && (
                  <EmergencyContactsForm
                    value={form.contacts}
                    onChange={isSaved ? () => {} : setContacts}
                    maxContacts={3}
                    onSyncToResident={isSaved ? null : onSyncEmergencyContacts}
                    syncStatus={syncStatus}
                    readOnly={isSaved}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Footer actions */}
        <div className="ctc-editor-footer">
          <div className="ctc-editor-progress">
            {TABS.map((t) => (
              <span
                key={t.id}
                className={`ctc-progress-dot${savedSections[t.id] ? ' ctc-progress-dot--done' : ''}`}
                title={t.label}
              />
            ))}
            <span className="ctc-progress-text">
              {Object.values(savedSections).filter(Boolean).length}/{TABS.length} mục đã lưu
            </span>
          </div>
          <button
            type="button"
            className="ctc-btn ctc-btn--primary ctc-btn--lg"
            onClick={onOpenPreview}
            disabled={!allSaved}
            title={allSaved ? 'Mở bản xem trước để kiểm tra trước khi tạo hợp đồng' : 'Vui lòng lưu tất cả các mục trước'}
          >
            <Eye size={16} />
            Xem trước hợp đồng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section header with save/edit toggle ─────────────────────
function SectionSaveHeader({ tab, isSaved, lastSavedAt, onSave, onEdit, validateFn, validationSignature }) {
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (validationErrors.length > 0) setValidationErrors([]);
  }, [validationSignature]);

  const handleSave = () => {
    const result = onSave();
    if (result && !result.ok) {
      setValidationErrors(result.errors);
      return;
    }
    setValidationErrors([]);
  };

  const handleEdit = () => {
    setValidationErrors([]);
    onEdit();
  };

  const isLastSaved = lastSavedAt?.section === tab.id;

  return (
    <div className="ctc-save-header">
      <div className="ctc-save-header-info">
        {isSaved ? (
          <>
            <span className="ctc-save-badge ctc-save-badge--success">
              <Check size={12} />
              Đã lưu
            </span>
            {isLastSaved && (
              <span className="ctc-save-time">
                {new Date(lastSavedAt.at).toLocaleTimeString('vi-VN')}
              </span>
            )}
          </>
        ) : (
          <span className="ctc-save-badge ctc-save-badge--pending">Chưa lưu</span>
        )}
      </div>
      <div className="ctc-save-header-actions">
        {isSaved ? (
          <button type="button" className="ctc-btn ctc-btn--ghost" onClick={handleEdit}>
            <Edit3 size={14} />
            Chỉnh sửa
          </button>
        ) : (
          <button type="button" className="ctc-btn ctc-btn--save" onClick={handleSave}>
            <Save size={14} />
            {tab.saveLabel}
          </button>
        )}
      </div>
      {validationErrors.length > 0 && (
        <div className="ctc-save-errors">
          <strong>Vui lòng điền:</strong>
          <ul>
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
