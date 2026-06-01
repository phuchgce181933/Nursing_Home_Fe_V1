import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  User,
  Calendar,
  Thermometer,
  Droplet,
  Wind,
  Scale,
} from 'lucide-react';
import medicalRecordService from '../../services/medicalRecord.service';
import residentService from '../../services/resident.service';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/shared/HealthMonitoringPage.css';

// ─── Ngưỡng bất thường (sync với backend checkAbnormalVitals) ───
const THRESHOLDS = {
  bloodPressureSystolic:  { min: 90,   max: 140,  unit: 'mmHg' },
  bloodPressureDiastolic: { min: 60,   max: 90,   unit: 'mmHg' },
  pulse:                  { min: 60,   max: 100,  unit: 'lần/phút' },
  temperatureCelsius:     { min: 35.0, max: 37.8, unit: '°C' },
  oxygenSaturation:       { min: 95,   max: 100,  unit: '%' },
};

// ─── Cấu hình biểu đồ ───
const CHART_METRICS = [
  { key: 'bloodPressureSystolic',  label: 'Huyết áp tâm thu',    color: '#ef4444', unit: 'mmHg' },
  { key: 'bloodPressureDiastolic', label: 'Huyết áp tâm trương', color: '#f97316', unit: 'mmHg' },
  { key: 'pulse',                  label: 'Nhịp tim',             color: '#8b5cf6', unit: 'lần/phút' },
  { key: 'temperatureCelsius',     label: 'Nhiệt độ',             color: '#ec4899', unit: '°C' },
  { key: 'oxygenSaturation',       label: 'SpO₂',                 color: '#06b6d4', unit: '%' },
  { key: 'bloodSugar',             label: 'Đường huyết',          color: '#10b981', unit: 'mmol/L' },
  { key: 'weightKg',               label: 'Cân nặng',             color: '#3b82f6', unit: 'kg' },
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

const formatAge = (dob) => {
  if (!dob) return null;
  const age = Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
  return `${age} tuổi`;
};

// ─── Xuất CSV (client-side) ───
const exportToCSV = (records, resident) => {
  if (!records.length) return;
  const headers = [
    'Thời gian đo', 'HA tâm thu (mmHg)', 'HA tâm trương (mmHg)', 'Nhịp tim (l/phút)',
    'Nhiệt độ (°C)', 'SpO₂ (%)', 'Đường huyết (mmol/L)', 'Cân nặng (kg)', 'Chiều cao (cm)',
    'Bất thường', 'Ghi chú',
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
    r.abnormalFlag ? 'Có' : 'Không',
    r.summary ?? '',
  ]);
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-report-${resident?.residentCode || 'resident'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Xuất PDF (client-side) ──
const exportToPDF = (records, resident) => {
  if (!records.length) return;
  
  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ bật lên (pop-up) để xuất báo cáo PDF.');
    return;
  }
  
  const age = resident.dateOfBirth
    ? Math.floor((Date.now() - new Date(resident.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
    : '—';
    
  const latest = records[0] || {};
  
  const getStatusText = (abnormal) => {
    return abnormal 
      ? '<span style="color: #ef4444; font-weight: bold; font-size: 11px;">Bất thường</span>'
      : '<span style="color: #10b981; font-weight: bold; font-size: 11px;">Bình thường</span>';
  };
  
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

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Báo cáo Sức khỏe - ${resident.fullName}</title>
      <meta charset="utf-8">
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
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header-left h2 {
          color: #1e3a8a;
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
          color: #3b82f6;
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
          color: #1e3a8a;
          border-left: 4px solid #3b82f6;
          padding-left: 8px;
          margin: 22px 0 10px 0;
          text-transform: uppercase;
        }
        
        .vitals-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .vital-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 8px;
          text-align: center;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01);
        }
        .vital-card-title {
          font-size: 10px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
        }
        .vital-card-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .vital-card-unit {
          font-size: 11px;
          color: #64748b;
          font-weight: normal;
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
          body {
            padding: 10px;
          }
          .no-print {
            display: none;
          }
          .table tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h2>HỆ THỐNG QUẢN LÝ VIỆN DƯỠNG LÃO NURSING HOME</h2>
          <p>Địa chỉ: Đường Đại Lộ Thăng Long, Hà Nội</p>
          <p>Điện thoại: (024) 3789 9999 | Email: contact@nursinghome.com</p>
        </div>
        <div class="header-right">
          <h3>BÁO CÁO Y TẾ CÁ NHÂN</h3>
          <p>Ngày xuất bản: ${new Date().toLocaleDateString('vi-VN')}</p>
          <p>Mã tài liệu: HS-${resident.residentCode || 'N/A'}</p>
        </div>
      </div>
      
      <div class="title-container">
        <h1>BÁO CÁO LỊCH SỬ CHỈ SỐ SỨC KHỎE</h1>
        <p>Tài liệu lưu hành nội bộ - Bảo mật thông tin y khoa của cư dân</p>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Họ tên cư dân:</span>
          <span class="info-value" style="font-weight: bold; text-transform: uppercase;">${resident.fullName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Mã số cư dân:</span>
          <span class="info-value" style="font-weight: bold; color: #1e3a8a;">#${resident.residentCode || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Ngày sinh:</span>
          <span class="info-value">${resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString('vi-VN') : '—'} (${age} tuổi)</span>
        </div>
        <div class="info-item">
          <span class="info-label">Giới tính:</span>
          <span class="info-value">${resident.gender === 'male' ? 'Nam' : resident.gender === 'female' ? 'Nữ' : 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Nhóm máu:</span>
          <span class="info-value">${resident.bloodType && resident.bloodType !== 'unknown' ? resident.bloodType : 'Chưa xác định'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Trạng thái/Phòng:</span>
          <span class="info-value">${resident.residencyStatus === 'pending' ? 'Chờ nhập viện' : resident.room?.roomCode ? 'Phòng ' + resident.room.roomCode : 'Chưa nhận phòng'}</span>
        </div>
      </div>
      
      <div class="section-title">Chỉ số đo gần nhất (${formatDT(latest.measuredAt)})</div>
      <div class="vitals-summary-grid">
        <div class="vital-card">
          <div class="vital-card-title">Huyết áp</div>
          <div class="vital-card-value" style="${getAbnormalTextClass('bloodPressureSystolic', latest.bloodPressureSystolic)}">${latest.bloodPressureSystolic ?? '—'}/${latest.bloodPressureDiastolic ?? '—'} <span class="vital-card-unit">mmHg</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-card-title">Nhịp tim</div>
          <div class="vital-card-value" style="${getAbnormalTextClass('pulse', latest.pulse)}">${latest.pulse ?? '—'} <span class="vital-card-unit">l/p</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-card-title">Nhiệt độ</div>
          <div class="vital-card-value" style="${getAbnormalTextClass('temperatureCelsius', latest.temperatureCelsius)}">${latest.temperatureCelsius ?? '—'} <span class="vital-card-unit">°C</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-card-title">Chỉ số SpO₂</div>
          <div class="vital-card-value" style="${getAbnormalTextClass('oxygenSaturation', latest.oxygenSaturation)}">${latest.oxygenSaturation ?? '—'} <span class="vital-card-unit">%</span></div>
        </div>
      </div>
      
      <div class="section-title">Lịch sử đo chỉ số sinh tồn và cân nặng</div>
      <table class="table">
        <thead>
          <tr>
            <th style="text-align: left;">Thời gian đo</th>
            <th>HA tâm thu</th>
            <th>HA tâm trương</th>
            <th>Nhịp tim</th>
            <th>Nhiệt độ</th>
            <th>SpO₂</th>
            <th>Đường huyết</th>
            <th>Cân nặng</th>
            <th>Đánh giá</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <div class="footer">
        <div class="signature-box">
          <p><b>Cư dân / Người đại diện</b></p>
          <p style="font-size: 11px; color: #64748b;">(Ký và ghi rõ họ tên)</p>
          <div class="signature-line">Xác nhận của gia đình</div>
        </div>
        <div class="signature-box">
          <p>Hà Nội, Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</p>
          <p><b>Bác sĩ / Nhân viên điều dưỡng phụ trách</b></p>
          <p style="font-size: 11px; color: #64748b;">(Ký tên và đóng dấu chuyên môn)</p>
          <div class="signature-line">Xác nhận chuyên môn</div>
        </div>
      </div>
      
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
};

// ─── SVG Line Chart ───
function VitalChart({ records, metricKey }) {
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
        <p>Cần ít nhất 2 bản ghi để vẽ biểu đồ</p>
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

        {/* Grid Y */}
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

        {/* Threshold lines */}
        {threshold && (
          <>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(threshold.max)} y2={yScale(threshold.max)} stroke="#f87171" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7" />
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(threshold.min)} y2={yScale(threshold.min)} stroke="#f87171" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7" />
            <text x={PAD.left + innerW + 4} y={yScale(threshold.max) + 4} fontSize="9" fill="#f87171">Max</text>
            <text x={PAD.left + innerW + 4} y={yScale(threshold.min) + 4} fontSize="9" fill="#f87171">Min</text>
          </>
        )}

        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.y)} r="4" fill="#ffffff" stroke={metric.color} strokeWidth="2" />
            <title>{`${formatDT(d.x)}: ${d.y} ${metric.unit}`}</title>
          </g>
        ))}

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0).map((d, _, arr) => {
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
            <span>Ngưỡng bình thường: {threshold.min}–{threshold.max} {threshold.unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function HealthMonitoringPage() {
  const { user } = useAuth();

  // ── Danh sách cư dân ──
  const [residents, setResidents] = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [resSearch, setResSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);

  // ── Lịch sử chỉ số ──
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recTotal, setRecTotal] = useState(0);
  const [recPage, setRecPage] = useState(1);
  const [recTotalPages, setRecTotalPages] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  // ── Form nhập chỉ số ──
  const emptyForm = { bloodPressureSystolic: '', bloodPressureDiastolic: '', pulse: '', temperatureCelsius: '', oxygenSaturation: '', bloodSugar: '', weightKg: '', heightCm: '', bloodType: '', summary: '' };
  const [form, setForm] = useState(emptyForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Biểu đồ ──
  const [chartMetric, setChartMetric] = useState('bloodPressureSystolic');

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('history');

  // ── Stats tổng hợp ──
  const stats = useMemo(() => {
    const total = residents.length;
    const abnormal = residents.filter((r) => r._hasAbnormal).length;
    return { total, abnormal, normal: total - abnormal };
  }, [residents]);

  // ─── Load danh sách cư dân ───
  const loadResidents = useCallback(async () => {
    try {
      setResLoading(true);
      const res = await residentService.listForAssignment({ status: 'admitted,pending', limit: 200 });
      const list = res?.data || [];
      // Fetch latest abnormal record for each resident (batch; allow failures)
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

  // ─── Load lịch sử khi chọn cư dân hoặc filter thay đổi ───
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
    if (selectedResident) {
      setRecPage(1);
      loadHistory(selectedResident._id, 1, appliedFrom, appliedTo);
    }
  }, [selectedResident, appliedFrom, appliedTo, loadHistory]);

  useEffect(() => {
    if (selectedResident) {
      loadHistory(selectedResident._id, recPage, appliedFrom, appliedTo);
    }
  }, [recPage]); // eslint-disable-line

  // ─── Chọn cư dân ───
  const handleSelectResident = (r) => {
    setSelectedResident(r);
    setActiveTab('history');
    setForm(emptyForm);
    setFormError(null);
    setFormSuccess(false);
    setRecPage(1);
    setAppliedFrom('');
    setAppliedTo('');
    setFromDate('');
    setToDate('');
  };

  // ─── Apply filter ───
  const handleApplyFilter = () => {
    setRecPage(1);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleResetFilter = () => {
    setFromDate(''); setToDate('');
    setAppliedFrom(''); setAppliedTo('');
    setRecPage(1);
  };

  // ─── Submit form nhập chỉ số ───
  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    if (!selectedResident) return;
    setFormSaving(true);
    setFormError(null);
    setFormSuccess(false);
    try {
      const body = {};
      if (form.bloodPressureSystolic !== '') body.bloodPressureSystolic  = parseInt(form.bloodPressureSystolic, 10);
      if (form.bloodPressureDiastolic !== '') body.bloodPressureDiastolic = parseInt(form.bloodPressureDiastolic, 10);
      if (form.pulse !== '')                body.pulse                 = parseInt(form.pulse, 10);
      if (form.temperatureCelsius !== '')   body.temperatureCelsius    = parseFloat(form.temperatureCelsius);
      if (form.oxygenSaturation !== '')     body.oxygenSaturation      = parseInt(form.oxygenSaturation, 10);
      if (form.bloodSugar !== '')           body.bloodSugar            = parseFloat(form.bloodSugar);
      if (form.weightKg !== '')             body.weightKg              = parseFloat(form.weightKg);
      if (form.heightCm !== '')             body.heightCm              = parseFloat(form.heightCm);
      if (form.bloodType && form.bloodType !== 'unknown') body.bloodType = form.bloodType;
      if (form.summary.trim())              body.summary               = form.summary.trim();

      await medicalRecordService.recordVitals(selectedResident._id, body);
      setFormSuccess(true);
      setForm(emptyForm);
      // Reload history and resident list to update abnormal badge
      await loadHistory(selectedResident._id, 1, appliedFrom, appliedTo);
      setRecPage(1);
      loadResidents();
      setTimeout(() => setFormSuccess(false), 4000);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Không thể lưu chỉ số. Vui lòng thử lại.');
    } finally {
      setFormSaving(false);
    }
  };

  // ─── Filtered residents (search) ───
  const filteredResidents = useMemo(() => {
    const q = resSearch.toLowerCase().trim();
    if (!q) return residents;
    return residents.filter((r) =>
      (r.fullName || '').toLowerCase().includes(q) ||
      (r.residentCode || '').toLowerCase().includes(q)
    );
  }, [residents, resSearch]);

  // ─── Latest record for alert banner ───
  const latestRecord = records[0] ?? selectedResident?._latestRecord ?? null;
  const hasAbnormal = latestRecord?.abnormalFlag === true;

  // ─── Render value with abnormal highlight ───
  const renderVal = (key, val) => {
    if (val === undefined || val === null || val === '') return <span style={{ color: '#cbd5e1' }}>—</span>;
    const warn = isAbnormal(key, val);
    const t = THRESHOLDS[key];
    const display = t ? `${val} ${t.unit}` : String(val);
    return <span className={warn ? 'hm-value-abnormal' : 'hm-value-normal'}>{display}</span>;
  };

  // ─── Hint text for form inputs ───
  const getHint = (key, val) => {
    const t = THRESHOLDS[key];
    if (!t) return `${t?.unit || ''}`;
    const warn = val !== '' && isAbnormal(key, val);
    if (warn) return `⚠ Ngoài ngưỡng bình thường (${t.min}–${t.max} ${t.unit})`;
    return `Bình thường: ${t.min}–${t.max} ${t.unit}`;
  };

  return (
    <div className="hm-page">
      {/* ── Header ── */}
      <div className="hm-header">
        <div className="hm-header-left">
          <h1>
            <HeartPulse size={26} />
            Theo Dõi Sức Khỏe
          </h1>
          <p>Theo dõi, cập nhật chỉ số sinh tồn và sức khỏe của người cao tuổi đang cư trú.</p>
        </div>
        <button className="hm-btn hm-btn-ghost" onClick={loadResidents} disabled={resLoading}>
          <RefreshCw size={15} className={resLoading ? 'hm-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="hm-stats">
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--blue"><User size={20} /></div>
          <div>
            <span className="hm-stat-label">Cư dân đang nhập viện</span>
            <span className="hm-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--green"><CheckCircle size={20} /></div>
          <div>
            <span className="hm-stat-label">Chỉ số bình thường</span>
            <span className="hm-stat-value">{stats.normal}</span>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--red"><AlertTriangle size={20} /></div>
          <div>
            <span className="hm-stat-label">Có chỉ số bất thường</span>
            <span className="hm-stat-value">{stats.abnormal}</span>
          </div>
        </div>
        <div className="hm-stat-card">
          <div className="hm-stat-icon hm-stat-icon--purple"><Activity size={20} /></div>
          <div>
            <span className="hm-stat-label">Bản ghi đã chọn</span>
            <span className="hm-stat-value">{selectedResident ? recTotal : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="hm-split">
        {/* ── LEFT: Resident List ── */}
        <div className="hm-list-panel">
          <div className="hm-list-header">
            <h3>Danh sách cư dân</h3>
            <div className="hm-search-wrap">
              <Search size={14} className="hm-search-icon" />
              <input
                id="hm-resident-search"
                className="hm-search-input"
                placeholder="Tìm tên hoặc mã cư dân..."
                value={resSearch}
                onChange={(e) => setResSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="hm-list-body">
            {resLoading && <div className="hm-list-loading"><Loader2 size={20} className="hm-spin" /></div>}
            {!resLoading && filteredResidents.length === 0 && (
              <div className="hm-list-empty">Không tìm thấy cư dân nào</div>
            )}
            {!resLoading && filteredResidents.map((r) => (
              <div
                key={r._id}
                className={`hm-resident-item${selectedResident?._id === r._id ? ' is-selected' : ''}${r._hasAbnormal ? ' has-abnormal' : ''}`}
                onClick={() => handleSelectResident(r)}
              >
                <div>
                  <div className="hm-resident-name">{r.fullName}</div>
                  <div className="hm-resident-meta">#{r.residentCode || r._id?.slice(-6)}</div>
                </div>
                <div className="hm-resident-badges">
                  {r.residencyStatus === 'pending' && (
                    <span className="hm-badge-room" style={{ backgroundColor: '#fffbeb', color: '#d97706', borderColor: '#fef3c7' }}>Chờ nhập viện</span>
                  )}
                  {r.room?.roomCode && <span className="hm-badge-room">{r.room.roomCode}</span>}
                  {r._hasAbnormal && (
                    <span className="hm-badge-abnormal"><AlertTriangle size={10} />Bất thường</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Detail Panel ── */}
        <div className="hm-detail-panel">
          {!selectedResident ? (
            <div className="hm-detail-empty">
              <HeartPulse size={48} />
              <p>Chọn một cư dân để xem và cập nhật hồ sơ sức khỏe</p>
            </div>
          ) : (
            <>
              {/* Profile card */}
              <div className="hm-profile-card">
                <div className="hm-profile-top">
                  <div>
                    <p className="hm-profile-name">{selectedResident.fullName}</p>
                    <p className="hm-profile-code">#{selectedResident.residentCode}</p>
                  </div>
                  <button
                    className="hm-btn hm-btn-export"
                    style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}
                    onClick={() => exportToPDF(records, selectedResident)}
                    disabled={records.length === 0}
                    title="Xuất báo cáo PDF"
                  >
                    <Download size={14} /> Xuất PDF
                  </button>
                </div>
                <div className="hm-profile-info">
                  {selectedResident.dateOfBirth && (
                    <div className="hm-profile-info-item">
                      <span className="hm-profile-info-label">Tuổi</span>
                      <span className="hm-profile-info-value">{formatAge(selectedResident.dateOfBirth)}</span>
                    </div>
                  )}
                  <div className="hm-profile-info-item">
                    <span className="hm-profile-info-label">Giới tính</span>
                    <span className="hm-profile-info-value">
                      {selectedResident.gender === 'male' ? 'Nam' : selectedResident.gender === 'female' ? 'Nữ' : 'N/A'}
                    </span>
                  </div>
                  {selectedResident.bloodType && selectedResident.bloodType !== 'unknown' && (
                    <div className="hm-profile-info-item">
                      <span className="hm-profile-info-label">Nhóm máu</span>
                      <span className="hm-profile-info-value">{selectedResident.bloodType}</span>
                    </div>
                  )}
                  {selectedResident.room?.roomCode && (
                    <div className="hm-profile-info-item">
                      <span className="hm-profile-info-label">Phòng</span>
                      <span className="hm-profile-info-value">{selectedResident.room.roomCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Alert banner */}
              {hasAbnormal && (
                <div className="hm-alert-banner">
                  <AlertTriangle size={18} className="hm-alert-icon" />
                  <div>
                    <span className="hm-alert-title">⚠ Cảnh báo: Chỉ số bất thường được phát hiện!</span>
                    <span className="hm-alert-details">
                      Bản ghi gần nhất ({formatDT(latestRecord?.measuredAt)}) có các chỉ số vượt ngưỡng bình thường.
                      Vui lòng kiểm tra và xử lý kịp thời.
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="hm-tabs">
                <button
                  id="hm-tab-history"
                  className={`hm-tab-btn${activeTab === 'history' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <ClipboardList size={15} /> Lịch sử
                </button>
                <button
                  id="hm-tab-update"
                  className={`hm-tab-btn${activeTab === 'update' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('update')}
                >
                  <Activity size={15} /> Cập nhật chỉ số
                </button>
                <button
                  id="hm-tab-chart"
                  className={`hm-tab-btn${activeTab === 'chart' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                >
                  <BarChart2 size={15} /> Biểu đồ
                </button>
              </div>

              {/* ── TAB: Lịch sử ── */}
              {activeTab === 'history' && (
                <div className="hm-tab-content">
                  {/* Filter bar */}
                  <div className="hm-filter-bar">
                    <span className="hm-filter-label"><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Thời gian:</span>
                    <input
                      id="hm-filter-from"
                      type="date"
                      className="hm-date-input"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>đến</span>
                    <input
                      id="hm-filter-to"
                      type="date"
                      className="hm-date-input"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                    <div className="hm-filter-actions">
                      <button className="hm-btn hm-btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleResetFilter}>Xóa</button>
                      <button className="hm-btn hm-btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={handleApplyFilter}>Áp dụng</button>
                    </div>
                  </div>

                  {/* Table */}
                  {recLoading ? (
                    <div className="hm-no-data"><Loader2 size={22} className="hm-spin" /></div>
                  ) : records.length === 0 ? (
                    <div className="hm-no-data">Chưa có bản ghi sức khỏe nào{(appliedFrom || appliedTo) ? ' trong khoảng thời gian này' : ''}.</div>
                  ) : (
                    <>
                      <div className="hm-table-wrap">
                        <table className="hm-table">
                          <thead>
                            <tr>
                              <th>Thời gian</th>
                              <th>HA tâm thu</th>
                              <th>HA tâm trương</th>
                              <th>Nhịp tim</th>
                              <th>Nhiệt độ</th>
                              <th>SpO₂</th>
                              <th>Đường huyết</th>
                              <th>Cân nặng</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((rec) => (
                              <tr key={rec._id} className={rec.abnormalFlag ? 'is-abnormal' : ''}>
                                <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b' }}>{formatDT(rec.measuredAt)}</td>
                                <td>{renderVal('bloodPressureSystolic',  rec.bloodPressureSystolic)}</td>
                                <td>{renderVal('bloodPressureDiastolic', rec.bloodPressureDiastolic)}</td>
                                <td>{renderVal('pulse',                  rec.pulse)}</td>
                                <td>{renderVal('temperatureCelsius',     rec.temperatureCelsius)}</td>
                                <td>{renderVal('oxygenSaturation',       rec.oxygenSaturation)}</td>
                                <td>{rec.bloodSugar != null ? `${rec.bloodSugar} mmol/L` : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                <td>{rec.weightKg != null ? `${rec.weightKg} kg` : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                <td>
                                  {rec.abnormalFlag
                                    ? <span className="hm-badge-warn"><AlertTriangle size={10} /> Bất thường</span>
                                    : <span className="hm-badge-normal"><CheckCircle size={10} /> Bình thường</span>}
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
                            Hiển thị {(recPage - 1) * 10 + 1}–{Math.min(recPage * 10, recTotal)} / {recTotal} bản ghi
                          </span>
                          <div className="hm-pagination-btns">
                            <button className="hm-btn hm-btn-ghost" style={{ padding: '5px 10px' }} disabled={recPage <= 1} onClick={() => setRecPage(p => p - 1)}>
                              <ChevronLeft size={14} />
                            </button>
                            <span style={{ fontSize: '12.5px', color: '#475569' }}>Trang {recPage} / {recTotalPages}</span>
                            <button className="hm-btn hm-btn-ghost" style={{ padding: '5px 10px' }} disabled={recPage >= recTotalPages} onClick={() => setRecPage(p => p + 1)}>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── TAB: Cập nhật chỉ số ── */}
              {activeTab === 'update' && (
                <div className="hm-tab-content">
                  <form onSubmit={handleSubmitVitals}>
                    {formSuccess && (
                      <div className="hm-success-banner">
                        <CheckCircle size={16} /> Đã lưu chỉ số sức khỏe thành công!
                      </div>
                    )}
                    {formError && (
                      <div className="hm-error-banner">
                        <AlertTriangle size={16} /> {formError}
                      </div>
                    )}

                    {/* Vital Signs */}
                    <div className="hm-form-section">
                      <div className="hm-form-section-title">
                        <Thermometer size={15} /> Chỉ số sinh tồn (Vital Signs)
                      </div>
                      <div className="hm-form-grid">
                        {[
                          { key: 'bloodPressureSystolic',  label: 'HA tâm thu',    placeholder: 'VD: 120' },
                          { key: 'bloodPressureDiastolic', label: 'HA tâm trương', placeholder: 'VD: 80' },
                          { key: 'pulse',                  label: 'Nhịp tim',       placeholder: 'VD: 72' },
                          { key: 'temperatureCelsius',     label: 'Nhiệt độ',       placeholder: 'VD: 36.8' },
                          { key: 'oxygenSaturation',       label: 'SpO₂ (%)',       placeholder: 'VD: 98' },
                          { key: 'bloodSugar',             label: 'Đường huyết',   placeholder: 'VD: 5.5' },
                        ].map(({ key, label, placeholder }) => {
                          const val = form[key];
                          const warn = val !== '' && isAbnormal(key, val);
                          return (
                            <div key={key} className="hm-form-group">
                              <label className="hm-form-label" htmlFor={`hm-input-${key}`}>
                                {label} <span>{THRESHOLDS[key] ? `(${THRESHOLDS[key].unit})` : ''}</span>
                              </label>
                              <input
                                id={`hm-input-${key}`}
                                type="number"
                                step="any"
                                className={`hm-form-input${warn ? ' is-warn' : ''}`}
                                placeholder={placeholder}
                                value={val}
                                onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                              />
                              <span className={`hm-form-hint${warn ? ' is-warn' : ''}`}>{getHint(key, val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Other indicators */}
                    <div className="hm-form-section" style={{ marginTop: '18px' }}>
                      <div className="hm-form-section-title">
                        <Scale size={15} /> Chỉ số khác
                      </div>
                      <div className="hm-form-grid">
                        <div className="hm-form-group">
                          <label className="hm-form-label" htmlFor="hm-input-weightKg">Cân nặng <span>(kg)</span></label>
                          <input id="hm-input-weightKg" type="number" step="0.1" className="hm-form-input" placeholder="VD: 65" value={form.weightKg} onChange={(e) => setForm(prev => ({ ...prev, weightKg: e.target.value }))} />
                        </div>
                        <div className="hm-form-group">
                          <label className="hm-form-label" htmlFor="hm-input-heightCm">Chiều cao <span>(cm)</span></label>
                          <input id="hm-input-heightCm" type="number" step="0.1" className="hm-form-input" placeholder="VD: 160" value={form.heightCm} onChange={(e) => setForm(prev => ({ ...prev, heightCm: e.target.value }))} />
                        </div>
                        <div className="hm-form-group">
                          <label className="hm-form-label" htmlFor="hm-input-bloodType">Nhóm máu</label>
                          <select id="hm-input-bloodType" className="hm-form-select" value={form.bloodType} onChange={(e) => setForm(prev => ({ ...prev, bloodType: e.target.value }))}>
                            <option value="">— Không thay đổi —</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                          </select>
                        </div>
                        <div className="hm-form-group full">
                          <label className="hm-form-label" htmlFor="hm-input-summary">Ghi chú / Tóm tắt tình trạng</label>
                          <textarea id="hm-input-summary" className="hm-form-textarea" placeholder="Nhập ghi chú về tình trạng sức khỏe..." value={form.summary} onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                      <button type="submit" className="hm-btn hm-btn-primary" disabled={formSaving} id="hm-submit-vitals">
                        {formSaving ? <><Loader2 size={14} className="hm-spin" /> Đang lưu...</> : <><Activity size={14} /> Lưu chỉ số sức khỏe</>}
                      </button>
                      <button type="button" className="hm-btn hm-btn-ghost" onClick={() => setForm(emptyForm)}>Xóa form</button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── TAB: Biểu đồ ── */}
              {activeTab === 'chart' && (
                <div className="hm-tab-content">
                  <div className="hm-chart-controls">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Chỉ số:</span>
                    <select
                      id="hm-chart-metric"
                      className="hm-chart-select"
                      value={chartMetric}
                      onChange={(e) => setChartMetric(e.target.value)}
                    >
                      {CHART_METRICS.map((m) => (
                        <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Hiển thị tối đa 20 bản ghi gần nhất</span>
                  </div>

                  <div className="hm-chart-container">
                    {recLoading
                      ? <div className="hm-chart-empty"><Loader2 size={24} className="hm-spin" /></div>
                      : <VitalChart records={records} metricKey={chartMetric} />
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
