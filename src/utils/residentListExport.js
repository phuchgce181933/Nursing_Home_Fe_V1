import i18n from '../i18n';
import { getResidencyLabel } from '../pages/admin/residents/_shared/residentLabels';
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

const t = (key, opts) => i18n.t(key, opts);

const getLocale = () => (i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US');

const getCsvHeaders = () => [
  t('admin.residents.common.colCode'),
  t('admin.residents.common.colFullName'),
  t('admin.residents.common.colArea'),
  t('admin.residents.common.colDrugAllergies'),
  t('admin.residents.common.colStatus'),
];

const formatDrugAllergiesLabel = (resident) => {
  if (resident?.hasDrugAllergiesRecord) {
    const count = resident.drugAllergiesCount ?? pickDrugAllergiesList(resident).length ?? 0;
    return t('admin.residents.common.recordedWithCount', { count });
  }
  return t('admin.residents.common.noRecord');
};

const rowToCells = (resident) => [
  resident.residentCode || '',
  resident.fullName || '',
  formatResidentAreaLine(resident, t) || '',
  formatDrugAllergiesLabel(resident),
  getResidencyLabel(t, resident.residencyStatus) || resident.residencyStatus || '',
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

  const exportedAt = new Date().toLocaleString(getLocale());
  const title = meta.title || t('admin.residents.byArea.export.listTitle');
  const filterSummary = meta.filterSummary || t('admin.residents.byArea.export.allAreas');
  const rows = residents.map((resident) => rowToCells(resident));

  const preambleRows = [
    [title],
    [t('admin.residents.byArea.export.filterLine', { filter: filterSummary })],
    [t('admin.residents.byArea.export.dateLine', { date: exportedAt })],
    [t('admin.residents.byArea.export.byLine', { name: meta.exportedBy || '—' })],
    [t('admin.residents.byArea.export.totalLine', { count: residents.length })],
    [''],
  ];

  const filename = `residents-by-area-${buildFilenameSlug(meta)}-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(filename, getCsvHeaders(), rows, preambleRows);
};

export const exportResidentListToPDF = (residents, meta = {}) => {
  if (!residents?.length) return;

  const exportedAt = new Date().toLocaleString(getLocale());
  const title = meta.title || t('admin.residents.byArea.export.listTitle');
  const filterSummary = meta.filterSummary || t('admin.residents.byArea.export.allAreas');
  const documentCode = buildDocumentCode(meta);
  const stats = meta.summaryStats || {};
  const csvHeaders = getCsvHeaders();

  const tableRows = residents
    .map(
      (resident) => `
    <tr>
      <td style="font-family: monospace; color: #334155;">${resident.residentCode || '—'}</td>
      <td style="font-weight: 600; color: #0f172a;">${resident.fullName || '—'}</td>
      <td style="text-align: center; color: #475569;">${formatResidentAreaLine(resident, t) || '—'}</td>
      <td style="text-align: center; color: #475569;">${formatDrugAllergiesLabel(resident)}</td>
      <td style="text-align: center; ${getStatusStyle(resident.residencyStatus)}">${getResidencyLabel(t, resident.residencyStatus) || resident.residencyStatus || '—'}</td>
    </tr>
  `
    )
    .join('');

  const content = `
    ${buildReportHeader({
      reportTypeLabel: t('admin.residents.byArea.export.pdfReportType'),
      documentCode,
      exportedAt,
    })}

    <div class="title-container">
      <h1>${title}</h1>
      <p>${t('admin.residents.byArea.export.pdfSubtitle')}</p>
    </div>

    ${buildInfoGrid([
      { label: t('admin.residents.byArea.export.pdfFilteredArea'), value: meta.buildingLabel || filterSummary },
      { label: t('admin.residents.byArea.export.pdfFilter'), value: filterSummary },
      { label: t('admin.residents.byArea.export.pdfExporter'), value: meta.exportedBy || '—' },
      {
        label: t('admin.residents.byArea.export.pdfTotalRecords'),
        value: t('admin.residents.byArea.export.pdfResidentCount', { count: residents.length }),
      },
    ])}

    ${buildSummaryGrid([
      { title: t('admin.residents.byArea.statTotalInBuilding'), value: String(stats.totalInBuilding ?? '—').padStart(2, '0') },
      { title: t('admin.residents.byArea.statFloorCount'), value: String(stats.floorCount ?? '—').padStart(2, '0') },
      { title: t('admin.residents.byArea.statFiltered'), value: String(stats.filteredCount ?? residents.length).padStart(2, '0') },
    ])}

    <div class="section-title">${t('admin.residents.byArea.export.pdfDetailList')}</div>
    <table class="table">
      <thead>
        <tr>
          ${csvHeaders.map((header) => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    ${buildDualSignatureFooter({
      leftTitle: t('admin.residents.byArea.export.pdfSigLeftTitle'),
      leftSubtitle: t('admin.residents.byArea.export.pdfSigLeftSubtitle'),
      leftLine: t('admin.residents.byArea.export.pdfSigLeftLine'),
      rightTitle: t('admin.residents.byArea.export.pdfSigRightTitle'),
      rightSubtitle: t('admin.residents.byArea.export.pdfSigRightSubtitle'),
      rightLine: t('admin.residents.byArea.export.pdfSigRightLine'),
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
