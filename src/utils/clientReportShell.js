const escapeCsvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

export const downloadCsv = (filename, headers, rows, preambleRows = []) => {
  const preamble = preambleRows.map((row) => row.map(escapeCsvCell).join(','));
  const dataRows = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const csv = `\uFEFF${[...preamble, ...dataRows].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const openPrintReport = ({ title, htmlBody, width = 1100, height = 900 }) => {
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ bật lên (pop-up) để xuất báo cáo PDF.');
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8">
      ${htmlBody.styles}
    </head>
    <body>
      ${htmlBody.content}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};

export const buildReportStyles = ({ accent = '#0f766e', accentDark = '#0f172a' } = {}) => `
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      background-color: #ffffff;
      line-height: 1.4;
      font-size: 12.5px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid ${accent};
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header-left h2 {
      color: ${accentDark};
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 800;
    }
    .header-left p {
      margin: 1px 0;
      font-size: 11px;
      color: #64748b;
    }
    .header-right {
      text-align: right;
    }
    .header-right h3 {
      margin: 0 0 4px 0;
      color: ${accent};
      font-size: 14px;
      font-weight: 700;
    }
    .header-right p {
      margin: 1px 0;
      font-size: 11px;
      color: #64748b;
    }
    .title-container {
      text-align: center;
      margin-bottom: 25px;
    }
    .title-container h1 {
      color: #0f172a;
      margin: 0 0 6px 0;
      font-size: 21px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-container p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 25px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px 20px;
      margin-bottom: 20px;
    }
    .info-item {
      display: flex;
      font-size: 12px;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      width: 120px;
      flex-shrink: 0;
    }
    .info-value {
      color: #1e293b;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: ${accentDark};
      border-left: 4px solid ${accent};
      padding-left: 8px;
      margin: 22px 0 10px 0;
      text-transform: uppercase;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 8px;
      text-align: center;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.01);
    }
    .summary-card-title {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    .summary-card-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
    }
    .table th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: center;
      padding: 10px 8px;
      font-size: 11px;
      border-bottom: 2px solid #cbd5e1;
    }
    .table th:first-child {
      text-align: left;
    }
    .table td {
      padding: 8px 6px;
      font-size: 11px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 45px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      text-align: center;
      width: 280px;
      font-size: 12px;
    }
    .signature-box p {
      margin: 4px 0;
    }
    .signature-line {
      margin-top: 50px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      color: #64748b;
      font-size: 11px;
    }
    @media print {
      body { padding: 10px; }
      .table tr { page-break-inside: avoid; }
    }
  </style>
`;

export const buildReportHeader = ({ reportTypeLabel, documentCode, exportedAt }) => `
  <div class="header">
    <div class="header-left">
      <h2>HỆ THỐNG QUẢN LÝ VIỆN DƯỠNG LÃO NURSING HOME</h2>
      <p>Địa chỉ: Đường Đại Lộ Thăng Long, Hà Nội</p>
      <p>Điện thoại: (024) 3789 9999 | Email: contact@nursinghome.com</p>
    </div>
    <div class="header-right">
      <h3>${reportTypeLabel}</h3>
      <p>Ngày xuất bản: ${exportedAt}</p>
      ${documentCode ? `<p>Mã tài liệu: ${documentCode}</p>` : ''}
    </div>
  </div>
`;

export const buildDualSignatureFooter = ({
  leftTitle = 'Quản trị / Quản lý vận hành',
  leftSubtitle = '(Ký và ghi rõ họ tên)',
  leftLine = 'Xác nhận quản lý',
  rightTitle = 'Người lập báo cáo',
  rightSubtitle = '(Ký tên và ghi rõ họ tên)',
  rightLine = 'Xác nhận',
} = {}) => {
  const now = new Date();
  return `
    <div class="footer">
      <div class="signature-box">
        <p><b>${leftTitle}</b></p>
        <p style="font-size: 11px; color: #64748b;">${leftSubtitle}</p>
        <div class="signature-line">${leftLine}</div>
      </div>
      <div class="signature-box">
        <p>Hà Nội, Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}</p>
        <p><b>${rightTitle}</b></p>
        <p style="font-size: 11px; color: #64748b;">${rightSubtitle}</p>
        <div class="signature-line">${rightLine}</div>
      </div>
    </div>
  `;
};

export const buildInfoGrid = (items) => `
  <div class="info-grid">
    ${items
      .map(
        ({ label, value }) => `
      <div class="info-item">
        <span class="info-label">${label}:</span>
        <span class="info-value">${value ?? '—'}</span>
      </div>
    `
      )
      .join('')}
  </div>
`;

export const buildSummaryGrid = (cards) => `
  <div class="summary-grid">
    ${cards
      .map(
        ({ title, value }) => `
      <div class="summary-card">
        <div class="summary-card-title">${title}</div>
        <div class="summary-card-value">${value}</div>
      </div>
    `
      )
      .join('')}
  </div>
`;
