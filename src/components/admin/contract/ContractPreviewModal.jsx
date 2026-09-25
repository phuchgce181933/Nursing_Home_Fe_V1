import React, { useState } from 'react';
import { X, FileText, Edit3, Check, AlertCircle, Download, Printer } from 'lucide-react';

// Logo Viện Dưỡng Lão An Nhiên (lưu trên Cloudinary, dùng chung toàn hệ thống).
// Marker [LOGO] trong template sẽ được thay bằng <img src={LOGO_URL}> khi render.
const LOGO_URL =
  'https://res.cloudinary.com/dhcrddnss/image/upload/c_crop,x_385,y_150,w_1250,h_1250,q_auto,f_auto/v1780035528/Logo_vi%E1%BB%87n_d%C6%B0%E1%BB%A1ng_l%C3%A3o_An_Nhi%C3%AAn_lrmocn.png';

/**
 * Modal xem trước / xem chi tiết hợp đồng.
 *
 * Hai chế độ:
 *  - **Create preview**: truyền `form` + `admission` + `onCreate`. Hiển thị modal
 *    trước khi tạo, có nút "Quay lại chỉnh sửa" / "Tạo hợp đồng".
 *  - **View details**: truyền `contract` (đã populate admission + servicePackage).
 *    Modal chỉ để đọc, footer chỉ có nút "Đóng".
 *
 * Props chung:
 *  - open: boolean
 *  - onClose: đóng modal
 *  - terms: string full terms
 *  - isCreating: state đang submit (chỉ create mode)
 *
 * Props cho create mode:
 *  - form: form data (representative, package, contacts)
 *  - admission: admission info (applicant)
 *  - onEdit: callback quay lại form editor
 *  - onCreate: callback cuối cùng để tạo hợp đồng
 *
 * Props cho view mode:
 *  - contract: object hợp đồng đã lưu (terms + admissionId + servicePackageId)
 */

// Bảng dịch quan hệ sang tiếng Việt (không phân biệt hoa/thường)
const RELATIONSHIP_VI_MAP = {
  // Con
  child: 'Con',
  children: 'Con',
  son: 'Con trai',
  daughter: 'Con gái',
  'con': 'Con',
  'con trai': 'Con trai',
  'con gái': 'Con gái',
  'con gai': 'Con gái',
  // Vợ/Chồng
  spouse: 'Vợ/Chồng',
  husband: 'Chồng',
  wife: 'Vợ',
  'vợ/chồng': 'Vợ/Chồng',
  'vo/chong': 'Vợ/Chồng',
  'vợ': 'Vợ',
  'vo': 'Vợ',
  'chồng': 'Chồng',
  'chong': 'Chồng',
  // Cha/Mẹ
  parent: 'Cha/Mẹ',
  parents: 'Cha/Mẹ',
  father: 'Cha',
  mother: 'Mẹ',
  dad: 'Cha',
  mom: 'Mẹ',
  'cha/mẹ': 'Cha/Mẹ',
  'cha/me': 'Cha/Mẹ',
  'cha': 'Cha',
  'bố': 'Cha',
  'bo': 'Cha',
  'mẹ': 'Mẹ',
  'me': 'Mẹ',
  // Anh/Chị/Em
  sibling: 'Anh/Chị/Em',
  siblings: 'Anh/Chị/Em',
  brother: 'Anh/Em trai',
  sister: 'Chị/Em gái',
  'anh/chị/em': 'Anh/Chị/Em',
  'anh/chi/em': 'Anh/Chị/Em',
  'anh': 'Anh',
  'chị': 'Chị',
  'chi': 'Chị',
  'em': 'Em',
  // Cháu
  grandchild: 'Cháu',
  grandson: 'Cháu trai',
  granddaughter: 'Cháu gái',
  'cháu': 'Cháu',
  'chau': 'Cháu',
  // Ông/Bà
  grandparent: 'Ông/Bà',
  grandfather: 'Ông',
  grandmother: 'Bà',
  'ông/bà': 'Ông/Bà',
  'ong/ba': 'Ông/Bà',
  'ông': 'Ông',
  'ong': 'Ông',
  'bà': 'Bà',
  'ba': 'Bà',
  // Khác
  relative: 'Họ hàng',
  friend: 'Bạn',
  guardian: 'Người giám hộ',
  'người giám hộ': 'Người giám hộ',
  'nguoi giam ho': 'Người giám hộ',
  'họ hàng': 'Họ hàng',
  'ho hang': 'Họ hàng',
  'khác': 'Khác',
  'other': 'Khác',
};

const fmtRelationshipVi = (rel) => {
  if (!rel) return '—';
  const trimmed = rel.trim();
  if (!trimmed) return '—';
  const lower = trimmed.toLowerCase();
  if (RELATIONSHIP_VI_MAP[lower]) return RELATIONSHIP_VI_MAP[lower];
  if (RELATIONSHIP_VI_MAP[trimmed]) return RELATIONSHIP_VI_MAP[trimmed];
  return trimmed;
};
export default function ContractPreviewModal({
  open,
  onClose,
  onEdit,
  onCreate,
  terms = '',
  form = {},
  admission = {},
  contract = null,
  isCreating = false,
}) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  if (!open) return null;

  // Detect mode: view-only khi `contract` được truyền (đã lưu) và không có onCreate.
  const viewMode = Boolean(contract) && !onCreate;

  // Chuẩn hoá dữ liệu từ contract (view mode) hoặc form+admission (create mode).
  // Cùng một giao diện được dùng cho cả hai, chỉ khác nguồn dữ liệu.
  let applicant = {};
  let pkg = {};
  let rep = {};
  let contacts = [];
  let headerTitle = 'Hợp đồng';
  let headerSubtitle = '';
  let filenameSeed = 'contract';
  let termsText = terms;

  if (viewMode && contract) {
    const admissionData = contract.admissionId && typeof contract.admissionId === 'object'
      ? contract.admissionId
      : {};
    applicant = admissionData.applicant || {};
    const pkgData = contract.servicePackageId && typeof contract.servicePackageId === 'object'
      ? contract.servicePackageId
      : {};
    pkg = {
      name: pkgData.name || '—',
      monthlyPrice: Number(pkgData.monthlyPrice || contract.monthlyFee || 0),
    };
    // Người liên hệ chính (family requester) lấy từ admission.requestedBy*
    const requestedByName = admissionData.requestedByName || '';
    rep = {
      fullName: requestedByName || '—',
      relationship: applicant.relationshipToRequester || '',
    };
    // Hợp đồng đã lưu không có emergencyContacts → để 0
    contacts = [];
    termsText = contract.terms || terms;
    headerTitle = `Hợp đồng ${contract.contractNumber || ''}`.trim();
    headerSubtitle = applicant.fullName || '';
    filenameSeed = `hop-dong-${contract.contractNumber || contract._id || 'contract'}`;
  } else {
    rep = form.representative || {};
    pkg = form.package || {};
    contacts = form.contacts || [];
    applicant = admission?.applicant || {};
    headerTitle = 'Xem trước hợp đồng';
    headerSubtitle = `Người cao tuổi: ${applicant.fullName || '—'}`;
    filenameSeed = `hop-dong-${applicant.fullName?.replace(/\s+/g, '_') || 'preview'}`;
  }

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom) setHasScrolledToEnd(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;
    // Parse [CENTER]...[/CENTER] blocks để render căn giữa, in đậm khi in.
    const html = renderTermsToHtml(termsText);
    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Hợp đồng</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.55; padding: 30px 50px; color: #111; max-width: 800px; margin: 0 auto; }
  pre { white-space: pre-wrap; font-family: inherit; margin: 0; padding: 0; }
  h2 { text-align: center; }
  .ct-center { text-align: center; font-weight: 700; margin: 4px 0; }
  .ct-sep { height: 4px; }
</style></head><body>
${html}
</body></html>`);
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

  // HTML cho marker [LOGO] trong template — hiển thị logo Viện ở đầu trang hợp đồng.
  // Kích thước 120×120, căn giữa. onerror để ẩn nếu không load được.
  const logoHtml =
    `<img src="${LOGO_URL}" alt="Logo Viện Dưỡng Lão An Nhiên" ` +
    `style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 12px;" ` +
    `onerror="this.style.display='none'" />`;

  /**
   * Escape HTML đặc biệt nhưng GIỮ LẠI placeholder logo (%%LOGO_HTML%%).
   * Hai bước:
   *   1. Đổi [LOGO] → %%LOGO_HTML%% trước
   *   2. Escape &, <, >
   *   3. Trả về %%LOGO_HTML%% đã không bị escape (sẽ được render thành <img>)
   */
  const escapeKeepLogo = (s) => {
    return s
      .replace(/\[LOGO\]/g, '%%LOGO_HTML%%')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/%%LOGO_HTML%%/g, logoHtml);
  };

  // Render text thành HTML. Các khối [CENTER]...[/CENTER] sẽ được căn giữa, in đậm.
  // Marker [LOGO] sẽ được thay bằng thẻ <img> logo Viện Dưỡng Lão An Nhiên.
  // Được dùng chung cho cả preview trong modal và bản in.
  function renderTermsToHtml(rawText) {
    if (!rawText) return '';
    const parts = [];
    const regex = /\[CENTER\]([\s\S]*?)\[\/CENTER\]/g;
    let lastIdx = 0;
    let m;
    while ((m = regex.exec(rawText)) !== null) {
      if (m.index > lastIdx) {
        parts.push({ kind: 'plain', text: rawText.slice(lastIdx, m.index) });
      }
      parts.push({ kind: 'center', text: m[1].trim() });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < rawText.length) {
      parts.push({ kind: 'plain', text: rawText.slice(lastIdx) });
    }
    return parts
      .map((p) => {
        if (p.kind === 'center') {
          return `<div class="ct-center">${escapeKeepLogo(p.text).replace(/\n/g, '<br/>')}</div>`;
        }
        return `<pre>${escapeKeepLogo(p.text)}</pre>`;
      })
      .join('\n');
  }

  const previewHtml = renderTermsToHtml(termsText);

  return (
    <div className="cpm-overlay" onClick={!isCreating ? onClose : undefined}>
      <div className="cpm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cpm-header">
          <div className="cpm-header-title">
            <FileText size={20} />
            <div>
              <h2>{headerTitle}</h2>
              <p className="cpm-subtitle">
                {viewMode
                  ? (headerSubtitle ? `Người cao tuổi: ${headerSubtitle}` : '')
                  : headerSubtitle}
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
          <SummaryItem label="Quan hệ" value={fmtRelationshipVi(rep.relationship)} />
          <SummaryItem label="Gói dịch vụ" value={pkg.name || '—'} />
          <SummaryItem
            label="Phí"
            value={pkg.monthlyPrice ? `${Number(pkg.monthlyPrice).toLocaleString('vi-VN')} VNĐ/tháng` : '—'}
          />
          <SummaryItem label="Liên hệ khẩn cấp" value={`${contacts.length} người`} />
        </div>

        {/* Full terms preview — các khối [CENTER]...[/CENTER] được căn giữa, in đậm */}
        <div className="cpm-preview-wrap" onScroll={!viewMode ? handleScroll : undefined}>
          <div
            className="cpm-preview"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          {!viewMode && !hasScrolledToEnd && (
            <div className="cpm-scroll-hint">
              <AlertCircle size={14} />
              <span>Cuộn xuống để xem hết điều khoản</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <footer className="cpm-footer">
          {viewMode ? (
            <button
              type="button"
              className="cpm-btn cpm-btn--primary"
              onClick={onClose}
            >
              Đóng
            </button>
          ) : (
            <>
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
            </>
          )}
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
