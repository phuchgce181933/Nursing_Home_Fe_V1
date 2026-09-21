import React, { useState } from 'react';
import { X, FileText, Edit3, Check, AlertCircle, Download, Printer } from 'lucide-react';

/**
 * Modal xem trước toàn bộ hợp đồng trước khi tạo.
 *
 * Hiển thị đầy đủ điều khoản, có thể in/xuất PDF.
 * Có nút "Chỉnh sửa" quay lại form, "Tạo hợp đồng" để commit.
 *
 * Props:
 *  - open: boolean
 *  - onClose: đóng modal
 *  - onEdit: callback quay lại form editor
 *  - onCreate: callback cuối cùng để tạo hợp đồng (async có thể throw)
 *  - terms: string full terms
 *  - form: form data
 *  - admission: admission info
 *  - isCreating: state đang submit
 */
export default function ContractPreviewModal({
  open,
  onClose,
  onEdit,
  onCreate,
  terms = '',
  form = {},
  admission = {},
  isCreating = false,
}) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  if (!open) return null;

  const rep = form.representative || {};
  const pkg = form.package || {};
  const contacts = form.contacts || [];
  const applicant = admission?.applicant || {};

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasScrolledToEnd(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Hợp đồng</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.7; padding: 30px 50px; color: #111; max-width: 800px; margin: 0 auto; }
  pre { white-space: pre-wrap; font-family: inherit; }
  h2 { text-align: center; }
</style></head><body>
<pre>${terms.replace(/</g, '&lt;')}</pre>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleDownload = () => {
    const blob = new Blob([terms], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hop-dong-${applicant.fullName?.replace(/\s+/g, '_') || 'preview'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cpm-overlay" onClick={!isCreating ? onClose : undefined}>
      <div className="cpm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cpm-header">
          <div className="cpm-header-title">
            <FileText size={20} />
            <div>
              <h2>Xem trước hợp đồng</h2>
              <p className="cpm-subtitle">
                Người cao tuổi: <strong>{applicant.fullName || '—'}</strong>
              </p>
            </div>
          </div>
          <div className="cpm-header-actions">
            <button type="button" className="cpm-icon-btn" onClick={handleDownload} title="Tải về (.txt)">
              <Download size={16} />
            </button>
            <button type="button" className="cpm-icon-btn" onClick={handlePrint} title="In">
              <Printer size={16} />
            </button>
            <button type="button" className="cpm-icon-btn" onClick={onClose} disabled={isCreating} title="Đóng">
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Quick summary */}
        <div className="cpm-summary">
          <SummaryItem label="Người đại diện" value={rep.fullName || '—'} />
          <SummaryItem label="Quan hệ" value={rep.relationship || '—'} />
          <SummaryItem label="Gói dịch vụ" value={pkg.name || '—'} />
          <SummaryItem
            label="Phí"
            value={pkg.monthlyPrice ? `${Number(pkg.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng` : '—'}
          />
          <SummaryItem label="Liên hệ khẩn cấp" value={`${contacts.length} người`} />
        </div>

        {/* Full terms preview */}
        <div className="cpm-preview-wrap" onScroll={handleScroll}>
          <pre className="cpm-preview">{terms}</pre>
          {!hasScrolledToEnd && (
            <div className="cpm-scroll-hint">
              <AlertCircle size={14} />
              <span>Cuộn xuống để xem hết điều khoản</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <footer className="cpm-footer">
          <button
            type="button"
            className="cpm-btn cpm-btn--ghost"
            onClick={onEdit}
            disabled={isCreating}
          >
            <Edit3 size={14} />
            Quay lại chỉnh sửa
          </button>
          <button
            type="button"
            className="cpm-btn cpm-btn--primary"
            onClick={onCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <span className="cpm-spinner" /> Đang tạo hợp đồng…
              </>
            ) : (
              <>
                <Check size={14} />
                Tạo hợp đồng
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="cpm-summary-item">
      <span className="cpm-summary-label">{label}</span>
      <span className="cpm-summary-value">{value}</span>
    </div>
  );
}
