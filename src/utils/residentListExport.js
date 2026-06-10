import { RESIDENCY_LABELS } from '../pages/admin/residents/_shared/residentLabels';
import { formatResidentAreaLine, pickDrugAllergiesList } from './residentArea';
import {
  buildDualSignatureFooter,
  buildInfoGrid,
  buildReportHeader,
  buildReportStyles,
  buildSummaryGrid,
  downloadCsv,
  openPrintReport,
} from './clientReportShell';

const CSV_HEADERS = ['Mã', 'Họ tên', 'Khu vực', 'Dị ứng thuốc', 'Trạng thái'];

const formatDrugAllergiesLabel = (resident) => {
  if (resident?.hasDrugAllergiesRecord) {
    const count = resident.drugAllergiesCount ?? pickDrugAllergiesList(resident).length ?? 0;
    return `Đã ghi (${count})`;
  }
  return 'Chưa ghi';
};

const rowToCells = (resident) => [
  resident.residentCode || '',
  resident.fullName || '',
  formatResidentAreaLine(resident) || '',
  formatDrugAllergiesLabel(resident),
  RESIDENCY_LABELS[resident.residencyStatus] || resident.residencyStatus || '',
];

const getStatusStyle = (status) => {
  if (status === 'admitted') return 'color: #047857; font-weight: 700;';
  if (status === 'pending') return 'color: #d97706; font-weight: 700;';
  if (status === 'discharged') return 'color: #64748b; font-weight: 600;';
  return 'color: #475569;';
};

const buildDocumentCode = (meta) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const buildingPart = String(meta.buildingId || meta.buildingLabel || 'ALL')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `BC-KV-${date}-${buildingPart || 'ALL'}`;
};

const buildFilenameSlug = (meta) => {
  const buildingPart = String(meta.buildingId || meta.buildingLabel || 'area')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 24)
    .toLowerCase();
  return buildingPart || 'area';
};

export const exportResidentListToCSV = (residents, meta = {}) => {
  if (!residents?.length) return;

  const exportedAt = new Date().toLocaleString('vi-VN');
  const title = meta.title || 'DANH SÁCH CƯ DÂN THEO KHU VỰC';
  const filterSummary = meta.filterSummary || 'Tất cả khu vực';
  const rows = residents.map((resident) => rowToCells(resident));

  const preambleRows = [
    [title],
    [`Bộ lọc: ${filterSummary}`],
    [`Ngày xuất: ${exportedAt}`],
    [`Người xuất: ${meta.exportedBy || '—'}`],
    [`Tổng số: ${residents.length} cư dân`],
    [''],
  ];

  const filename = `residents-by-area-${buildFilenameSlug(meta)}-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(filename, CSV_HEADERS, rows, preambleRows);
};

export const exportResidentListToPDF = (residents, meta = {}) => {
  if (!residents?.length) return;

  const exportedAt = new Date().toLocaleString('vi-VN');
  const title = meta.title || 'DANH SÁCH CƯ DÂN THEO KHU VỰC';
  const filterSummary = meta.filterSummary || 'Tất cả khu vực';
  const documentCode = buildDocumentCode(meta);
  const stats = meta.summaryStats || {};

  const tableRows = residents
    .map(
      (resident) => `
    <tr>
      <td style="font-family: monospace; color: #334155;">${resident.residentCode || '—'}</td>
      <td style="font-weight: 600; color: #0f172a;">${resident.fullName || '—'}</td>
      <td style="text-align: center; color: #475569;">${formatResidentAreaLine(resident) || '—'}</td>
      <td style="text-align: center; color: #475569;">${formatDrugAllergiesLabel(resident)}</td>
      <td style="text-align: center; ${getStatusStyle(resident.residencyStatus)}">${RESIDENCY_LABELS[resident.residencyStatus] || resident.residencyStatus || '—'}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    ${buildReportHeader({
      reportTypeLabel: 'BÁO CÁO CƯ DÂN THEO KHU VỰC',
      documentCode,
      exportedAt,
    })}

    <div class="title-container">
      <h1>${title}</h1>
      <p>Tài liệu lưu hành nội bộ — Quản lý cư dân theo khu vực</p>
    </div>

    ${buildInfoGrid([
      { label: 'Khu vực lọc', value: meta.buildingLabel || filterSummary },
      { label: 'Bộ lọc', value: filterSummary },
      { label: 'Người xuất', value: meta.exportedBy || '—' },
      { label: 'Tổng bản ghi', value: `${residents.length} cư dân` },
    ])}

    ${buildSummaryGrid([
      { title: 'Tổng trong tòa', value: String(stats.totalInBuilding ?? '—').padStart(2, '0') },
      { title: 'Số tầng', value: String(stats.floorCount ?? '—').padStart(2, '0') },
      { title: 'Đang lọc', value: String(stats.filteredCount ?? residents.length).padStart(2, '0') },
    ])}

    <div class="section-title">Danh sách chi tiết</div>
    <table class="table">
      <thead>
        <tr>
          ${CSV_HEADERS.map((header) => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    ${buildDualSignatureFooter({
      leftTitle: 'Quản trị / Quản lý vận hành',
      leftSubtitle: '(Ký và ghi rõ họ tên)',
      leftLine: 'Xác nhận quản lý',
      rightTitle: 'Người lập báo cáo',
      rightSubtitle: '(Ký tên và ghi rõ họ tên)',
      rightLine: 'Xác nhận',
    })}
  `;

  openPrintReport({
    title: `${title} - Nursing Home`,
    htmlBody: {
      styles: buildReportStyles({ accent: '#0f766e', accentDark: '#0f172a' }),
      content,
    },
  });
};
