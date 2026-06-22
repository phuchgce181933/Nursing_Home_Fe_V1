import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HeartPulse,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Activity,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Calendar,
  Thermometer,
  Scale,
  Wallet,
  X,
  Eye,
  Plus,
  Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import medicalRecordService from '../../services/medicalRecord.service';
import residentService from '../../services/resident.service';
import '../../styles/shared/HealthMonitoringPage.css';

// ─── Thresholds (sync with backend checkAbnormalVitals) ───
const THRESHOLDS = {
  bloodPressureSystolic:  { min: 90,   max: 140,  unit: 'mmHg' },
  bloodPressureDiastolic: { min: 60,   max: 90,   unit: 'mmHg' },
  pulse:                  { min: 60,   max: 100,  unit: 'l/p' },
  temperatureCelsius:     { min: 35.0, max: 37.8, unit: '°C' },
  oxygenSaturation:       { min: 95,   max: 100,  unit: '%' },
};

// ─── Chart metrics ───
const getChartMetrics = (t) => [
  { key: 'bloodPressureSystolic',  label: t('healthMonitoring.bpSystolic'),    color: '#ef4444', unit: 'mmHg' },
  { key: 'bloodPressureDiastolic', label: t('healthMonitoring.bpDiastolic'), color: '#f97316', unit: 'mmHg' },
  { key: 'pulse',                  label: t('healthMonitoring.pulse'),             color: '#8b5cf6', unit: 'l/p' },
  { key: 'temperatureCelsius',     label: t('healthMonitoring.temperature'),             color: '#ec4899', unit: '°C' },
  { key: 'oxygenSaturation',       label: 'SpO₂',                 color: '#06b6d4', unit: '%' },
  { key: 'bloodSugar',             label: t('healthMonitoring.bloodSugar'),          color: '#10b981', unit: 'mmol/L' },
  { key: 'weightKg',               label: t('healthMonitoring.weight'),             color: '#3b82f6', unit: 'kg' },
];

// ─── Helpers ───
const isAbnormal = (key, value) => {
  if (value === undefined || value === null || value === '') return false;
  const t = THRESHOLDS[key];
  if (!t) return false;
  return Number(value) > t.max || Number(value) < t.min;
};

const formatDT = (val) => {
  if (!val) return '—';
  return new Date(val).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatAge = (dob, t) => {
  if (!dob) return null;
  const age = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
  return `${age} ${t('healthMonitoring.yearsOld')}`;
};

// ─── Chuyển field name sang label tiếng Việt ───
const getFieldLabel = (field) => {
  const labels = {
    // Physical Examination
    general: 'Tổng quát',
    cardiovascular: 'Tim mạch',
    respiratory: 'Hô hấp',
    abdominal: 'Bụng',
    neurological: 'Thần kinh',
    musculoskeletal: 'Cơ xương',
    skin: 'Da',
    other: 'Khác',
    summary: 'Tóm tắt',
    // Urinalysis Results
    appearance: 'Hình thái',
    color: 'Màu sắc',
    pH: 'pH',
    specificGravity: 'Trọng lượng riêng',
    protein: 'Protein',
    glucose: 'Glucose',
    ketones: 'Ketone',
    blood: 'Máu',
    leukocyteEsterase: 'Bạch cầu esterase',
    nitrites: 'Nitrit',
    urobilinogen: 'Urobilinogen',
    bilirubin: 'Bilirubin',
    microscopy: 'Kính hiển vi',
    notes: 'Ghi chú',
    // ECG Results
    heartRate: 'Nhịp tim',
    rhythm: 'Nhịp điệu',
    prInterval: 'Khoảng PR',
    qrsDuration: 'Thời gian QRS',
    qtInterval: 'Khoảng QT',
    axis: 'Trục',
    interpretation: 'Giải thích',
    // Cognitive Function
    assessmentTool: 'Công cụ đánh giá',
    score: 'Điểm số',
    orientation: 'Định hướng',
    memory: 'Trí nhớ',
    attention: 'Chú ý',
    language: 'Ngôn ngữ',
    executiveFunction: 'Chức năng thực hành',
    // Functional Status
    mobility: 'Độ linh hoạt',
    transfers: 'Chuyển vị',
    adls: 'Hoạt động hàng ngày',
    iadls: 'Hoạt động có công cụ',
    assistanceRequired: 'Sự hỗ trợ cần thiết',
    // Fall Risk
    level: 'Mức độ',
    historyOfFalls: 'Lịch sử té ngã',
    gait: 'Dáng đi',
    balance: 'Cân bằng',
    medications: 'Thuốc',
    vision: 'Thị lực',
    cognition: 'Nhận thức',
    // Nutritional Status
    bmi: 'BMI',
    weightChange: 'Thay đổi cân nặng',
    appetite: 'Cảm giác thèm ăn',
    dietType: 'Loại chế độ ăn',
    swallowing: 'Khả năng nuốt',
    proteinIntake: 'Lượng protein',
    hydration: 'Tình trạng nước',
  };
  return labels[field] || (field.charAt(0).toUpperCase() + field.slice(1));
};

// ─── CSV export ───
const exportToCSV = (records, resident, t) => {
  if (!records.length) return;
  const headers = [
    t('healthMonitoring.csvMeasuredAt'), t('healthMonitoring.csvBpSystolic'), t('healthMonitoring.csvBpDiastolic'), t('healthMonitoring.csvPulse'),
    t('healthMonitoring.csvTemperature'), t('healthMonitoring.csvSpO2'), t('healthMonitoring.csvBloodSugar'), t('healthMonitoring.csvWeight'), t('healthMonitoring.csvHeight'),
    t('healthMonitoring.csvAbnormal'), t('healthMonitoring.csvNotes'),
  ];
  const rows = records.map((r) => [
    r.measuredAt ? new Date(r.measuredAt).toLocaleString('vi-VN') : '',
    r.bloodPressureSystolic ?? '',
    r.bloodPressureDiastolic ?? '',
    r.pulse ?? '',
    r.temperatureCelsius ?? '',
    r.oxygenSaturation ?? '',
    r.bloodSugar ?? '',
    r.weightKg ?? '',
    r.heightCm ?? '',
    r.abnormalFlag ? t('healthMonitoring.yes') : t('healthMonitoring.no'),
    r.summary ?? '',
  ]);
  const csv = '﻿' + [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-report-${resident?.residentCode || 'resident'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── PDF export ───
const exportToPDF = (records, resident, t) => {
  if (!records.length) return;

  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) {
    alert(t('healthMonitoring.pdfPopupBlocked'));
    return;
  }

  const age = resident.dateOfBirth
    ? Math.floor((Date.now() - new Date(resident.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
    : '—';

  const latest = records[0] || {};

  const getStatusText = (abnormal) =>
    abnormal
      ? `<span style="color: #ef4444; font-weight: bold; font-size: 11px;">${t('healthMonitoring.abnormal')}</span>`
      : `<span style="color: #10b981; font-weight: bold; font-size: 11px;">${t('healthMonitoring.normal')}</span>`;

  const getAbnormalTextClass = (key, val) => {
    if (val === undefined || val === null || val === '') return '';
    const t = THRESHOLDS[key];
    if (!t) return '';
    const isAbn = Number(val) > t.max || Number(val) < t.min;
    return isAbn ? 'color: #ef4444; font-weight: bold;' : 'color: #334155;';
  };

  const rows = records.map((r) => `
    <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
      <td style="padding: 8px 6px; font-size: 11px; color: #475569; border-bottom: 1px solid #e2e8f0;">${formatDT(r.measuredAt)}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; ${getAbnormalTextClass('bloodPressureSystolic', r.bloodPressureSystolic)}">${r.bloodPressureSystolic ?? '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; ${getAbnormalTextClass('bloodPressureDiastolic', r.bloodPressureDiastolic)}">${r.bloodPressureDiastolic ?? '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; ${getAbnormalTextClass('pulse', r.pulse)}">${r.pulse ?? '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; ${getAbnormalTextClass('temperatureCelsius', r.temperatureCelsius)}">${r.temperatureCelsius != null ? r.temperatureCelsius + ' °C' : '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; ${getAbnormalTextClass('oxygenSaturation', r.oxygenSaturation)}">${r.oxygenSaturation != null ? r.oxygenSaturation + ' %' : '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #334155;">${r.bloodSugar != null ? r.bloodSugar + ' mmol/L' : '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #334155;">${r.weightKg != null ? r.weightKg + ' kg' : '—'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; border-bottom: 1px solid #e2e8f0;">${getStatusText(r.abnormalFlag)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html><head>
<title>${t('healthMonitoring.pdfTitle')} - ${resident.fullName}</title>
<meta charset="utf-8">
<style>
body{font-family:system-ui,-apple-system,sans-serif;color:#1e293b;margin:0;padding:20px;background:#fff;line-height:1.4;font-size:12.5px}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #3b5bdb;padding-bottom:15px;margin-bottom:20px}
.header-left h2{color:#1e3a8a;margin:0 0 4px;font-size:18px;font-weight:800}
.header-left p{margin:1px 0;font-size:11px;color:#64748b}
.header-right{text-align:right}
.header-right h3{margin:0 0 4px;color:#3b5bdb;font-size:14px;font-weight:700}
.header-right p{margin:1px 0;font-size:11px;color:#64748b}
.title-container{text-align:center;margin-bottom:25px}
.title-container h1{color:#0f172a;margin:0 0 6px;font-size:21px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
.title-container p{margin:0;font-size:12px;color:#64748b}
.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 25px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:15px 20px;margin-bottom:20px}
.info-item{display:flex;font-size:12px}
.info-label{font-weight:600;color:#475569;width:120px;flex-shrink:0}
.info-value{color:#1e293b}
.section-title{font-size:13px;font-weight:700;color:#1e3a8a;border-left:4px solid #3b5bdb;padding-left:8px;margin:22px 0 10px;text-transform:uppercase}
.vitals-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.vital-card{border:1px solid #e2e8f0;border-radius:6px;padding:10px 8px;text-align:center;background:#fff}
.vital-card-title{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:5px;letter-spacing:.5px}
.vital-card-value{font-size:16px;font-weight:800;color:#0f172a}
.vital-card-unit{font-size:11px;color:#64748b;font-weight:normal}
.table{width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #e2e8f0;border-radius:5px;overflow:hidden}
.table th{background:#f8fafc;color:#475569;font-weight:700;text-align:center;padding:10px 8px;font-size:11px;border-bottom:2px solid #cbd5e1}
.table th:first-child{text-align:left}
.footer{margin-top:45px;display:flex;justify-content:space-between;page-break-inside:avoid}
.signature-box{text-align:center;width:280px;font-size:12px}
.signature-box p{margin:4px 0}
.signature-line{margin-top:50px;border-top:1px dashed #cbd5e1;padding-top:6px;color:#64748b;font-size:11px}
@media print{body{padding:10px}.no-print{display:none}.table tr{page-break-inside:avoid}}
</style></head><body>
<div class="header">
  <div class="header-left">
    <h2>${t('healthMonitoring.pdfOrgName')}</h2>
    <p>${t('healthMonitoring.pdfAddress')}</p>
    <p>${t('healthMonitoring.pdfContact')}</p>
  </div>
  <div class="header-right">
    <h3>${t('healthMonitoring.pdfReportTitle')}</h3>
    <p>${t('healthMonitoring.pdfPublishDate')}: ${new Date().toLocaleDateString('vi-VN')}</p>
    <p>${t('healthMonitoring.pdfDocCode')}: HS-${resident.residentCode || 'N/A'}</p>
  </div>
</div>
<div class="title-container">
  <h1>${t('healthMonitoring.pdfMainTitle')}</h1>
  <p>${t('healthMonitoring.pdfConfidential')}</p>
</div>
<div class="info-grid">
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfResidentName')}:</span><span class="info-value" style="font-weight:bold;text-transform:uppercase">${resident.fullName}</span></div>
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfResidentCode')}:</span><span class="info-value" style="font-weight:bold;color:#1e3a8a">#${resident.residentCode || 'N/A'}</span></div>
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfDob')}:</span><span class="info-value">${resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString('vi-VN') : '—'} (${age} ${t('healthMonitoring.yearsOld')})</span></div>
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfGender')}:</span><span class="info-value">${resident.gender === 'male' ? t('healthMonitoring.male') : resident.gender === 'female' ? t('healthMonitoring.female') : 'N/A'}</span></div>
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfBloodType')}:</span><span class="info-value">${resident.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : t('healthMonitoring.notDetermined')}</span></div>
  <div class="info-item"><span class="info-label">${t('healthMonitoring.pdfStatusRoom')}:</span><span class="info-value">${resident.residencyStatus === 'pending' ? t('healthMonitoring.pendingAdmission') : resident.room?.roomCode ? t('healthMonitoring.room') + ' ' + resident.room.roomCode : t('healthMonitoring.noRoom')}</span></div>
</div>
<div class="section-title">${t('healthMonitoring.pdfLatestVitals')} (${formatDT(latest.measuredAt)})</div>
<div class="vitals-summary-grid">
  <div class="vital-card"><div class="vital-card-title">${t('healthMonitoring.bloodPressure')}</div><div class="vital-card-value" style="${getAbnormalTextClass('bloodPressureSystolic', latest.bloodPressureSystolic)}">${latest.bloodPressureSystolic ?? '—'}/${latest.bloodPressureDiastolic ?? '—'} <span class="vital-card-unit">mmHg</span></div></div>
  <div class="vital-card"><div class="vital-card-title">${t('healthMonitoring.pulse')}</div><div class="vital-card-value" style="${getAbnormalTextClass('pulse', latest.pulse)}">${latest.pulse ?? '—'} <span class="vital-card-unit">l/p</span></div></div>
  <div class="vital-card"><div class="vital-card-title">${t('healthMonitoring.temperature')}</div><div class="vital-card-value" style="${getAbnormalTextClass('temperatureCelsius', latest.temperatureCelsius)}">${latest.temperatureCelsius ?? '—'} <span class="vital-card-unit">°C</span></div></div>
  <div class="vital-card"><div class="vital-card-title">${t('healthMonitoring.spO2Index')}</div><div class="vital-card-value" style="${getAbnormalTextClass('oxygenSaturation', latest.oxygenSaturation)}">${latest.oxygenSaturation ?? '—'} <span class="vital-card-unit">%</span></div></div>
</div>
<div class="section-title">${t('healthMonitoring.pdfHistoryTitle')}</div>
<table class="table">
  <thead><tr>
    <th style="text-align:left">${t('healthMonitoring.colTime')}</th><th>${t('healthMonitoring.bpSystolic')}</th><th>${t('healthMonitoring.bpDiastolic')}</th><th>${t('healthMonitoring.pulse')}</th>
    <th>${t('healthMonitoring.temperature')}</th><th>SpO₂</th><th>${t('healthMonitoring.bloodSugar')}</th><th>${t('healthMonitoring.weight')}</th><th>${t('healthMonitoring.evaluation')}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div class="signature-box"><p><b>${t('healthMonitoring.pdfResidentRep')}</b></p><p style="font-size:11px;color:#64748b">${t('healthMonitoring.pdfSignInstruction')}</p><div class="signature-line">${t('healthMonitoring.pdfFamilyConfirm')}</div></div>
  <div class="signature-box"><p>${t('healthMonitoring.pdfLocationDate', { day: new Date().getDate(), month: new Date().getMonth() + 1, year: new Date().getFullYear() })}</p><p><b>${t('healthMonitoring.pdfDoctorNurse')}</b></p><p style="font-size:11px;color:#64748b">${t('healthMonitoring.pdfSignStamp')}</p><div class="signature-line">${t('healthMonitoring.pdfProfConfirm')}</div></div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
};

// ─── SVG Line Chart ───
function VitalChart({ records, metricKey }) {
  const { t } = useTranslation();
  const CHART_METRICS = getChartMetrics(t);
  const metric = CHART_METRICS.find((m) => m.key === metricKey);
  const threshold = THRESHOLDS[metricKey];

  const data = useMemo(() => {
    return [...records]
      .filter((r) => r[metricKey] != null)
      .reverse()
      .slice(-20)
      .map((r) => ({ x: new Date(r.measuredAt), y: Number(r[metricKey]) }));
  }, [records, metricKey]);

  if (data.length < 2) {
    return (
      <div className="hm-chart-empty">
        <BarChart2 size={32} />
        <p>{t('healthMonitoring.chartMinRecords')}</p>
      </div>
    );
  }

  const W = 800, H = 230, PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const yMin = Math.min(...data.map((d) => d.y));
  const yMax = Math.max(...data.map((d) => d.y));
  const yPad = Math.max((yMax - yMin) * 0.15, 5);
  const yLow = yMin - yPad;
  const yHigh = yMax + yPad;

  const xScale = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - yLow) / (yHigh - yLow)) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.y).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${xScale(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const gradId = `grad-${metricKey}`;
  const yTicks = 5;
  const yTickStep = (yHigh - yLow) / yTicks;

  return (
    <div>
      <svg className="hm-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = yLow + i * yTickStep;
          const cy = yScale(val);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={cy} y2={cy} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 6} y={cy + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val.toFixed(0)}</text>
            </g>
          );
        })}
        {threshold && (
          <>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(threshold.max)} y2={yScale(threshold.max)} stroke="#f87171" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7" />
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(threshold.min)} y2={yScale(threshold.min)} stroke="#f87171" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7" />
            <text x={PAD.left + innerW + 4} y={yScale(threshold.max) + 4} fontSize="9" fill="#f87171">Max</text>
            <text x={PAD.left + innerW + 4} y={yScale(threshold.min) + 4} fontSize="9" fill="#f87171">Min</text>
          </>
        )}
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.y)} r="4" fill="#ffffff" stroke={metric.color} strokeWidth="2" />
            <title>{`${formatDT(d.x)}: ${d.y} ${metric.unit}`}</title>
          </g>
        ))}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0).map((d) => {
          const origIdx = data.indexOf(d);
          return (
            <text key={origIdx} x={xScale(origIdx)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {new Date(d.x).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </text>
          );
        })}
      </svg>
      <div className="hm-chart-legend">
        <div className="hm-chart-legend-item">
          <div className="hm-chart-legend-dot" style={{ backgroundColor: metric.color }} />
          <span>{metric.label} ({metric.unit})</span>
        </div>
        {threshold && (
          <div className="hm-chart-legend-item">
            <div className="hm-chart-legend-dot" style={{ backgroundColor: '#f87171', borderRadius: '2px' }} />
            <span>{t('healthMonitoring.normalThreshold')}: {threshold.min}–{threshold.max} {threshold.unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function HealthMonitoringPage() {
  const { t } = useTranslation();
  // ── Residents ──
  const [residents, setResidents] = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [resSearch, setResSearch] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');

  // ── Records ──
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recTotal, setRecTotal] = useState(0);
  const [recPage, setRecPage] = useState(1);
  const [recTotalPages, setRecTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  // ── Create drawer ──
  const [showCreate, setShowCreate] = useState(false);
  const [createClosing, setCreateClosing] = useState(false);
  const emptyForm = {
    residentId: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulse: '',
    temperatureCelsius: '',
    oxygenSaturation: '',
    bloodSugar: '',
    weightKg: '',
    heightCm: '',
    bloodType: '',
    summary: '',
    physicalExamination: '',
    laboratoryTestResults: '',
    urinalysisResults: '',
    ecgResults: '',
    imagingResults: '',
    cognitiveFunction: '',
    functionalStatus: '',
    fallRisk: '',
    nutritionalStatus: '',
    roomCost: '',
    medicationCost: '',
    careServiceCost: '',
    otherCost: '',
    paymentMethod: 'card',
    consentToPayment: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── View drawer ──
  const [viewRecord, setViewRecord] = useState(null);
  const [viewClosing, setViewClosing] = useState(false);

  // ── Tabs: history | chart ──
  const [activeTab, setActiveTab] = useState('history');
  const [chartMetric, setChartMetric] = useState('bloodPressureSystolic');

  // ── Derived ──
  const selectedResident = useMemo(
    () => residents.find((r) => r._id === selectedResidentId) || null,
    [residents, selectedResidentId]
  );

  const stats = useMemo(() => {
    const abnormal = records.filter((r) => r.abnormalFlag).length;
    const latestTime = records[0]?.measuredAt ? formatDT(records[0].measuredAt) : '—';
    return { total: recTotal, abnormal, latestTime };
  }, [records, recTotal]);

  // ── Load residents ──
  const loadResidents = useCallback(async () => {
    try {
      setResLoading(true);
      const res = await residentService.listForAssignment({ status: 'admitted,pending', limit: 200 });
      const list = res?.data || [];
      const withAbnormal = await Promise.all(
        list.map(async (r) => {
          try {
            const h = await medicalRecordService.getVitalsHistory(r._id, { limit: 1 });
            const latest = h?.data?.[0] ?? null;
            return { ...r, _hasAbnormal: latest?.abnormalFlag === true, _latestRecord: latest };
          } catch {
            return { ...r, _hasAbnormal: false, _latestRecord: null };
          }
        })
      );
      setResidents(withAbnormal);
    } catch (e) {
      console.error('Failed to load residents:', e);
    } finally {
      setResLoading(false);
    }
  }, []);

  useEffect(() => { loadResidents(); }, [loadResidents]);

  // ── Load history ──
  const loadHistory = useCallback(async (residentId, page = 1, from = '', to = '') => {
    if (!residentId) return;
    try {
      setRecLoading(true);
      const res = await medicalRecordService.getVitalsHistory(residentId, {
        page,
        limit: 10,
        from: from || undefined,
        to: to || undefined,
      });
      setRecords(res?.data || []);
      setRecTotal(res?.total || 0);
      setRecTotalPages(res?.totalPages || 1);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedResidentId) {
      setRecPage(1);
      loadHistory(selectedResidentId, 1, appliedFrom, appliedTo);
    } else {
      setRecords([]);
      setRecTotal(0);
      setRecTotalPages(1);
    }
  }, [selectedResidentId, appliedFrom, appliedTo, loadHistory]);

  useEffect(() => {
    if (selectedResidentId && recPage > 1) {
      loadHistory(selectedResidentId, recPage, appliedFrom, appliedTo);
    }
  }, [recPage]); // eslint-disable-line

  // ── Resident select ──
  const handleResidentChange = (e) => {
    const id = e.target.value;
    setSelectedResidentId(id);
    setRecPage(1);
    setAppliedFrom('');
    setAppliedTo('');
    setFromDate('');
    setToDate('');
    setActiveTab('history');
  };

  // ── Filter ──
  const handleApplyFilter = () => {
    setRecPage(1);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setAppliedFrom('');
    setAppliedTo('');
    setRecPage(1);
  };

  // ── Filtered residents for search ──
  const filteredResidents = useMemo(() => {
    const q = resSearch.toLowerCase().trim();
    if (!q) return residents;
    return residents.filter((r) =>
      (r.fullName || '').toLowerCase().includes(q) ||
      (r.residentCode || '').toLowerCase().includes(q)
    );
  }, [residents, resSearch]);

  // ── Open create drawer ──
  const openCreate = () => {
    setForm({ ...emptyForm, residentId: selectedResidentId });
    setFormError(null);
    setFormSuccess(false);
    setShowCreate(true);
    setCreateClosing(false);
  };

  const closeCreate = () => {
    setCreateClosing(true);
    setTimeout(() => {
      setShowCreate(false);
      setCreateClosing(false);
    }, 250);
  };

  // ── Open view drawer ──
  const openView = (rec) => {
    setViewRecord(rec);
    setViewClosing(false);
  };

  const closeView = () => {
    setViewClosing(true);
    setTimeout(() => {
      setViewRecord(null);
      setViewClosing(false);
    }, 250);
  };

  // ── Submit form ──
  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    const targetResidentId = form.residentId || selectedResidentId;
    if (!targetResidentId) {
      setFormError(t('healthMonitoring.errSelectResident'));
      return;
    }
    setFormSaving(true);
    setFormError(null);
    setFormSuccess(false);
    try {
      const body = {};
      if (form.bloodPressureSystolic !== '') body.bloodPressureSystolic = parseInt(form.bloodPressureSystolic, 10);
      if (form.bloodPressureDiastolic !== '') body.bloodPressureDiastolic = parseInt(form.bloodPressureDiastolic, 10);
      if (form.pulse !== '') body.pulse = parseInt(form.pulse, 10);
      if (form.temperatureCelsius !== '') body.temperatureCelsius = parseFloat(form.temperatureCelsius);
      if (form.oxygenSaturation !== '') body.oxygenSaturation = parseInt(form.oxygenSaturation, 10);
      if (form.bloodSugar !== '') body.bloodSugar = parseFloat(form.bloodSugar);
      if (form.weightKg !== '') body.weightKg = parseFloat(form.weightKg);
      if (form.heightCm !== '') body.heightCm = parseFloat(form.heightCm);
      if (form.bloodType && form.bloodType !== 'unknown') body.bloodType = form.bloodType;
      if (form.summary.trim()) body.summary = form.summary.trim();
      if (form.physicalExamination.trim()) body.physicalExamination = form.physicalExamination.trim();
      if (form.laboratoryTestResults.trim()) body.laboratoryTestResults = form.laboratoryTestResults.trim();
      if (form.urinalysisResults.trim()) body.urinalysisResults = form.urinalysisResults.trim();
      if (form.ecgResults.trim()) body.ecgResults = form.ecgResults.trim();
      if (form.imagingResults.trim()) body.imagingResults = form.imagingResults.trim();
      if (form.cognitiveFunction.trim()) body.cognitiveFunction = form.cognitiveFunction.trim();
      if (form.functionalStatus.trim()) body.functionalStatus = form.functionalStatus.trim();
      if (form.fallRisk.trim()) body.fallRisk = form.fallRisk.trim();
      if (form.nutritionalStatus.trim()) body.nutritionalStatus = form.nutritionalStatus.trim();
      if (form.roomCost !== '') body.roomCost = parseFloat(form.roomCost);
      if (form.medicationCost !== '') body.medicationCost = parseFloat(form.medicationCost);
      if (form.careServiceCost !== '') body.careServiceCost = parseFloat(form.careServiceCost);
      if (form.otherCost !== '') body.otherCost = parseFloat(form.otherCost);
      if (form.paymentMethod) body.paymentMethod = form.paymentMethod;
      if (form.consentToPayment) body.consentToPayment = true;

      await medicalRecordService.recordVitals(targetResidentId, body);
      setFormSuccess(true);
      setForm(emptyForm);
      // Reload data
      if (selectedResidentId === targetResidentId || selectedResidentId === '') {
        if (targetResidentId) {
          setSelectedResidentId(targetResidentId);
        }
        await loadHistory(targetResidentId, 1, appliedFrom, appliedTo);
        setRecPage(1);
      }
      loadResidents();
      setTimeout(() => setFormSuccess(false), 4000);
    } catch (err) {
      setFormError(err?.response?.data?.message || t('healthMonitoring.errSaveVitals'));
    } finally {
      setFormSaving(false);
    }
  };

  // ── Render helpers ──
  const renderVal = (key, val) => {
    if (val === undefined || val === null || val === '') return <span className="hm-value-empty">{'—'}</span>;
    const warn = isAbnormal(key, val);
    const t = THRESHOLDS[key];
    const display = t ? `${val} ${t.unit}` : String(val);
    return <span className={warn ? 'hm-value-abnormal' : 'hm-value-normal'}>{display}</span>;
  };

  const getHint = (key, val) => {
    const th = THRESHOLDS[key];
    if (!th) return '';
    const warn = val !== '' && isAbnormal(key, val);
    if (warn) return `${t('healthMonitoring.outsideNormal')} (${th.min}–${th.max} ${th.unit})`;
    return `${t('healthMonitoring.normal')}: ${th.min}–${th.max} ${th.unit}`;
  };

  // ── Find resident name for a record ──
  const getResidentForRecord = (rec) => {
    if (rec.residentId && typeof rec.residentId === 'object') return rec.residentId;
    return selectedResident;
  };

  return (
    <div className="hm-page">
      {/* ── Header ── */}
      <div className="hm-header">
        <div className="hm-header-left">
          <h1>
            <HeartPulse size={26} />
            {t('healthMonitoring.pageTitle')}
          </h1>
          <p>{t('healthMonitoring.pageSubtitle')}</p>
        </div>
        <div className="hm-header-actions">
          <button className="hm-btn hm-btn-ghost" onClick={loadResidents} disabled={resLoading}>
            <RefreshCw size={15} className={resLoading ? 'hm-spin' : ''} />
            {t('healthMonitoring.refresh')}
          </button>
          <button className="hm-btn hm-btn-primary" onClick={openCreate}>
            <Plus size={15} />
            {t('healthMonitoring.recordVitals')}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="hm-filter-bar">
        <div className="hm-search-wrap">
          <Search size={15} className="hm-search-icon" />
          <input
            className="hm-search-input"
            placeholder={t('healthMonitoring.searchPlaceholder')}
            value={resSearch}
            onChange={(e) => setResSearch(e.target.value)}
          />
        </div>

        <select
          className="hm-filter-select"
          value={selectedResidentId}
          onChange={handleResidentChange}
        >
          <option value="">{t('healthMonitoring.selectResident')}</option>
          {filteredResidents.map((r) => (
            <option key={r._id} value={r._id}>
              {r.fullName} {r.residentCode ? `(#${r.residentCode})` : ''} {r._hasAbnormal ? ' [!]' : ''}
            </option>
          ))}
        </select>

        <div className="hm-filter-divider" />

        <span className="hm-filter-label">
          <Calendar size={13} /> {t('healthMonitoring.from')}
        </span>
        <input
          type="date"
          className="hm-date-input"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <span className="hm-filter-sep">{t('healthMonitoring.to')}</span>
        <input
          type="date"
          className="hm-date-input"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <div className="hm-filter-actions">
          <button className="hm-btn hm-btn-ghost hm-btn-sm" onClick={handleResetFilter}>{t('healthMonitoring.clear')}</button>
          <button className="hm-btn hm-btn-primary hm-btn-sm" onClick={handleApplyFilter}>{t('healthMonitoring.apply')}</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="hm-stats">
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--blue"><ClipboardList size={22} /></div>
          <div className="hm-stat-info">
            <span className="hm-stat-label">{t('healthMonitoring.statTotalRecords')}</span>
            <span className="hm-stat-value">{selectedResident ? stats.total : '—'}</span>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--red"><AlertTriangle size={22} /></div>
          <div className="hm-stat-info">
            <span className="hm-stat-label">{t('healthMonitoring.abnormal')}</span>
            <span className="hm-stat-value">{selectedResident ? stats.abnormal : '—'}</span>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--green"><Clock size={22} /></div>
          <div className="hm-stat-info">
            <span className="hm-stat-label">{t('healthMonitoring.statLatest')}</span>
            <span className="hm-stat-value" style={{ fontSize: '14px' }}>{selectedResident ? stats.latestTime : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="hm-table-card">
        {/* Tabs */}
        <div className="hm-tabs">
          <button className={`hm-tab-btn${activeTab === 'history' ? ' is-active' : ''}`} onClick={() => setActiveTab('history')}>
            <ClipboardList size={15} /> {t('healthMonitoring.tabHistory')}
          </button>
          <button className={`hm-tab-btn${activeTab === 'chart' ? ' is-active' : ''}`} onClick={() => setActiveTab('chart')}>
            <BarChart2 size={15} /> {t('healthMonitoring.tabChart')}
          </button>
        </div>

        {/* ── Tab: History ── */}
        {activeTab === 'history' && (
          <>
            {!selectedResident ? (
              <div className="hm-no-data">
                <HeartPulse size={40} />
                <p>{t('healthMonitoring.selectResidentHint')}</p>
              </div>
            ) : recLoading ? (
              <div className="hm-no-data"><Loader2 size={24} className="hm-spin" /></div>
            ) : records.length === 0 ? (
              <div className="hm-no-data">
                {t('healthMonitoring.noRecords')}{(appliedFrom || appliedTo) ? ` ${t('healthMonitoring.inThisPeriod')}` : ''}.
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="hm-table-toolbar">
                  <div className="hm-table-title">
                    <Activity size={16} />
                    {t('healthMonitoring.measurementHistory')} - {selectedResident.fullName}
                  </div>
                  <div className="hm-table-toolbar-actions">
                    <button className="hm-btn hm-btn-ghost hm-btn-sm" onClick={() => exportToCSV(records, selectedResident, t)} disabled={records.length === 0}>
                      <Download size={13} /> CSV
                    </button>
                    <button className="hm-btn hm-btn-export hm-btn-sm" onClick={() => exportToPDF(records, selectedResident, t)} disabled={records.length === 0}>
                      <Download size={13} /> PDF
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="hm-table-wrap">
                  <table className="hm-table">
                    <thead>
                      <tr>
                        <th>{t('healthMonitoring.colTime')}</th>
                        <th>{t('healthMonitoring.bpSystolic')}</th>
                        <th>{t('healthMonitoring.bpDiastolic')}</th>
                        <th>{t('healthMonitoring.pulse')}</th>
                        <th>{t('healthMonitoring.temperature')}</th>
                        <th>SpO₂</th>
                        <th>{t('healthMonitoring.bloodSugar')}</th>
                        <th>{t('healthMonitoring.weight')}</th>
                        <th>{t('healthMonitoring.status')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec) => (
                        <tr key={rec._id} className={rec.abnormalFlag ? 'is-abnormal' : ''}>
                          <td><span className="hm-table-time">{formatDT(rec.measuredAt)}</span></td>
                          <td>{renderVal('bloodPressureSystolic', rec.bloodPressureSystolic)}</td>
                          <td>{renderVal('bloodPressureDiastolic', rec.bloodPressureDiastolic)}</td>
                          <td>{renderVal('pulse', rec.pulse)}</td>
                          <td>{renderVal('temperatureCelsius', rec.temperatureCelsius)}</td>
                          <td>{renderVal('oxygenSaturation', rec.oxygenSaturation)}</td>
                          <td>{rec.bloodSugar != null ? `${rec.bloodSugar} mmol/L` : <span className="hm-value-empty">{'—'}</span>}</td>
                          <td>{rec.weightKg != null ? `${rec.weightKg} kg` : <span className="hm-value-empty">{'—'}</span>}</td>
                          <td>
                            {rec.abnormalFlag
                              ? <span className="hm-badge-warn"><AlertTriangle size={10} /> {t('healthMonitoring.abnormal')}</span>
                              : <span className="hm-badge-normal"><CheckCircle size={10} /> {t('healthMonitoring.normal')}</span>}
                          </td>
                          <td>
                            <div className="hm-table-actions">
                              <button className="hm-table-action-btn" title={t('healthMonitoring.viewDetail')} onClick={() => openView(rec)}>
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {recTotalPages > 1 && (
                  <div className="hm-pagination">
                    <span className="hm-pagination-info">
                      {t('healthMonitoring.showing')} {(recPage - 1) * 10 + 1}–{Math.min(recPage * 10, recTotal)} / {recTotal} {t('healthMonitoring.records')}
                    </span>
                    <div className="hm-pagination-btns">
                      <button className="hm-btn hm-btn-ghost hm-btn-sm" disabled={recPage <= 1} onClick={() => setRecPage((p) => p - 1)}>
                        <ChevronLeft size={14} />
                      </button>
                      <span className="hm-pagination-text">{t('healthMonitoring.page')} {recPage} / {recTotalPages}</span>
                      <button className="hm-btn hm-btn-ghost hm-btn-sm" disabled={recPage >= recTotalPages} onClick={() => setRecPage((p) => p + 1)}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Tab: Chart ── */}
        {activeTab === 'chart' && (
          <div className="hm-tab-content">
            {!selectedResident ? (
              <div className="hm-no-data">
                <BarChart2 size={40} />
                <p>{t('healthMonitoring.selectResidentChart')}</p>
              </div>
            ) : (
              <>
                <div className="hm-chart-controls">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{t('healthMonitoring.metric')}:</span>
                  <select
                    className="hm-chart-select"
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value)}
                  >
                    {getChartMetrics(t).map((m) => (
                      <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t('healthMonitoring.chartMax20')}</span>
                </div>
                <div className="hm-chart-container">
                  {recLoading
                    ? <div className="hm-chart-empty"><Loader2 size={24} className="hm-spin" /></div>
                    : <VitalChart records={records} metricKey={chartMetric} />
                  }
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Create Drawer ── */}
      {showCreate && (
        <>
          <div className={`hm-drawer-overlay${createClosing ? ' is-closing' : ''}`} onClick={closeCreate} />
          <div className={`hm-drawer${createClosing ? ' is-closing' : ''}`}>
            <div className="hm-drawer-header">
              <div className="hm-drawer-title">
                <Activity size={20} />
                {t('healthMonitoring.recordVitalsTitle')}
              </div>
              <button className="hm-drawer-close" onClick={closeCreate}><X size={18} /></button>
            </div>

            <div className="hm-drawer-body">
              <form id="hm-create-form" onSubmit={handleSubmitVitals}>
                {formSuccess && (
                  <div className="hm-success-banner">
                    <CheckCircle size={16} /> {t('healthMonitoring.saveSuccess')}
                  </div>
                )}
                {formError && (
                  <div className="hm-error-banner">
                    <AlertTriangle size={16} /> {formError}
                  </div>
                )}

                {/* Resident select */}
                <div className="hm-form-section">
                  <div className="hm-form-section-title">
                    <HeartPulse size={15} /> {t('healthMonitoring.resident')}
                  </div>
                  <div className="hm-form-group">
                    <label className="hm-form-label">{t('healthMonitoring.selectResidentLabel')} *</label>
                    <select
                      className="hm-form-select"
                      value={form.residentId}
                      onChange={(e) => setForm((prev) => ({ ...prev, residentId: e.target.value }))}
                      required
                    >
                      <option value="">{t('healthMonitoring.selectResident')}</option>
                      {residents.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.fullName} {r.residentCode ? `(#${r.residentCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vital Signs */}
                <div className="hm-form-section">
                  <div className="hm-form-section-title">
                    <Thermometer size={15} /> {t('healthMonitoring.vitalSignsSection')}
                  </div>
                  <div className="hm-form-grid">
                    {[
                      { key: 'bloodPressureSystolic',  label: t('healthMonitoring.bpSystolic'),    placeholder: t('healthMonitoring.eg120') },
                      { key: 'bloodPressureDiastolic', label: t('healthMonitoring.bpDiastolic'), placeholder: t('healthMonitoring.eg80') },
                      { key: 'pulse',                  label: t('healthMonitoring.pulse'),       placeholder: t('healthMonitoring.eg72') },
                      { key: 'temperatureCelsius',     label: t('healthMonitoring.temperature'),       placeholder: t('healthMonitoring.eg368') },
                      { key: 'oxygenSaturation',       label: 'SpO₂ (%)',       placeholder: t('healthMonitoring.eg98') },
                      { key: 'bloodSugar',             label: t('healthMonitoring.bloodSugar'),   placeholder: t('healthMonitoring.eg55') },
                    ].map(({ key, label, placeholder }) => {
                      const val = form[key];
                      const warn = val !== '' && isAbnormal(key, val);
                      return (
                        <div key={key} className="hm-form-group">
                          <label className="hm-form-label">
                            {label} <span>{THRESHOLDS[key] ? `(${THRESHOLDS[key].unit})` : ''}</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            className={`hm-form-input${warn ? ' is-warn' : ''}`}
                            placeholder={placeholder}
                            value={val}
                            onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                          />
                          <span className={`hm-form-hint${warn ? ' is-warn' : ''}`}>{getHint(key, val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Other */}
                <div className="hm-form-section">
                  <div className="hm-form-section-title">
                    <Scale size={15} /> {t('healthMonitoring.otherMetrics')}
                  </div>
                  <div className="hm-form-grid">
                    <div className="hm-form-group">
                      <label className="hm-form-label">{t('healthMonitoring.weight')} <span>(kg)</span></label>
                      <input type="number" step="0.1" className="hm-form-input" placeholder={t('healthMonitoring.eg65')} value={form.weightKg} onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">{t('healthMonitoring.height')} <span>(cm)</span></label>
                      <input type="number" step="0.1" className="hm-form-input" placeholder={t('healthMonitoring.eg160')} value={form.heightCm} onChange={(e) => setForm((prev) => ({ ...prev, heightCm: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">{t('healthMonitoring.bloodType')}</label>
                      <select className="hm-form-select" value={form.bloodType} onChange={(e) => setForm((prev) => ({ ...prev, bloodType: e.target.value }))}>
                        <option value="">{t('healthMonitoring.noChange')}</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    </div>
                    <div className="hm-form-group full">
                      <label className="hm-form-label">{t('healthMonitoring.noteSummary')}</label>
                      <textarea className="hm-form-textarea" placeholder={t('healthMonitoring.noteSummaryPlaceholder')} value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Clinical */}
                <div className="hm-form-section">
                  <div className="hm-form-section-title">
                    <ClipboardList size={15} /> Khám lâm sàng & cận lâm sàng
                  </div>
                  <div className="hm-form-grid">
                    {[
                      { key: 'physicalExamination', label: 'Khám thực thể' },
                      { key: 'laboratoryTestResults', label: 'Kết quả xét nghiệm' },
                      { key: 'urinalysisResults', label: 'Kết quả nước tiểu' },
                      { key: 'ecgResults', label: 'Kết quả ECG' },
                      { key: 'imagingResults', label: 'Kết quả hình ảnh' },
                      { key: 'cognitiveFunction', label: 'Tình trạng nhận thức' },
                      { key: 'functionalStatus', label: 'Tình trạng chức năng' },
                      { key: 'fallRisk', label: 'Nguy cơ té ngã' },
                      { key: 'nutritionalStatus', label: 'Tình trạng dinh dưỡng' },
                    ].map(({ key, label }) => (
                      <div key={key} className="hm-form-group full">
                        <label className="hm-form-label">{label}</label>
                        <textarea
                          className="hm-form-textarea"
                          placeholder={`Nhập ${label.toLowerCase()}...`}
                          value={form[key]}
                          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="hm-form-section">
                  <div className="hm-form-section-title">
                    <Wallet size={15} /> Chi phí & Thanh toán
                  </div>
                  <div className="hm-form-grid">
                    <div className="hm-form-group">
                      <label className="hm-form-label">Chi phí phòng</label>
                      <input type="number" step="0.01" className="hm-form-input" placeholder="0" value={form.roomCost} onChange={(e) => setForm((prev) => ({ ...prev, roomCost: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">Chi phí thuốc</label>
                      <input type="number" step="0.01" className="hm-form-input" placeholder="0" value={form.medicationCost} onChange={(e) => setForm((prev) => ({ ...prev, medicationCost: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">Chi phí dịch vụ chăm sóc</label>
                      <input type="number" step="0.01" className="hm-form-input" placeholder="0" value={form.careServiceCost} onChange={(e) => setForm((prev) => ({ ...prev, careServiceCost: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">Chi phí khác</label>
                      <input type="number" step="0.01" className="hm-form-input" placeholder="0" value={form.otherCost} onChange={(e) => setForm((prev) => ({ ...prev, otherCost: e.target.value }))} />
                    </div>
                    <div className="hm-form-group">
                      <label className="hm-form-label">Phương thức thanh toán</label>
                      <select className="hm-form-select" value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                        <option value="card">Thẻ</option>
                        <option value="bank_transfer">Chuyển khoản</option>
                        <option value="wallet">Ví điện tử</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </div>
                    <div className="hm-form-group" style={{ justifyContent: 'center' }}>
                      <label className="hm-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.consentToPayment}
                          onChange={(e) => setForm((prev) => ({ ...prev, consentToPayment: e.target.checked }))}
                        />
                        Đồng ý thanh toán
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="hm-drawer-footer">
              <button type="submit" form="hm-create-form" className="hm-btn hm-btn-primary" disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <><Loader2 size={14} className="hm-spin" /> Đang lưu...</> : <><Activity size={14} /> Lưu chỉ số sức khỏe</>}
              </button>
              <button type="button" className="hm-btn hm-btn-ghost" onClick={() => setForm({ ...emptyForm, residentId: form.residentId })}>Xóa form</button>
            </div>
          </div>
        </>
      )}

      {/* ── View Drawer ── */}
      {viewRecord && (
        <>
          <div className={`hm-drawer-overlay${viewClosing ? ' is-closing' : ''}`} onClick={closeView} />
          <div className={`hm-drawer${viewClosing ? ' is-closing' : ''}`}>
            <div className="hm-drawer-header">
              <div className="hm-drawer-title">
                <Eye size={20} />
                Chi tiết bản ghi
              </div>
              <button className="hm-drawer-close" onClick={closeView}><X size={18} /></button>
            </div>

            <div className="hm-drawer-body">
              {/* Meta */}
              <div className="hm-view-meta">
                <div className="hm-view-meta-row">
                  <span className="hm-view-meta-label">Cư dân</span>
                  <span className="hm-view-meta-value">{getResidentForRecord(viewRecord)?.fullName || '—'}</span>
                </div>
                <div className="hm-view-meta-row">
                  <span className="hm-view-meta-label">Thời gian đo</span>
                  <span className="hm-view-meta-value">{formatDT(viewRecord.measuredAt)}</span>
                </div>
                <div className="hm-view-meta-row">
                  <span className="hm-view-meta-label">Trạng thái</span>
                  <span>
                    {viewRecord.abnormalFlag
                      ? <span className="hm-badge-warn"><AlertTriangle size={10} /> Bất thường</span>
                      : <span className="hm-badge-normal"><CheckCircle size={10} /> Bình thường</span>}
                  </span>
                </div>
              </div>

              {/* Vitals grid */}
              <div className="hm-vitals-grid">
                {[
                  { key: 'bloodPressureSystolic',  label: 'HA tâm thu',    unit: 'mmHg' },
                  { key: 'bloodPressureDiastolic', label: 'HA tâm trương', unit: 'mmHg' },
                  { key: 'pulse',                  label: 'Nhịp tim',       unit: 'l/p' },
                  { key: 'temperatureCelsius',     label: 'Nhiệt độ',       unit: '°C' },
                  { key: 'oxygenSaturation',       label: 'SpO₂',           unit: '%' },
                  { key: 'bloodSugar',             label: 'Đường huyết',   unit: 'mmol/L' },
                  { key: 'weightKg',               label: 'Cân nặng',       unit: 'kg' },
                  { key: 'heightCm',               label: 'Chiều cao',      unit: 'cm' },
                ].map(({ key, label, unit }) => {
                  const val = viewRecord[key];
                  const abnorm = isAbnormal(key, val);
                  return (
                    <div key={key} className={`hm-vital-item${abnorm ? ' is-abnormal' : ''}`}>
                      <span className="hm-vital-label">{label}</span>
                      <span className={`hm-vital-value${abnorm ? ' is-abnormal' : ''}`}>
                        {val != null ? val : '—'}
                      </span>
                      <span className="hm-vital-unit">{unit}</span>
                    </div>
                  );
                })}
              </div>

              {/* Notes section */}
              {viewRecord.summary && (
                <div style={{ marginTop: 20 }}>
                  <div className="hm-form-section-title" style={{ marginBottom: 8 }}>
                    <ClipboardList size={15} /> Ghi chú
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    {viewRecord.summary}
                  </div>
                </div>
              )}

              {/* Clinical notes */}
              {[
                { key: 'physicalExamination', label: 'Khám thực thể' },
                { key: 'laboratoryTestResults', label: 'Kết quả xét nghiệm' },
                { key: 'urinalysisResults', label: 'Kết quả nước tiểu' },
                { key: 'ecgResults', label: 'Kết quả ECG' },
                { key: 'imagingResults', label: 'Kết quả hình ảnh' },
                { key: 'cognitiveFunction', label: 'Tình trạng nhận thức' },
                { key: 'functionalStatus', label: 'Tình trạng chức năng' },
                { key: 'fallRisk', label: 'Nguy cơ té ngã' },
                { key: 'nutritionalStatus', label: 'Tình trạng dinh dưỡng' },
              ].filter(({ key }) => viewRecord[key]).map(({ key, label }) => (
                <div key={key} style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    {viewRecord[key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
