import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, X, ChevronDown, FileText, Users, Layers, Clock,
  AlertCircle, Inbox,
} from 'lucide-react';
import AdminPageShell from '../../components/admin/AdminPageShell';
import auditLogService from '../../services/auditLog.service';
import ListPagination from '../../components/ui/ListPagination';
import ShiftAuditDetail, {
  formatShiftAuditDescription,
  isShiftAuditLog,
} from '../../components/admin/audit/ShiftAuditDetail';
import '../../styles/admin/AuditLogsPage.css';

const BUSINESS_MODULE_LABELS = {
  admission: 'admin.auditLogs.businessModules.admission',
  billing: 'admin.auditLogs.businessModules.billing',
  health: 'admin.auditLogs.businessModules.health',
  pharmacy: 'admin.auditLogs.businessModules.pharmacy',
  facility: 'admin.auditLogs.businessModules.facility',
  resident: 'admin.auditLogs.businessModules.resident',
  servicePackage: 'admin.auditLogs.businessModules.servicePackage',
  servicepackage: 'admin.auditLogs.businessModules.servicePackage',
  CareAppointment: 'admin.auditLogs.businessModules.careAppointment',
  careAppointment: 'admin.auditLogs.businessModules.careAppointment',
  Shift: 'admin.auditLogs.businessModules.shift',
  shift: 'admin.auditLogs.businessModules.shift',
  facilityTour: 'admin.auditLogs.businessModules.facilityTour',
  CareNote: 'admin.auditLogs.businessModules.careNote',
  careNote: 'admin.auditLogs.businessModules.careNote',
  activity: 'admin.auditLogs.businessModules.activity',
  incident: 'admin.auditLogs.businessModules.incident',
  billingPayment: 'admin.auditLogs.businessModules.billingPayment',
  billingInvoice: 'admin.auditLogs.businessModules.billingInvoice',
  pharmacyMedication: 'admin.auditLogs.businessModules.pharmacyMedication',
  pharmacySupplier: 'admin.auditLogs.businessModules.pharmacySupplier',
  consultationRequest: 'admin.auditLogs.businessModules.consultationRequest',
  wallet: 'admin.auditLogs.businessModules.wallet',
  staff: 'admin.auditLogs.businessModules.staff',
  dailyBehavior: 'admin.auditLogs.businessModules.dailyBehavior',
  hygieneActivity: 'admin.auditLogs.businessModules.hygieneActivity',
  mealIntake: 'admin.auditLogs.businessModules.mealIntake',
  mealPlan: 'admin.auditLogs.businessModules.mealPlan',
  mealTimeSchedule: 'admin.auditLogs.businessModules.mealTimeSchedule',
  specialDiet: 'admin.auditLogs.businessModules.specialDiet',
  careSchedule: 'admin.auditLogs.businessModules.careSchedule',
  careTask: 'admin.auditLogs.businessModules.careTask',
  leaveRequest: 'admin.auditLogs.businessModules.leaveRequest',
  dish: 'admin.auditLogs.businessModules.dish',
  clinicalService: 'admin.auditLogs.businessModules.clinicalService',
  conversation: 'admin.auditLogs.businessModules.conversation',
  medication: 'admin.auditLogs.businessModules.medication',
  auth: 'admin.auditLogs.businessModules.auth',
  contract: 'admin.auditLogs.businessModules.contract',
};

const ROLE_LABELS = {
  doctor: 'admin.auditLogs.roles.doctor',
  nurse: 'admin.auditLogs.roles.nurse',
  caregiver: 'admin.auditLogs.roles.caregiver',
  pharmacist: 'admin.auditLogs.roles.pharmacist',
  family: 'admin.auditLogs.roles.family',
  admin: 'admin.auditLogs.roles.admin',
};

const TARGET_ENTITY_LABELS = {
  Admission: 'admin.auditLogs.targetEntities.Admission',
  Resident: 'admin.auditLogs.targetEntities.Resident',
  Invoice: 'admin.auditLogs.targetEntities.Invoice',
  Payment: 'admin.auditLogs.targetEntities.Payment',
  Medication: 'admin.auditLogs.targetEntities.Medication',
  Supplier: 'admin.auditLogs.targetEntities.Supplier',
  ServicePackage: 'admin.auditLogs.targetEntities.ServicePackage',
  FacilityTour: 'admin.auditLogs.targetEntities.FacilityTour',
  CareAppointment: 'admin.auditLogs.targetEntities.CareAppointment',
  Shift: 'admin.auditLogs.targetEntities.Shift',
  CareNote: 'admin.auditLogs.targetEntities.CareNote',
  Activity: 'admin.auditLogs.targetEntities.Activity',
  Incident: 'admin.auditLogs.targetEntities.Incident',
  Building: 'admin.auditLogs.targetEntities.Building',
  Floor: 'admin.auditLogs.targetEntities.Floor',
  Room: 'admin.auditLogs.targetEntities.Room',
  Bed: 'admin.auditLogs.targetEntities.Bed',
  Equipment: 'admin.auditLogs.targetEntities.Equipment',
  MedicalRecord: 'admin.auditLogs.targetEntities.MedicalRecord',
  MedicationDispense: 'admin.auditLogs.targetEntities.MedicationDispense',
  Prescription: 'admin.auditLogs.targetEntities.Prescription',
  Health: 'admin.auditLogs.targetEntities.Health',
  Pharmacy: 'admin.auditLogs.targetEntities.Pharmacy',
  Servicepackage: 'admin.auditLogs.targetEntities.Servicepackage',
  ConsultationRequest: 'admin.auditLogs.targetEntities.ConsultationRequest',
  WalletTransaction: 'admin.auditLogs.targetEntities.WalletTransaction',
  DailyBehaviorRecord: 'admin.auditLogs.targetEntities.DailyBehaviorRecord',
  HygieneActivityRecord: 'admin.auditLogs.targetEntities.HygieneActivityRecord',
  MealIntakeNote: 'admin.auditLogs.targetEntities.MealIntakeNote',
  MealPlanDay: 'admin.auditLogs.targetEntities.MealPlanDay',
  MealTimeScheduleDay: 'admin.auditLogs.targetEntities.MealTimeScheduleDay',
  SpecialDietDay: 'admin.auditLogs.targetEntities.SpecialDietDay',
  CareScheduleDay: 'admin.auditLogs.targetEntities.CareScheduleDay',
  CareTask: 'admin.auditLogs.targetEntities.CareTask',
  LeaveRequest: 'admin.auditLogs.targetEntities.LeaveRequest',
  Dish: 'admin.auditLogs.targetEntities.Dish',
  ClinicalService: 'admin.auditLogs.targetEntities.ClinicalService',
  Conversation: 'admin.auditLogs.targetEntities.Conversation',
  MedicationSchedule: 'admin.auditLogs.targetEntities.MedicationSchedule',
  MedicalCharge: 'admin.auditLogs.targetEntities.MedicalCharge',
};

const ACTION_CATEGORY_KEYWORDS = {
  create: ['CREATE', 'ADD', 'REGISTER', 'RECORD', 'CHECK_IN', 'ASSIGN'],
  update: ['UPDATE', 'EDIT', 'MODIFY', 'APPROVE', 'REJECT', 'TRANSFER', 'EVALUATE', 'PRE_ADMISSION'],
  delete: ['DELETE', 'REMOVE', 'CANCEL'],
};

const getActionCategory = (action) => {
  if (!action) return 'other';
  const upper = String(action).toUpperCase();
  if (upper.startsWith('REQUEST_')) return 'system';
  for (const [category, keywords] of Object.entries(ACTION_CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) return category;
  }
  return 'other';
};

const ACTION_CATEGORY_LABELS = {
  create: 'admin.auditLogs.actionCategories.create',
  update: 'admin.auditLogs.actionCategories.update',
  delete: 'admin.auditLogs.actionCategories.delete',
  system: 'admin.auditLogs.actionCategories.system',
  other: 'admin.auditLogs.actionCategories.other',
};

const formatDateTime = (value, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatShortTime = (value, t, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('admin.auditLogs.timeAgo.justNow');
  if (diffMin < 60) return t('admin.auditLogs.timeAgo.minutesAgo', { count: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('admin.auditLogs.timeAgo.hoursAgo', { count: diffHour });
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

const truncateText = (text, length = 50) => {
  if (!text) return '—';
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

const formatCurrency = (value, locale = 'vi-VN') => {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const humanizeAction = (value) => {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatActionLabel = (actionKey, displayAction, t) => {
  if (!actionKey && !displayAction) return '—';
  const translationKey = actionKey ? `admin.auditLogs.actionNames.${actionKey}` : null;
  const translated = translationKey ? t(translationKey) : null;
  if (translated && translated !== translationKey) return translated;
  return displayAction || humanizeAction(actionKey);
};

const getDetailedActionMessage = (log, t, i18n) => {
  const actor = log.performedBy || log.actorUserId || 'Người dùng';
  const target = log.targetName || '—';
  const action = log.action;

  const isVi = i18n?.language === 'vi';

  // Resident actions
  if (action === 'CREATE_RESIDENT_PROFILE') {
    return isVi
      ? `${actor} đã tạo hồ sơ cư dân: ${target}`
      : `${actor} created resident profile: ${target}`;
  }
  if (action === 'UPDATE_RESIDENT_PERSONAL_INFO') {
    return isVi
      ? `${actor} đã cập nhật thông tin cá nhân cư dân ${target}`
      : `${actor} updated personal info of ${target}`;
  }
  if (action === 'UPDATE_RESIDENT_FAMILY_INFO') {
    return isVi
      ? `${actor} đã cập nhật thông tin gia đình cư dân ${target}`
      : `${actor} updated family info of ${target}`;
  }
  if (action === 'UPLOAD_RESIDENT_AVATAR') {
    return isVi
      ? `${actor} đã tải lên ảnh đại diện cư dân ${target}`
      : `${actor} uploaded avatar for ${target}`;
  }
  if (action === 'RELEASE_RESIDENT_ROOM_BED') {
    return isVi
      ? `${actor} đã giải phóng giường phòng của cư dân ${target}`
      : `${actor} released room bed of ${target}`;
  }

  // Care appointment actions
  if (action === 'CREATE_CARE_APPOINTMENT') {
    return isVi
      ? `${actor} đã tạo lịch hẹn chăm sóc cho ${target}`
      : `${actor} created care appointment for ${target}`;
  }
  if (action === 'UPDATE_CARE_APPOINTMENT') {
    return isVi
      ? `${actor} đã cập nhật lịch hẹn chăm sóc của ${target}`
      : `${actor} updated care appointment for ${target}`;
  }
  if (action === 'DELETE_CARE_APPOINTMENT') {
    return isVi
      ? `${actor} đã xóa lịch hẹn chăm sóc của ${target}`
      : `${actor} deleted care appointment for ${target}`;
  }
  if (action === 'UPDATE_APPOINTMENT_STATUS') {
    return isVi
      ? `${actor} đã cập nhật trạng thái lịch hẹn chăm sóc của ${target}`
      : `${actor} updated care appointment status for ${target}`;
  }
  if (action === 'ASSIGN_APPOINTMENT_DOCTOR') {
    return isVi
      ? `${actor} đã phân công bác sĩ cho lịch hẹn chăm sóc của ${target}`
      : `${actor} assigned doctor to care appointment ${target}`;
  }
  if (action === 'ASSIGN_APPOINTMENT_NURSE') {
    return isVi
      ? `${actor} đã phân công y tá cho lịch hẹn chăm sóc của ${target}`
      : `${actor} assigned nurse to care appointment ${target}`;
  }
  if (action === 'SEND_APPOINTMENT_REMINDER') {
    return isVi
      ? `${actor} đã gửi nhắc nhở cho lịch hẹn chăm sóc của ${target}`
      : `${actor} sent reminder for care appointment ${target}`;
  }

  // Default: use the action label
  const actionLabel = formatActionLabel(action, log.displayAction, t);
  return isVi
    ? `${actor} đã ${actionLabel.toLowerCase()} ${target !== '—' ? `(${target})` : ''}`
    : `${actor} ${actionLabel.toLowerCase()} ${target !== '—' ? `(${target})` : ''}`;
};

const formatBusinessModuleLabel = (moduleValue, t) => {
  if (!moduleValue) return '—';
  const i18nKey = BUSINESS_MODULE_LABELS[moduleValue];
  return i18nKey ? t(i18nKey) : moduleValue;
};

const formatRoleLabel = (roleValue, t) => {
  if (!roleValue) return '—';
  const i18nKey = ROLE_LABELS[roleValue];
  return i18nKey ? t(i18nKey) : roleValue;
};

const formatTargetLabel = (targetName, targetEntityType, t) => {
  if (targetName && targetName !== targetEntityType) return targetName;
  if (!targetEntityType) return '—';
  const i18nKey = TARGET_ENTITY_LABELS[targetEntityType];
  return i18nKey ? t(i18nKey) : targetEntityType;
};

const IGNORED_DIFF_KEYS = new Set([
  '_id', '__v', 'createdAt', 'updatedAt',
  'familyAccountId', 'residentId', 'attachmentsAdded',
]);

// Fields đã được hiển thị đầy đủ trong bảng "Danh sách thuốc trong hóa đơn"
// nên ẩn khỏi phần Changes để tránh trùng lặp.
const INVOICE_CREATE_IGNORED_KEYS = new Set([
  // Tổng tiền
  'subTotal',
  'tax',
  'total',
  'totalAmount',
  'originalTotalAmount',
  'remainingAmount',
  // Thành phần giá (đã tính trong bảng thuốc)
  'roomCost',
  'medicationCost',
  'careServiceCost',
  'otherCost',
  // Metadata đơn thuốc
  'type',
  'prescriptionId',
  // Danh sách line item (đã hiển thị ở bảng)
  'items',
  // Người dừng / thời điểm dừng (không cần hiển thị trong audit log)
  'deletedBy',
  'deletedById',
  'deletedAt',
  'cancellationReason',
  'rejectionReason',
]);

// Fields đã có trong header audit log (người thực hiện, thời gian) → ẩn khi dừng hóa đơn
const INVOICE_STOP_IGNORED_KEYS = new Set([
  'subTotal',
  'tax',
  'total',
  'totalAmount',
  'originalTotalAmount',
  'remainingAmount',
  'roomCost',
  'medicationCost',
  'careServiceCost',
  'otherCost',
  'type',
  'prescriptionId',
  'items',
  'deletedBy',
  'deletedById',
  'deletedAt',
]);

// Khi bác sĩ xác nhận ca (CONFIRM_SHIFT): chỉ hiện Trạng thái, ẩn Nhân viên phụ trách / Mẫu ca áp dụng
// vì những field này không thay đổi khi xác nhận và đã hiển thị ở phần header.
const SHIFT_CONFIRM_IGNORED_KEYS = new Set([
  'name',
  'workDate',
  'startTime',
  'endTime',
  'staffName',
  'templateName',
  'totalHours',
  'checkInTime',
  'checkOutTime',
]);

const getPerActionIgnoredKeys = (action) => {
  if (action === 'CREATE_INVOICE') return INVOICE_CREATE_IGNORED_KEYS;
  if (action === 'SOFT_DELETE_DRAFT_INVOICE' || action === 'CANCEL_INVOICE' || action === 'STOP_INVOICE') {
    return INVOICE_STOP_IGNORED_KEYS;
  }
  if (action === 'CONFIRM_SHIFT') return SHIFT_CONFIRM_IGNORED_KEYS;
  return null;
};

const INCIDENT_ROOT_CAUSE_LABEL_MAP = {
  vi: {
    'Wet Floor': 'Sàn ướt',
    'Resident Lost Balance': 'Cư dân mất thăng bằng',
    'Equipment Failure': 'Hỏng thiết bị',
    'Staff Error': 'Lỗi nhân viên',
    Unknown: 'Không rõ',
    Other: 'Khác',
  },
  en: {
    'Wet Floor': 'Wet floor',
    'Resident Lost Balance': 'Resident lost balance',
    'Equipment Failure': 'Equipment failure',
    'Staff Error': 'Staff error',
    Unknown: 'Unknown',
    Other: 'Other',
  },
};

function summarizeArray(val, isVi) {
  if (!Array.isArray(val)) return String(val);
  if (val.length === 0) return '—';
  const labels = val
    .filter(f => f && f.label)
    .map(f => f.label)
    .join(', ');
  if (labels) return labels;
  return isVi ? `${val.length} trường` : `${val.length} field(s)`;
}

function formatInvoiceItem(item, idx, isVi) {
  const label = isVi ? `Chi phí ${idx + 1}` : `Item ${idx + 1}`;
  const desc = item.description || '—';
  const amt = item.amount;
  const amtStr = (amt !== undefined && amt !== null) ? formatCurrency(amt, 'vi-VN') : '—';
  return `${label}: ${desc} — ${amtStr}`;
}

function collectGenericChanges(beforeData, afterData, isVi) {
  if (!beforeData && !afterData) return [];
  const before = beforeData || {};
  const after = afterData || {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows = [];

  for (const key of keys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;
    const bVal = before[key];
    const aVal = after[key];
    const bIsArr = Array.isArray(bVal);
    const aIsArr = Array.isArray(aVal);

    // Special handling for items array — expand each item as its own row
    if ((key === 'items') && (aIsArr || bIsArr)) {
      const aArr = aVal || [];
      const bArr = bVal || [];
      const maxLen = Math.max(aArr.length, bArr.length);
      for (let i = 0; i < maxLen; i++) {
        const aItem = aArr[i];
        const bItem = bArr[i];
        const aStr = aItem ? formatInvoiceItem(aItem, i, isVi) : '';
        const bStr = bItem ? formatInvoiceItem(bItem, i, isVi) : '';
        rows.push({ key: `${key}[${i}]`, before: bStr, after: aStr, changed: bStr !== aStr });
      }
      continue;
    }

    const bStr = bVal !== undefined && bVal !== null ? (bIsArr ? summarizeArray(bVal, isVi) : (typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal))) : '';
    const aStr = aVal !== undefined && aVal !== null ? (aIsArr ? summarizeArray(aVal, isVi) : (typeof aVal === 'object' ? JSON.stringify(aVal) : String(aVal))) : '';
    rows.push({ key, before: bStr, after: aStr, changed: bStr !== aStr });
  }
  return rows;
}

const FIELD_KEY_LABELS = {
  statusLabel: 'Trạng thái',
  closedAtLabel: 'Thời gian đóng',
  adminNotes: 'Ghi chú quản trị',
  assignedStaffIds: 'Người xử lý',
  residentIds: 'Cư dân',
  serviceCode: 'Mã dịch vụ',
  serviceName: 'Tên dịch vụ',
  category: 'Danh mục',
  description: 'Mô tả',
  unitPrice: 'Đơn giá',
  active: 'Kích hoạt',
  fields: 'Trường dữ liệu',
  // Invoice fields
  invoiceNumber: 'Số hóa đơn',
  billingPeriodStart: 'Kỳ tính phí từ',
  billingPeriodEnd: 'Kỳ tính phí đến',
  items: 'Danh sách chi phí',
  subTotal: 'Tổng phụ',
  tax: 'Thuế (5%)',
  total: 'Tổng cộng',
  totalAmount: 'Tổng số tiền',
  originalTotalAmount: 'Tổng tiền gốc',
  paymentStatus: 'Trạng thái thanh toán',
  dueDate: 'Ngày đến hạn',
  paidAt: 'Ngày thanh toán',
  paymentMethod: 'Phương thức thanh toán',
  notes: 'Ghi chú',
  billingStatus: 'Trạng thái tính phí',
  quantity: 'Số lượng',
  performedAt: 'Thời gian thực hiện',
  amount: 'Số tiền',
  currency: 'Đơn vị tiền tệ',
  invoiceId: 'Mã hóa đơn',
  residentName: 'Tên cư dân',
  residentId: 'Mã cư dân',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  // Additional invoice fields
  periodStart: 'Kỳ từ ngày',
  periodEnd: 'Kỳ đến ngày',
  type: 'Loại hóa đơn',
  paymentPlan: 'Phương thức thanh toán',
  issuedAt: 'Ngày xuất hóa đơn',
  roomCost: 'Phí phòng',
  medicationCost: 'Phí thuốc',
  careServiceCost: 'Phí dịch vụ chăm sóc',
  otherCost: 'Chi phí khác',
  itemCount: 'Số chi phí',
};

const FIELD_KEY_LABELS_EN = {
  statusLabel: 'Status',
  closedAtLabel: 'Closed At',
  adminNotes: 'Admin Notes',
  assignedStaffIds: 'Assignees',
  residentIds: 'Residents',
  serviceCode: 'Service code',
  serviceName: 'Service name',
  category: 'Category',
  description: 'Description',
  unitPrice: 'Unit price',
  active: 'Active',
  fields: 'Data fields',
  // Invoice fields
  invoiceNumber: 'Invoice Number',
  billingPeriodStart: 'Billing Period Start',
  billingPeriodEnd: 'Billing Period End',
  items: 'Line Items',
  subTotal: 'Subtotal',
  tax: 'Tax (5%)',
  total: 'Total',
  totalAmount: 'Total Amount',
  originalTotalAmount: 'Original Total Amount',
  paymentStatus: 'Payment Status',
  dueDate: 'Due Date',
  paidAt: 'Paid At',
  paymentMethod: 'Payment Method',
  notes: 'Notes',
  billingStatus: 'Billing Status',
  quantity: 'Quantity',
  performedAt: 'Performed At',
  amount: 'Amount',
  currency: 'Currency',
  invoiceId: 'Invoice ID',
  residentName: 'Resident Name',
  residentId: 'Resident ID',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  // Additional invoice fields
  periodStart: 'Period Start',
  periodEnd: 'Period End',
  type: 'Invoice Type',
  paymentPlan: 'Payment Plan',
  issuedAt: 'Issued At',
  roomCost: 'Room Cost',
  medicationCost: 'Medication Cost',
  careServiceCost: 'Care Service Cost',
  otherCost: 'Other Cost',
  itemCount: 'Number of Items',
};

const getFieldKeyLabel = (key, lang) => {
  const labels = lang === 'vi' ? FIELD_KEY_LABELS : FIELD_KEY_LABELS_EN;
  const label = labels[key];
  if (label) return label;
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

function GenericChangeDiff({ log, t, isVi }) {
  const beforeData = log.beforeData;
  const afterData = log.afterData;
  const hasBoth = beforeData && afterData;
  const dataOnly = afterData || beforeData;

  if (hasBoth) {
    const rows = collectGenericChanges(beforeData, afterData, isVi);
    if (rows.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
    return (
      <table className="al-diff">
        <thead>
          <tr>
            <th>{t('admin.auditLogs.shiftDetail.fieldLabel')}</th>
            <th>{t('admin.auditLogs.shiftDetail.before')}</th>
            <th>{t('admin.auditLogs.shiftDetail.after')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.changed ? 'al-diff__row--changed' : undefined}>
              <td>{getFieldKeyLabel(row.key, isVi ? 'vi' : 'en')}</td>
              <td>{row.changed ? <span className="al-diff__val--old">{row.before || '—'}</span> : (row.before || '—')}</td>
              <td>{row.changed ? <span className="al-diff__val--new">{row.after || '—'}</span> : (row.after || '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (dataOnly && typeof dataOnly === 'object') {
    const entries = Object.entries(dataOnly).filter(([k]) => !IGNORED_DIFF_KEYS.has(k));
    if (entries.length === 0) return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
    return (
      <div className="al-data-list">
        {entries.map(([key, val]) => (
          <div key={key} className="al-data-row">
            <span className="al-data-row__key">{getFieldKeyLabel(key, isVi ? 'vi' : 'en')}</span>
            <span className="al-data-row__val">
              {val !== null && val !== undefined
                ? (Array.isArray(val) ? summarizeArray(val, isVi) : (typeof val === 'object' ? JSON.stringify(val) : String(val)))
                : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <p style={{ color: '#94a3b8', fontSize: 13 }}>—</p>;
}

function ActionBadge({ action }) {
  const { t } = useTranslation();
  const category = getActionCategory(action);
  const i18nKey = ACTION_CATEGORY_LABELS[category];
  return (
    <span className={`al-action-badge al-action-badge--${category}`}>
      <span className="al-action-badge__dot" />
      {t(i18nKey)}
    </span>
  );
}

function RoleTag({ role }) {
  const { t } = useTranslation();
  if (!role) return null;
  const i18nKey = ROLE_LABELS[role];
  const label = i18nKey ? t(i18nKey) : role;
  const isKnownRole = !!i18nKey;
  return <span className={`al-role-tag ${isKnownRole ? `al-role-tag--${role}` : ''}`}>{label}</span>;
}

const formatFieldNameVi = (field) => {
  const fieldMap = {
    // Common field names
    fullName: 'Họ tên',
    firstName: 'Tên',
    lastName: 'Họ',
    citizenId: 'CMND/CCCD',
    citizen_id: 'CMND/CCCD',
    identityCard: 'CMND/CCCD',
    avatarUrl: 'Ảnh đại diện',
    avatar: 'Ảnh đại diện',
    phone: 'Điện thoại',
    phoneNumber: 'Số điện thoại',
    email: 'Email',
    address: '�ịa chỉ',
    personalAddress: 'Địa chỉ',
    dateOfBirth: 'Ngày sinh',
    dob: 'Ngày sinh',
    birthDate: 'Ngày sinh',
    gender: 'Giới tính',
    allergies: 'Dị ứng',
    chronicConditions: 'Bệnh lý',
    isPrimary: 'Liên hệ chính',
    emergencyContact: 'Liên hệ khẩn cấp',
    emergencyContacts: 'Liên hệ khẩn cấp',
    resident: 'Cư dân',
    building: 'Tòa nhà',
    floor: 'Tầng',
    room: 'Phòng',
    roomType: 'Loại phòng',
    bed: 'Giường',
    familyPortalAccountIds: 'Tài khoản gia đình',
    roomId: 'Phòng',
    room_id: 'Phòng',
    residentCode: 'Mã cư dân',
        status: 'Trạng thái',
    statusLabel: 'Trạng thái',
    closedAtLabel: 'Thời gian đóng',
    packageCode: 'Mã gói dịch vụ',
    tierLabel: 'Hạng gói',
    monthlyPrice: 'Giá hàng tháng (VNĐ)',
    allowedRoomTypes: 'Loại phòng áp dụng',
    roomTypeLabels: 'Loại phòng áp dụng',
    preferredDate: 'Ngày tham quan',
    preferredTimeSlot: 'Khung giờ',
    confirmedTimeSlot: 'Khung giờ xác nhận',
    confirmedAt: 'Thời gian xác nhận',
    completedAt: 'Thời gian hoàn thành',
    cancellationReason: 'Lý do hủy',
    rejectionReason: 'Lý do từ chối',
    numberOfVisitors: 'Số người tham quan',
    contactName: 'Tên người liên hệ',
    contactPhone: 'SĐT liên hệ',
    contactEmail: 'Email liên hệ',
    notes: 'Ghi chú',
    name: 'Tên',
    description: 'Mô tả',
    title: 'Tiêu đề',
    location: 'Địa điểm',
    scheduledAt: 'Thời gian bắt đầu',
    endAt: 'Thời gian kết thúc',
    durationMinutes: 'Thời lượng (phút)',
    dailyDurationMinutes: 'Thời lượng mỗi ngày (phút)',
    seriesId: 'ID chuỗi',
    participantResidentIds: 'Danh sách cư dân tham gia',
    organizerStaffId: 'Người tổ chức',
    organizerStaffIds: 'Người tổ chức',
    supportStaffId: 'Nhân viên hỗ trợ',
    supportStaffIds: 'Nhân viên hỗ trợ',
    createdAt: 'Ngày tạo',
    updatedAt: 'Ngày cập nhật',
    id: 'ID',
    insuranceNumber: 'Số bảo hiểm',
    bloodType: 'Nhóm máu',
    initialHealthCondition: 'Tình trạng sức khỏe ban đầu',
    // Shift-related fields
    staffName: 'Nhân viên phụ trách',
    templateName: 'Mẫu ca áp dụng',
    workDate: 'Ngày làm việc',
    startTime: 'Giờ bắt đầu',
    endTime: 'Giờ kết thúc',
    totalHours: 'Tổng giờ',
    checkInTime: 'Thời điểm check-in',
    checkOutTime: 'Thời điểm check-out',
    // legacy alias IDs
    assignedStaffId: 'Mã nhân viên',
    shiftTemplateId: 'Mã mẫu ca',
    cancelReason: 'Lý do hủy',
    // Admission-related fields
    requestCode: 'Mã yêu cầu',
    eligibilityStatus: 'Trạng thái đủ điều kiện',
    applicantName: 'Tên người cao tuổi',
    applicantGender: 'Giới tính người cao tuổi',
    applicantDateOfBirth: 'Ngày sinh người cao tuổi',
    applicantCitizenId: 'CCCD người cao tuổi',
    applicantBloodType: 'Nhóm máu người cao tuổi',
    applicantRelationship: 'Quan hệ với người gửi',
    applicantAllergies: 'Dị ứng người cao tuổi',
    applicantChronicConditions: 'Bệnh mãn tính người cao tuổi',
    applicantPhone: 'SĐT người cao tuổi',
    applicantPersonalAddress: 'Địa chỉ người cao tuổi',
    applicantInitialHealthCondition: 'Tình trạng sức khỏe ban đầu (NCT)',
    applicantAvatarUrl: 'Ảnh đại diện người cao tuổi',
    preferredAdmissionDate: 'Ngày nhập viện mong muốn',
    reasonForAdmission: 'Lý do nhập viện',
    requestedByName: 'Tên người gửi yêu cầu',
    requestedByPhone: 'SĐT người gửi',
    requestedByEmail: 'Email người gửi',
    residentId: 'Mã cư dân',
    familyAccountId: 'Mã tài khoản gia đình',
    submittedAt: 'Thời điểm gửi',
    cancelledAt: 'Thời điểm hủy',
    cancellationReason: 'Lý do hủy',
    rejectionReason: 'Lý do từ chối',
    deletedBy: 'Người dừng',
    deletedById: 'Người dừng',
    deletedAt: 'Thời điểm dừng',
    invoiceNumber: 'Số hóa đơn',
    invoiceType: 'Loại hóa đơn',
    contractNumber: 'Số hợp đồng',
    residentCode: 'Mã cư dân',
    residentName: 'Tên cư dân',
    rejectedAt: 'Thời điểm từ chối',
    approvedAt: 'Thời điểm duyệt',
    consultationNotes: 'Ghi chú tư vấn',
    consultationScheduledAt: 'Lịch tư vấn',
    initialAssessmentScheduledAt: 'Lịch khám sàng lọc',
    initialAssessmentNotes: 'Ghi chú khám sàng lọc',
    assessmentResult: 'Kết quả khám',
    servicePackageId: 'Gói dịch vụ',
    contractNumber: 'Số hợp đồng',
    contractStartDate: 'Ngày bắt đầu hợp đồng',
    contractEndDate: 'Ngày kết thúc hợp đồng',
    contractDurationMonths: 'Thời hạn hợp đồng (tháng)',
    contractDiscountPercent: 'Chiết khấu hợp đồng (%)',
    // Dish-related fields
    calories: 'Năng lượng (kcal)',
    ingredients: 'Nguyên liệu',
    isActive: 'Hoạt động',
    // Audit meta fields
    createdBy: 'Người tạo',
    updatedBy: 'Người cập nhật',
    // ClinicalService-related fields
    serviceCode: 'Mã dịch vụ',
    serviceName: 'Tên dịch vụ',
    category: 'Danh mục',
    unitPrice: 'Đơn giá (VNĐ)',
    active: 'Hoạt động',
    fields: 'Trường bổ sung',
    // MedicalRecord / Vital signs fields
    measuredAt: 'Thời điểm đo',
    bloodPressureSystolic: 'Huyết áp tâm thu (mmHg)',
    bloodPressureDiastolic: 'Huyết áp tâm trương (mmHg)',
    pulse: 'Mạch (bpm)',
    temperatureCelsius: 'Nhiệt độ (°C)',
    oxygenSaturation: 'SpO₂ (%)',
    bloodSugar: 'Đường huyết (mmol/L)',
    weightKg: 'Cân nặng (kg)',
    heightCm: 'Chiều cao (cm)',
    abnormalFlag: 'Cờ bất thường',
    summary: 'Tóm tắt',
    physicalExamination: 'Khám thực thể',
    selectedServices: 'Dịch vụ đã chọn',
    serviceName: 'Tên dịch vụ',
    serviceCode: 'Mã dịch vụ',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    fieldValues: 'Giá trị đo lường',
    general: 'Toàn thân',
    cardiovascular: 'Tuần hoàn',
    respiratory: 'Hô hấp',
    abdominal: 'Bụng',
    neurological: 'Thần kinh',
    musculoskeletal: 'Cơ - Xương - Khớp',
    skin: 'Da',
    other: 'Khác',
    // Invoice fields
    invoiceNumber: 'Số hóa đơn',
    billingPeriodStart: 'Kỳ tính phí từ',
    billingPeriodEnd: 'Kỳ tính phí đến',
    items: 'Danh sách chi phí',
    subTotal: 'Tổng phụ',
    tax: 'Thuế (5%)',
    total: 'Tổng cộng',
    totalAmount: 'Tổng số tiền',
    originalTotalAmount: 'Tổng tiền gốc',
    paymentStatus: 'Trạng thái thanh toán',
    dueDate: 'Ngày đến hạn',
    paidAt: 'Ngày thanh toán',
    paymentMethod: 'Phương thức thanh toán',
    billingStatus: 'Trạng thái tính phí',
    quantity: 'Số lượng',
    performedAt: 'Thời gian thực hiện',
    amount: 'Số tiền',
    currency: 'Đơn vị tiền tệ',
    invoiceId: 'Mã hóa đơn',
    residentName: 'Tên cư dân',
    // MedicalCharge fields
    serviceName: 'Tên dịch vụ',
    category: 'Danh mục',
    quantity: 'Số lượng',
    unitPrice: 'Đơn giá',
    billingStatus: 'Trạng thái tính phí',
    performedAt: 'Thời gian thực hiện',
    metadata: 'Thông tin bổ sung',
    // Medication fields
    medicationCode: 'Mã thuốc',
    form: 'Dạng thuốc',
    strength: 'Hàm lượng',
    unit: 'Đơn vị',
    manufacturer: 'Nhà cung cấp',
    price: 'Giá',
    minStockLevel: 'Mức tối thiểu',
    // Supplier fields
    contactName: 'Người liên hệ',
    phone: 'Số điện thoại',
    email: 'Email',
    address: 'Địa chỉ',
    notes: 'Ghi chú',
    // MedicationStock fields
    medicationName: 'Tên thuốc',
    supplierName: 'Nhà cung cấp',
    quantity: 'Số lượng',
    lotNumber: 'Số lô',
    expiryDate: 'Ngày hết hạn',
    receivedDate: 'Ngày nhập',
    costPerUnit: 'Đơn giá nhập',
    // CareAppointment fields
    residentName: 'Tên cư dân',
    doctorName: 'Bác sĩ',
    nurseName: 'Y tá',
    appointmentType: 'Loại lịch hẹn',
    scheduledStartAt: 'Giờ bắt đầu',
    scheduledEndAt: 'Giờ kết thúc',
    recipientCount: 'Số người nhận',
    recipientGroups: 'Nhóm người nhận',
    // Invoice fields
    paymentPlan: 'Phương thức thanh toán',
    issuedAt: 'Ngày xuất hóa đơn',
    // Incident fields
    incidentType: 'Loại sự cố',
    severity: 'Mức độ nghiêm trọng',
    incidentAt: 'Thời gian xảy ra sự cố',
    assignedStaffIds: 'Người phụ trách',
    handlerCount: 'Số người phụ trách',
    resolutionMethod: 'Phương pháp xử lý',
    resolutionRootCause: 'Nguyên nhân gốc rễ',
    resolutionSeverityAssessment: 'Đánh giá mức độ sau xử lý',
    hasAttachments: 'Số tệp đính kèm',
    residentIds: 'Cư dân liên quan',
    previousStatus: 'Trạng thái trước',
    newStatus: 'Trạng thái mới',
  };
  return fieldMap[field] || field;
};

const formatFieldNameEn = (field) => {
  const fieldMap = {
    fullName: 'Full name',
    firstName: 'First name',
    lastName: 'Last name',
    citizenId: 'ID number',
    citizen_id: 'ID number',
    identityCard: 'ID number',
    avatarUrl: 'Avatar',
    avatar: 'Avatar',
    phone: 'Phone',
    phoneNumber: 'Phone number',
    email: 'Email',
    address: 'Address',
    personalAddress: 'Address',
    dateOfBirth: 'Date of birth',
    dob: 'Date of birth',
    birthDate: 'Birth date',
    gender: 'Gender',
    allergies: 'Allergies',
    chronicConditions: 'Chronic conditions',
    isPrimary: 'Primary contact',
    emergencyContact: 'Emergency contact',
    emergencyContacts: 'Emergency contacts',
    resident: 'Resident',
    building: 'Building',
    floor: 'Floor',
    room: 'Room',
    bed: 'Bed',
    roomType: 'Room type',
    familyPortalAccountIds: 'Family accounts',
    roomId: 'Room',
    room_id: 'Room',
    residentCode: 'Resident code',
    status: 'Status',
    statusLabel: 'Status',
    closedAtLabel: 'Closed at',
    packageCode: 'Package code',
    tierLabel: 'Tier',
    monthlyPrice: 'Monthly price (VND)',
    allowedRoomTypes: 'Allowed room types',
    roomTypeLabels: 'Allowed room types',
    preferredDate: 'Tour date',
    preferredTimeSlot: 'Time slot',
    confirmedTimeSlot: 'Confirmed time slot',
    confirmedAt: 'Confirmed at',
    completedAt: 'Completed at',
    cancellationReason: 'Cancellation reason',
    rejectionReason: 'Rejection reason',
    deletedBy: 'Stopped by',
    deletedById: 'Stopped by',
    deletedAt: 'Stopped at',
    invoiceNumber: 'Invoice number',
    invoiceType: 'Invoice type',
    contractNumber: 'Contract number',
    residentCode: 'Resident code',
    residentName: 'Resident name',
    numberOfVisitors: 'Number of visitors',
    contactName: 'Contact name',
    contactPhone: 'Contact phone',
    contactEmail: 'Contact email',
    notes: 'Notes',
    name: 'Name',
    description: 'Description',
    title: 'Title',
    location: 'Location',
    scheduledAt: 'Start time',
    endAt: 'End time',
    durationMinutes: 'Duration (minutes)',
    dailyDurationMinutes: 'Daily duration (minutes)',
    seriesId: 'Series ID',
    participantResidentIds: 'Participant residents',
    organizerStaffId: 'Organizer',
    organizerStaffIds: 'Organizers',
    supportStaffId: 'Support staff',
    supportStaffIds: 'Support staff',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    id: 'ID',
    insuranceNumber: 'Insurance number',
    bloodType: 'Blood type',
    initialHealthCondition: 'Initial health condition',
    // Shift-related fields
    staffName: 'Assigned staff',
    templateName: 'Shift template',
    workDate: 'Work date',
    startTime: 'Start time',
    endTime: 'End time',
    totalHours: 'Total hours',
    checkInTime: 'Check-in time',
    checkOutTime: 'Check-out time',
    // legacy alias IDs
    assignedStaffId: 'Staff ID',
    shiftTemplateId: 'Shift template ID',
    cancelReason: 'Cancel reason',
    // Admission-related fields
    requestCode: 'Request code',
    eligibilityStatus: 'Eligibility status',
    applicantName: 'Applicant name',
    applicantGender: 'Applicant gender',
    applicantDateOfBirth: 'Applicant date of birth',
    applicantCitizenId: 'Applicant ID number',
    applicantBloodType: 'Applicant blood type',
    applicantRelationship: 'Relationship to requester',
    applicantAllergies: 'Applicant allergies',
    applicantChronicConditions: 'Applicant chronic conditions',
    applicantPhone: 'Applicant phone',
    applicantPersonalAddress: 'Applicant address',
    applicantInitialHealthCondition: 'Applicant initial health condition',
    applicantAvatarUrl: 'Applicant avatar',
    preferredAdmissionDate: 'Preferred admission date',
    reasonForAdmission: 'Reason for admission',
    requestedByName: 'Requester name',
    requestedByPhone: 'Requester phone',
    requestedByEmail: 'Requester email',
    residentId: 'Resident ID',
    familyAccountId: 'Family account ID',
    submittedAt: 'Submitted at',
    cancelledAt: 'Cancelled at',
    cancellationReason: 'Cancellation reason',
    rejectionReason: 'Rejection reason',
    deletedBy: 'Stopped by',
    deletedById: 'Stopped by',
    deletedAt: 'Stopped at',
    invoiceNumber: 'Invoice number',
    invoiceType: 'Invoice type',
    contractNumber: 'Contract number',
    residentCode: 'Resident code',
    residentName: 'Resident name',
    rejectedAt: 'Rejected at',
    approvedAt: 'Approved at',
    consultationNotes: 'Consultation notes',
    consultationScheduledAt: 'Consultation scheduled at',
    initialAssessmentScheduledAt: 'Initial assessment scheduled at',
    initialAssessmentNotes: 'Initial assessment notes',
    assessmentResult: 'Assessment result',
    servicePackageId: 'Service package ID',
    contractNumber: 'Contract number',
    contractStartDate: 'Contract start date',
    contractEndDate: 'Contract end date',
    contractDurationMonths: 'Contract duration (months)',
    contractDiscountPercent: 'Contract discount (%)',
    // Dish-related fields
    calories: 'Calories (kcal)',
    ingredients: 'Ingredients',
    isActive: 'Active',
    // Audit meta fields
    createdBy: 'Created by',
    updatedBy: 'Updated by',
    // ClinicalService-related fields
    serviceCode: 'Service code',
    serviceName: 'Service name',
    category: 'Category',
    unitPrice: 'Unit price (VND)',
    active: 'Active',
    fields: 'Additional fields',
    // MedicalRecord / Vital signs fields
    measuredAt: 'Measured at',
    bloodPressureSystolic: 'Systolic BP (mmHg)',
    bloodPressureDiastolic: 'Diastolic BP (mmHg)',
    pulse: 'Pulse (bpm)',
    temperatureCelsius: 'Temperature (°C)',
    oxygenSaturation: 'SpO₂ (%)',
    bloodSugar: 'Blood sugar (mmol/L)',
    weightKg: 'Weight (kg)',
    heightCm: 'Height (cm)',
    abnormalFlag: 'Abnormal flag',
    summary: 'Summary',
    physicalExamination: 'Physical examination',
    selectedServices: 'Selected services',
    serviceName: 'Service name',
    serviceCode: 'Service code',
    quantity: 'Quantity',
    unitPrice: 'Unit price',
    fieldValues: 'Measured values',
    general: 'General appearance',
    cardiovascular: 'Cardiovascular',
    respiratory: 'Respiratory',
    abdominal: 'Abdominal',
    neurological: 'Neurological',
    musculoskeletal: 'Musculoskeletal',
    skin: 'Skin',
    other: 'Other observations',
    // Invoice fields
    invoiceNumber: 'Invoice Number',
    billingPeriodStart: 'Billing Period Start',
    billingPeriodEnd: 'Billing Period End',
    items: 'Line Items',
    subTotal: 'Subtotal',
    tax: 'Tax (5%)',
    total: 'Total',
    totalAmount: 'Total Amount',
    originalTotalAmount: 'Original Total Amount',
    paymentStatus: 'Payment Status',
    dueDate: 'Due Date',
    paidAt: 'Paid At',
    paymentMethod: 'Payment Method',
    billingStatus: 'Billing Status',
    quantity: 'Quantity',
    performedAt: 'Performed At',
    amount: 'Amount',
    currency: 'Currency',
    invoiceId: 'Invoice ID',
    residentName: 'Resident Name',
    // MedicalCharge fields
    metadata: 'Additional Info',
    // Medication fields
    medicationCode: 'Medication Code',
    form: 'Form',
    strength: 'Strength',
    unit: 'Unit',
    manufacturer: 'Manufacturer',
    price: 'Price',
    minStockLevel: 'Min Stock Level',
    // Supplier fields
    contactName: 'Contact Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    notes: 'Notes',
    // MedicationStock fields
    medicationName: 'Medication Name',
    supplierName: 'Supplier',
    quantity: 'Quantity',
    lotNumber: 'Lot Number',
    expiryDate: 'Expiry Date',
    receivedDate: 'Received Date',
    costPerUnit: 'Cost Per Unit',
    // CareAppointment fields
    residentName: 'Resident Name',
    doctorName: 'Doctor',
    nurseName: 'Nurse',
    appointmentType: 'Appointment Type',
    scheduledStartAt: 'Scheduled Start',
    scheduledEndAt: 'Scheduled End',
    recipientCount: 'Recipients Count',
    recipientGroups: 'Recipient Groups',
    // Invoice fields
    paymentPlan: 'Payment Plan',
    issuedAt: 'Issued At',
    // Incident fields
    incidentType: 'Incident Type',
    severity: 'Severity',
    incidentAt: 'Incident Time',
    assignedStaffIds: 'Assigned Staff',
    handlerCount: 'Handler Count',
    resolutionMethod: 'Resolution Method',
    resolutionRootCause: 'Root Cause',
    resolutionSeverityAssessment: 'Severity Assessment (Post-Resolution)',
    hasAttachments: 'Attachment Count',
    residentIds: 'Residents Involved',
    previousStatus: 'Previous Status',
    newStatus: 'New Status',
  };
  return fieldMap[field] || field;
};

const formatFieldName = (field, isVi) => isVi ? formatFieldNameVi(field) : formatFieldNameEn(field);

const formatValue = (val, isVi = true) => {
  const emptyLabel = isVi ? '(trống)' : '(empty)';
  if (val === undefined || val === null) return '—';
  if (val === '') return emptyLabel;
  if (Array.isArray(val)) {
    if (val.length === 0) return emptyLabel;
    if (typeof val[0] === 'object') return summarizeArray(val, isVi);
    return val.join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const TYPE_LABELS = {
  TEXT: { vi: 'Văn bản', en: 'Text' },
  NUMBER: { vi: 'Số', en: 'Number' },
  SELECT: { vi: 'Chọn', en: 'Select' },
};

const renderFieldList = (fields, isVi) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return isVi ? '(không có)' : '(none)';
  }
  return (
    <ul className="al-field-list">
      {fields.map((f, idx) => {
        if (!f || typeof f !== 'object') return null;
        const type = TYPE_LABELS[f.type];
        const typeLabel = type ? (isVi ? type.vi : type.en) : (f.type || '');
        const thresholds = [];
        if (f.min !== '' && f.min !== undefined && f.min !== null) thresholds.push(`min ${f.min}`);
        if (f.max !== '' && f.max !== undefined && f.max !== null) thresholds.push(`max ${f.max}`);
        if (f.maleMin !== '' && f.maleMin !== undefined && f.maleMin !== null) thresholds.push(`♂min ${f.maleMin}`);
        if (f.maleMax !== '' && f.maleMax !== undefined && f.maleMax !== null) thresholds.push(`♂max ${f.maleMax}`);
        if (f.femaleMin !== '' && f.femaleMin !== undefined && f.femaleMin !== null) thresholds.push(`♀min ${f.femaleMin}`);
        if (f.femaleMax !== '' && f.femaleMax !== undefined && f.femaleMax !== null) thresholds.push(`♀max ${f.femaleMax}`);
        const options = Array.isArray(f.options) && f.options.length > 0
          ? (isVi ? 'Lựa chọn: ' : 'Options: ') + f.options.join(', ')
          : '';
        return (
          <li key={idx} className="al-field-list__item">
            <div className="al-field-list__title">
              <strong>{f.label || f.fieldCode || (isVi ? '(không tên)' : '(unnamed)')}</strong>
              {typeLabel && <span className="al-field-list__type"> · {typeLabel}</span>}
              {f.fieldCode && <span className="al-field-list__code"> · <code>{f.fieldCode}</code></span>}
              {f.unit && <span className="al-field-list__unit"> · {f.unit}</span>}
              {f.required && <span className="al-field-list__required"> · {isVi ? 'Bắt buộc' : 'Required'}</span>}
            </div>
            {thresholds.length > 0 && (
              <div className="al-field-list__thresholds">{thresholds.join(' · ')}</div>
            )}
            {options && <div className="al-field-list__options">{options}</div>}
          </li>
        );
      })}
    </ul>
  );
};

const isImageUrl = (val) => {
  if (typeof val !== 'string') return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(val) ||
         val.includes('/uploads/') ||
         val.includes('data:image/');
};

const formatContactFieldName = (field, isVi) => {
  const labels = isVi
    ? {
        fullName: 'Họ tên',
        relationship: 'Quan hệ',
        phone: 'Điện thoại',
        email: 'Email',
        address: 'Địa chỉ',
        isPrimary: 'Liên hệ chính',
      }
    : {
        fullName: 'Full name',
        relationship: 'Relationship',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        isPrimary: 'Primary contact',
      };
  return labels[field] || field;
};

const renderEmergencyContact = (value, isVi) => {
  const contacts = Array.isArray(value) ? value : [value];
  return (
    <div className="al-contact-values">
      {contacts.map((contact, index) => (
        <div className="al-contact-value" key={contact?._id || index}>
          {['fullName', 'relationship', 'phone', 'email', 'address', 'isPrimary'].map((field) => {
            if (contact?.[field] === undefined || contact?.[field] === null || contact?.[field] === '') {
              return null;
            }
            const valueText = field === 'isPrimary'
              ? (contact[field] ? (isVi ? 'Có' : 'Yes') : (isVi ? 'Không' : 'No'))
              : String(contact[field]);
            return (
              <div className="al-contact-value__row" key={field}>
                <span className="al-contact-value__label">{formatContactFieldName(field, isVi)}:</span>
                <span>{valueText}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const renderTransferObject = (value, field, isVi) => {
  const labels = isVi
    ? { _id: 'ID', name: 'Tên', code: 'Mã', fullName: 'Họ tên', residentCode: 'Mã cư dân', floorNumber: 'Số tầng', roomNumber: 'Số phòng', roomType: 'Loại phòng', bedCode: 'Mã giường', bedType: 'Loại giường', residencyStatus: 'Trạng thái', status: 'Trạng thái' }
    : { _id: 'ID', name: 'Name', code: 'Code', fullName: 'Full name', residentCode: 'Resident code', floorNumber: 'Floor number', roomNumber: 'Room number', roomType: 'Room type', bedCode: 'Bed code', bedType: 'Bed type', residencyStatus: 'Status', status: 'Status' };
  const fieldsByType = {
    resident: ['fullName', 'residentCode', 'residencyStatus'],
    building: ['name', 'code'],
    floor: ['name', 'floorNumber'],
    room: ['roomNumber', 'roomType'],
    bed: ['bedCode', 'bedType', 'status'],
  };
  const fields = fieldsByType[field] || Object.keys(value);
  const translateTransferValue = (key, rawValue) => {
    if (!isVi || rawValue === undefined || rawValue === null) return rawValue;
    const translations = {
      roomType: { premium: 'Cao cấp', standard: 'Tiêu chuẩn' },
      bedType: { normal: 'Thường', premium: 'Cao cấp' },
      status: { available: 'Trống', occupied: 'Đang sử dụng', active: 'Hoạt động', closed: 'Đã đóng' },
    };
    return translations[key]?.[String(rawValue).toLowerCase()] || rawValue;
  };
  return (
    <div className="al-contact-values">
      {fields.map((key) => (
        value[key] === undefined || value[key] === null || value[key] === '' ? null : (
          <div className="al-contact-value__row" key={key}>
            <span className="al-contact-value__label">{labels[key] || key}:</span>
            <span>{String(translateTransferValue(key, value[key]))}</span>
          </div>
        )
      ))}
    </div>
  );
};

const translateGender = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    if (lower === 'male') return 'Nam';
    if (lower === 'female') return 'Nữ';
    if (lower === 'other') return 'Khác';
    if (lower === 'unknown') return 'Không xác định';
  } else {
    if (lower === 'male') return 'Male';
    if (lower === 'female') return 'Female';
    if (lower === 'other') return 'Other';
    if (lower === 'unknown') return 'Unknown';
  }
  return val;
};

const translateAdmissionStatus = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    const map = {
      new_request: 'Yêu cầu mới',
      consulting: 'Đang tư vấn',
      assessing: 'Đang khám sàng lọc',
      contracting: 'Đang ký hợp đồng',
      checked_in: 'Đã tiếp nhận',
      cancelled: 'Đã hủy',
    };
    return map[lower] || val;
  }
  const map = {
    new_request: 'New request',
    consulting: 'Consulting',
    assessing: 'Assessing',
    contracting: 'Contracting',
    checked_in: 'Checked in',
    cancelled: 'Cancelled',
  };
  return map[lower] || val;
};

const translateActivityStatus = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    const map = {
      draft: 'Bản nháp',
      scheduled: 'Đã lên lịch',
      in_progress: 'Đang thực hiện',
      ongoing: 'Đang diễn ra',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return map[lower] || val;
  }
  const map = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[lower] || val;
};

const translateEligibilityStatus = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    const map = {
      pending: 'Đang chờ đánh giá',
      eligible: 'Đủ điều kiện',
      not_eligible: 'Không đủ điều kiện',
    };
    return map[lower] || val;
  }
  const map = {
    pending: 'Pending',
    eligible: 'Eligible',
    not_eligible: 'Not eligible',
  };
  return map[lower] || val;
};

const translateReasonForAdmission = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    const map = {
      long_term_care: 'Chăm sóc dài hạn',
      rehabilitation: 'Phục hồi chức năng & Trị liệu',
      post_surgery: 'Phục hồi sau phẫu thuật',
      hospice: 'Chăm sóc giảm nhẹ cuối đời',
      other: 'Lý do khác',
    };
    return map[lower] || val;
  }
  const map = {
    long_term_care: 'Long-term care',
    rehabilitation: 'Rehabilitation & Therapy',
    post_surgery: 'Post-surgery recovery',
    hospice: 'Hospice / End-of-life care',
    other: 'Other',
  };
  return map[lower] || val;
};

const translateApplicantRelationship = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const lower = val.toLowerCase();
  if (isVi) {
    const map = {
      child: 'Con cái',
      spouse: 'Vợ / Chồng',
      sibling: 'Anh / Chị / Em',
      legal_guardian: 'Người giám hộ hợp pháp',
    };
    return map[lower] || val;
  }
  const map = {
    child: 'Child',
    spouse: 'Spouse',
    sibling: 'Sibling',
    legal_guardian: 'Legal guardian',
  };
  return map[lower] || val;
};

const translateServiceCategory = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const upper = val.toUpperCase();
  if (isVi) {
    const map = {
      PHYSICAL_EXAM: 'Khám lâm sàng',
      ECG: 'Điện tâm đồ',
      IMAGING: 'Chẩn đoán hình ảnh',
      LAB_RESULT: 'Xét nghiệm',
      LABORATORY: 'Xét nghiệm',
      COGNITIVE: 'Đánh giá nhận thức',
      FUNCTIONAL: 'Đánh giá chức năng',
      FALL_RISK: 'Đánh giá nguy cơ té ngã',
      NUTRITION: 'Dinh dưỡng',
      CHRONIC_DISEASE: 'Bệnh mãn tính',
      NEUROLOGY: 'Thần kinh',
      REHABILITATION: 'Phục hồi chức năng',
      NURSING: 'Điều dưỡng',
      GASTROENTEROLOGY: 'Tiêu hóa',
      MENTAL_HEALTH: 'Sức khỏe tâm thần',
      VITAL_SIGNS: 'Dấu hiệu sinh tồn',
      RESPIRATORY: 'Hô hấp',
      DERMATOLOGY: 'Da liễu',
    };
    return map[upper] || val;
  }
  const map = {
    PHYSICAL_EXAM: 'Physical exam',
    ECG: 'ECG',
    IMAGING: 'Imaging',
    LAB_RESULT: 'Lab result',
    LABORATORY: 'Laboratory',
    COGNITIVE: 'Cognitive',
    FUNCTIONAL: 'Functional',
    FALL_RISK: 'Fall risk',
    NUTRITION: 'Nutrition',
    CHRONIC_DISEASE: 'Chronic disease',
    NEUROLOGY: 'Neurology',
    REHABILITATION: 'Rehabilitation',
    NURSING: 'Nursing',
    GASTROENTEROLOGY: 'Gastroenterology',
    MENTAL_HEALTH: 'Mental health',
    VITAL_SIGNS: 'Vital signs',
    RESPIRATORY: 'Respiratory',
    DERMATOLOGY: 'Dermatology',
  };
  return map[upper] || val;
};

const translateBoolean = (val, isVi) => {
  if (val === true || val === 'true') return isVi ? 'Có' : 'Yes';
  if (val === false || val === 'false') return isVi ? 'Không' : 'No';
  return val;
};

// Bản đồ dịch field code dịch vụ lâm sàng → nhãn tiếng Việt / Anh
const SERVICE_FIELD_LABELS_VI = {
  glucose_level: 'Đường huyết',
  blood_glucose: 'Đường huyết',
  fasting_glucose: 'Đường huyết lúc đói',
  postprandial_glucose: 'Đường huyết sau ăn',
  hba1c: 'HbA1c',
  hba1c_value: 'Giá trị HbA1c',
  hba1c_date: 'Ngày xét nghiệm HbA1c',
  insulin_dose: 'Liều insulin',
  insulin_type: 'Loại insulin',
  oral_medication_taken: 'Thuốc uống đã dùng',
  meal_consumed: 'Ăn uống',
  exercise_done: 'Vận động',
  hypoglycemia_symptoms: 'Triệu chứng hạ đường huyết',
  hyperglycemia_symptoms: 'Triệu chứng tăng đường huyết',
  measurement_time: 'Thời điểm đo',
  blood_pressure_systolic: 'Huyết áp tâm thu',
  blood_pressure_diastolic: 'Huyết áp tâm trương',
  pulse: 'Mạch',
  temperature: 'Nhiệt độ',
  oxygen_saturation: 'SpO₂',
  respiratory_rate: 'Nhịp thở',
  weight: 'Cân nặng',
  height: 'Chiều cao',
  bmi: 'BMI',
  ecg_heart_rate: 'Nhịp tim (ECG)',
  ecg_rhythm: 'Nhịp xoang',
  ecg_pr_interval: 'PR interval',
  ecg_qrs_duration: 'QRS duration',
  ecg_qt_interval: 'QT interval',
  ecg_axis: 'Trục điện tim',
  ecg_interpretation: 'Diễn giải',
  urine_color: 'Màu nước tiểu',
  urine_appearance: 'Nước tiểu trong',
  urine_ph: 'pH nước tiểu',
  urine_protein: 'Protein nước tiểu',
  urine_glucose: 'Glucose nước tiểu',
  urine_blood: 'Hồng cầu nước tiểu',
  cognition_score: 'Điểm nhận thức',
  mmse_score: 'Điểm MMSE',
  mood_score: 'Điểm tâm trạng',
  pain_score: 'Điểm đau',
  fall_risk_score: 'Điểm nguy cơ té ngã',
  mobility: 'Vận động',
  adl_score: 'Điểm ADL',
  note: 'Ghi chú',
  notes: 'Ghi chú',
  dosage: 'Liều dùng',
  frequency: 'Tần suất',
  side_effects: 'Tác dụng phụ',
  result: 'Kết quả',
  image_url: 'Ảnh',
  imageUrls: 'Ảnh',
};
const SERVICE_FIELD_LABELS_EN = {
  glucose_level: 'Blood glucose',
  blood_glucose: 'Blood glucose',
  fasting_glucose: 'Fasting glucose',
  postprandial_glucose: 'Postprandial glucose',
  hba1c: 'HbA1c',
  hba1c_value: 'HbA1c value',
  hba1c_date: 'HbA1c test date',
  insulin_dose: 'Insulin dose',
  insulin_type: 'Insulin type',
  oral_medication_taken: 'Oral medication taken',
  meal_consumed: 'Meal consumed',
  exercise_done: 'Exercise done',
  hypoglycemia_symptoms: 'Hypoglycemia symptoms',
  hyperglycemia_symptoms: 'Hyperglycemia symptoms',
  measurement_time: 'Measurement time',
  blood_pressure_systolic: 'Systolic BP',
  blood_pressure_diastolic: 'Diastolic BP',
  pulse: 'Pulse',
  temperature: 'Temperature',
  oxygen_saturation: 'SpO₂',
  respiratory_rate: 'Respiratory rate',
  weight: 'Weight',
  height: 'Height',
  bmi: 'BMI',
  ecg_heart_rate: 'ECG heart rate',
  ecg_rhythm: 'ECG rhythm',
  ecg_pr_interval: 'PR interval',
  ecg_qrs_duration: 'QRS duration',
  ecg_qt_interval: 'QT interval',
  ecg_axis: 'ECG axis',
  ecg_interpretation: 'ECG interpretation',
  urine_color: 'Urine color',
  urine_appearance: 'Urine appearance',
  urine_ph: 'Urine pH',
  urine_protein: 'Urine protein',
  urine_glucose: 'Urine glucose',
  urine_blood: 'Urine blood',
  cognition_score: 'Cognition score',
  mmse_score: 'MMSE score',
  mood_score: 'Mood score',
  pain_score: 'Pain score',
  fall_risk_score: 'Fall risk score',
  mobility: 'Mobility',
  adl_score: 'ADL score',
  note: 'Note',
  notes: 'Notes',
  dosage: 'Dosage',
  frequency: 'Frequency',
  side_effects: 'Side effects',
  result: 'Result',
  image_url: 'Image',
  imageUrls: 'Images',
};
const getServiceFieldLabel = (key, isVi) => {
  const map = isVi ? SERVICE_FIELD_LABELS_VI : SERVICE_FIELD_LABELS_EN;
  if (map[key]) return map[key];
  return formatFieldName(key, isVi);
};

const renderValue = (val, field, isVi, dataContext) => {
  if (val === undefined || val === null) return '—';
  if (val === '') return isVi ? '(trống)' : '(empty)';

  // Resident ID: prefer residentName from context if available
  if (field === 'residentId' || field === 'Mã cư dân' || field === 'Resident ID') {
    const fromContext = dataContext?.after?.residentName || dataContext?.before?.residentName;
    if (fromContext) return fromContext;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return isVi ? '(trống)' : '(empty)';
    if (typeof val[0] === 'object') {
      if (field === 'fields') return renderFieldList(val, isVi);
      // For residentIds / assignedStaffIds, extract fullName from each object
      if (field === 'residentIds' || field === 'assignedStaffIds') {
        const names = val
          .map((o) => o?.fullName || o?.userId?.fullName || o?.userId?.email || o?.label || o?.name || null)
          .filter(Boolean);
        if (names.length) return names.join(', ');
      }
      // selectedServices: render each service with its fieldValues in a readable list
      if (field === 'selectedServices' || field === 'Dịch vụ đã chọn' || field === 'Selected services') {
        return val.map((svc) => {
          const name = svc?.serviceName || svc?.serviceCode || (isVi ? 'Dịch vụ' : 'Service');
          const qty = svc?.quantity ? ` × ${svc.quantity}` : '';
          const fvs = svc?.fieldValues;
          const fvLines = fvs && typeof fvs === 'object'
            ? Object.entries(fvs)
                .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                .map(([k, v]) => `${isVi ? '• ' : '• '}${getServiceFieldLabel(k, isVi)}: ${String(v)}`)
                .join('\n')
            : '';
          return fvLines ? `${name}${qty}\n${fvLines}` : `${name}${qty}`;
        }).join('\n\n');
      }
      return summarizeArray(val, isVi);
    }
    return val.join(', ');
  }
  if (typeof val === 'object') {
    if (field === 'emergencyContact' || field === 'emergencyContacts') {
      return renderEmergencyContact(val, isVi);
    }
    if (['resident', 'building', 'floor', 'room', 'bed'].includes(field)) {
      return renderTransferObject(val, field, isVi);
    }
    return JSON.stringify(val);
  }

  const strVal = String(val);

  // Translate gender values
  if (field === 'gender' || field === 'Giới tính' || field === 'Gender' || field === 'applicantGender') {
    return translateGender(strVal, isVi);
  }

  // Date fields: format as locale datetime
  if (['dueDate', 'issuedAt', 'paidAt', 'createdAt', 'updatedAt', 'completedAt', 'performedAt', 'confirmedAt', 'expiryDate', 'receivedDate', 'workDate', 'scheduledStartAt', 'scheduledEndAt', 'incidentAt'].includes(field)) {
    const date = new Date(strVal);
    if (!isNaN(date)) {
      return date.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  }

  // Translate invoice status values (before generic status check)
  if ((field === 'status' || field === 'Trạng thái' || field === 'Status') &&
    ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].includes(strVal.toUpperCase())) {
    const mapVi = { DRAFT: 'Nháp', ISSUED: 'Đã xuất', PARTIALLY_PAID: 'Thanh toán một phần', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };
    const mapEn = { DRAFT: 'Draft', ISSUED: 'Issued', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', CANCELLED: 'Cancelled' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate incident status values (must run BEFORE admission status so it isn't swallowed)
  if (field === 'status' || field === 'Trạng thái' || field === 'Status') {
    const lower = strVal.toLowerCase();
    if (['open', 'investigating', 'resolved', 'closed'].includes(lower)) {
      const mapVi = { open: 'Mới báo cáo', investigating: 'Đang điều tra', resolved: 'Đã giải quyết', closed: 'Đã đóng' };
      const mapEn = { open: 'Open', investigating: 'Investigating', resolved: 'Resolved', closed: 'Closed' };
      return (isVi ? mapVi[lower] : mapEn[lower]) || strVal;
    }
  }

  // Translate admission status values
  if (field === 'status' || field === 'Trạng thái' || field === 'Status') {
    if (['draft', 'scheduled', 'in_progress', 'ongoing', 'completed'].includes(strVal.toLowerCase())) {
      return translateActivityStatus(strVal, isVi);
    }
    return translateAdmissionStatus(strVal, isVi);
  }

  // Translate eligibility status values
  if (field === 'eligibilityStatus' || field === 'Trạng thái đủ điều kiện' || field === 'Eligibility status') {
    return translateEligibilityStatus(strVal, isVi);
  }

  // Translate admission reason values
  if (field === 'reasonForAdmission' || field === 'Lý do nhập viện') {
    return translateReasonForAdmission(strVal, isVi);
  }

  // Translate applicant relationship values
  if (field === 'applicantRelationship' || field === 'Quan hệ với người gửi') {
    return translateApplicantRelationship(strVal, isVi);
  }

  // Translate clinical service category values
  if (field === 'category' || field === 'Danh mục' || field === 'Category') {
    return translateServiceCategory(strVal, isVi);
  }

  // Translate isActive / active boolean values
  if (field === 'isActive' || field === 'active' || field === 'Hoạt động' || field === 'Active') {
    return translateBoolean(strVal, isVi);
  }

  // Translate abnormalFlag (vital signs)
  if (field === 'abnormalFlag' || field === 'Cờ bất thường' || field === 'Abnormal flag') {
    const mapVi = { true: 'Bất thường', false: 'Bình thường' };
    const mapEn = { true: 'Abnormal', false: 'Normal' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate invoice / billing status values
  if (field === 'billingStatus' || field === 'Trạng thái tính phí' || field === 'Billing Status') {
    const mapVi = { PENDING: 'Chưa tính phí', BILLED: 'Đã xuất hóa đơn', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };
    const mapEn = { PENDING: 'Pending', BILLED: 'Billed', PAID: 'Paid', CANCELLED: 'Cancelled' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate invoice status (DRAFT, ISSUED, PARTIALLY_PAID, etc.)
  // Translate payment status values
  if (field === 'paymentStatus' || field === 'Trạng thái thanh toán' || field === 'Payment Status') {
    const mapVi = { DRAFT: 'Nháp', ISSUED: 'Đã xuất', PARTIALLY_PAID: 'Thanh toán một phần', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy', PENDING: 'Chờ thanh toán', OVERDUE: 'Quá hạn' };
    const mapEn = { DRAFT: 'Draft', ISSUED: 'Issued', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', CANCELLED: 'Cancelled', PENDING: 'Pending', OVERDUE: 'Overdue' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate invoice type values
  if (field === 'type' || field === 'Loại hóa đơn' || field === 'Invoice Type') {
    const mapVi = { SERVICE: 'Dịch vụ', MEDICATION: 'Thuốc', OTHER: 'Khác', COMBINED: 'Kết hợp' };
    const mapEn = { SERVICE: 'Service', MEDICATION: 'Medication', OTHER: 'Other', COMBINED: 'Combined' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate payment plan values
  if (field === 'paymentPlan' || field === 'Phương thức thanh toán' || field === 'Payment Plan') {
    const mapVi = { FULL: 'Thanh toán toàn bộ', HALF_NOW: 'Thanh toán 50% trước', MONTHLY: 'Trả góp hàng tháng' };
    const mapEn = { FULL: 'Pay in full', HALF_NOW: 'Pay 50% now', MONTHLY: 'Monthly installment' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate incident severity values
  if (field === 'severity' || field === 'Mức độ nghiêm trọng' || field === 'Severity') {
    const mapVi = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng' };
    const mapEn = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate incident resolution severity assessment values
  if (field === 'resolutionSeverityAssessment' || field === 'Đánh giá mức độ sau xử lý') {
    const mapVi = { 'Thấp': 'Thấp', 'Trung bình': 'Trung bình', 'Cao': 'Cao', 'Khẩn cấp': 'Khẩn cấp' };
    const mapEn = { 'Thấp': 'Low', 'Trung bình': 'Medium', 'Cao': 'High', 'Khẩn cấp': 'Urgent' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate incident root cause (predefined English options from the resolution form)
  if (field === 'resolutionRootCause' || field === 'Nguyên nhân gốc rễ' || field === 'Root Cause') {
    const rootMap = isVi ? INCIDENT_ROOT_CAUSE_LABEL_MAP.vi : INCIDENT_ROOT_CAUSE_LABEL_MAP.en;
    return rootMap[strVal] || strVal;
  }

  // Translate numeric/currency fields as formatted amounts
  if (['totalAmount', 'originalTotalAmount', 'subTotal', 'tax', 'total', 'remainingAmount', 'roomCost', 'medicationCost', 'careServiceCost', 'otherCost', 'amount', 'unitPrice'].includes(field)) {
    const num = Number(strVal);
    if (!Number.isNaN(num)) {
      return formatCurrency(num, isVi ? 'vi-VN' : 'en-US');
    }
  }

  // Show image preview for avatar/image fields
  if ((field === 'avatarUrl' || field === 'avatar' || field === 'Ảnh đại diện' || field === 'Avatar' || field === 'applicantAvatarUrl') && isImageUrl(strVal)) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <img
          src={strVal}
          alt="avatar"
          style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          onClick={() => window.open(strVal, '_blank')}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>
          <a href={strVal} target="_blank" rel="noopener noreferrer" title={strVal}>
            {strVal.length > 40 ? strVal.substring(0, 40) + '...' : strVal}
          </a>
        </span>
      </span>
    );
  }

  return strVal;
};

/**
 * Bảng chi tiết thuốc trong hóa đơn MEDICATION, hiển thị trong audit log.
 * Cột: STT | Tên thuốc | ĐVT | SL | Đơn giá | Thành tiền (chưa thuế) | Thuế suất | Tiền thuế | Thành tiền
 */
const MedicationInvoiceItems = ({ items, totals, invoiceNumber, t, isVi }) => {
  const fmtVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
  const fmtPct = (n) => `${(Number(n || 0) * 100).toFixed(0)}%`;
  return (
    <div style={{ overflowX: 'auto' }}>
      {invoiceNumber && (
        <div style={{ marginBottom: 8, fontSize: 13, color: '#475569' }}>
          <strong>Hóa đơn:</strong> <span style={{ color: '#0f172a' }}>{invoiceNumber}</span>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#e2e8f0' }}>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 40 }}>STT</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Tên thuốc</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 80 }}>ĐVT</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 60 }}>SL</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 110 }}>Đơn giá</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 130 }}>Thành tiền chưa thuế</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', width: 80 }}>Thuế suất</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 110 }}>Tiền thuế</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#475569', width: 130 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.stt} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{it.stt}</td>
              <td style={{ padding: '8px 6px', color: '#0f172a' }}>{it.medicationName || '—'}</td>
              <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b' }}>{it.unit || '—'}</td>
              <td style={{ padding: '8px 6px', textAlign: 'center', color: '#0f172a' }}>{Number(it.quantity || 0).toLocaleString('vi-VN')}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', color: '#0f172a' }}>{fmtVnd(it.unitPrice)}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', color: '#0f172a' }}>{fmtVnd(it.subtotalExclTax)}</td>
              <td style={{ padding: '8px 6px', textAlign: 'center', color: '#0f172a' }}>{fmtPct(it.taxRate)}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', color: '#0f172a' }}>{fmtVnd(it.taxAmount)}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmtVnd(it.subtotalInclTax)}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr style={{ background: '#f1f5f9' }}>
              <td colSpan={5} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Tổng cộng</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmtVnd(totals.subTotal)}</td>
              <td style={{ padding: '10px 8px' }} />
              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmtVnd(totals.taxAmount)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: '#2563eb' }}>{fmtVnd(totals.total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

const ChangeDetails = ({ log, t, i18n }) => {
  const isVi = i18n?.language === 'vi';
  const isAddEmergencyContact = log.action === 'ADD_RESIDENT_EMERGENCY_CONTACT';
  const changes = [];

  // Build lookup for user names from metadata (backend sends createdByName/updatedByName)
  const metadata = log.metadata || {};
  const userNameLookup = {};
  if (metadata.createdByName) userNameLookup[log.beforeData?.createdBy] = metadata.createdByName;
  if (metadata.updatedByName) userNameLookup[log.afterData?.updatedBy] = metadata.updatedByName;
  // Also use performedBy as fallback for last editor
  if (log.performedBy) userNameLookup[log.afterData?.updatedBy] = log.performedBy;
  // Map deletedById → tên (cho audit log dừng hóa đơn)
  if (log.afterData?.deletedById && log.performedBy) {
    userNameLookup[log.afterData.deletedById] = log.performedBy;
  }

  const resolveUserName = (id) => userNameLookup[id] || id;

  // Build resident / staff name lookups from metadata (incident logs include residentNames / assignedStaffNameList)
  const residentNameLookup = {};
  if (Array.isArray(metadata.residentNames)) {
    metadata.residentNames.forEach(n => { if (n?.id) residentNameLookup[n.id] = n.name; });
  }
  const staffNameLookup = {};
  if (Array.isArray(metadata.assignedStaffNameList)) {
    metadata.assignedStaffNameList.forEach(n => { if (n?.id) staffNameLookup[n.id] = n.name; });
  }
  // Legacy fallback: some old logs send assignedStaffNames as an array of {id, name}
  if (Array.isArray(metadata.assignedStaffNames)) {
    metadata.assignedStaffNames.forEach(n => { if (n?.id) staffNameLookup[n.id] = n.name; });
  }
  if (metadata.staffName) staffNameLookup[metadata.staffId] = metadata.staffName;

  // Extract names from a comma-separated string (e.g. "Đặng Tuyết NHư; Lê Văn A")
  const splitNameList = (str) => {
    if (typeof str !== 'string') return [];
    return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  };

  const resolveIncidentName = (id, isStaff) => {
    if (!id) return id;
    // ---- Object input (populated resident/staff populated docs or raw objects) ----
    if (typeof id === 'object') {
      // Resident shape: { _id, residentCode, fullName }
      if (id.fullName) return id.fullName;
      // Staff shape: { _id, userId: { _id, fullName, email, phone, role }, staffCode, specialty }
      if (id.userId && typeof id.userId === 'object' && id.userId.fullName) return id.userId.fullName;
      if (id.userId && typeof id.userId === 'object' && id.userId.email) return id.userId.email;
      if (id.label) return id.label;
      if (id.name) return id.name;
      // Fallback: lookup by object's _id in metadata
      const strId = id._id?.toString() || id.id?.toString() || '';
      if (strId) {
        const found = isStaff ? staffNameLookup[strId] : residentNameLookup[strId];
        if (found) return found;
      }
      return id;
    }
    // ---- String / non-object input (a raw ID hex string) ----
    const strId = String(id);
    const found = isStaff ? staffNameLookup[strId] : residentNameLookup[strId];
    if (found) return found;
    return strId;
  };

  const resolveIncidentArray = (arr, isStaff, key) => {
    if (!Array.isArray(arr)) return arr;
    // Edge case: sometimes metadata.assignedStaffNames is a comma-separated string
    // stored alongside the IDs, used to back-fill names when IDs alone are not enough.
    if (isStaff && key === 'assignedStaffIds' && arr.every((x) => typeof x !== 'object') &&
        typeof metadata.assignedStaffNames === 'string' && arr.length > 0) {
      const names = splitNameList(metadata.assignedStaffNames);
      // If count matches, return exact names
      if (names.length === arr.length) return names;
    }
    const resolved = arr.map(item => resolveIncidentName(item, isStaff));
    // If we still end up with raw objects, summarize by count instead of dumping
    if (resolved.length && resolved.every((x) => typeof x === 'object')) {
      const fallbackKey = isStaff ? 'assignedStaffNames' : 'residentNames';
      const metaFallback = metadata[fallbackKey];
      if (typeof metaFallback === 'string') {
        const names = splitNameList(metaFallback);
        if (names.length === resolved.length) return names;
      }
      return resolved.map(() => isStaff ? (isVi ? 'Nhân viên' : 'Staff') : (isVi ? 'Cư dân' : 'Resident'));
    }
    return resolved;
  };

  // Get all keys from beforeData and afterData
  const allKeys = new Set([
    ...Object.keys(log.beforeData || {}),
    ...Object.keys(log.afterData || {}),
  ]);

  const perActionIgnored = getPerActionIgnoredKeys(log.action);
  allKeys.forEach(key => {
    if (IGNORED_DIFF_KEYS.has(key)) return;
    if (perActionIgnored && perActionIgnored.has(key)) return;
    const rawBeforeVal = log.beforeData?.[key];
    const rawAfterVal = log.afterData?.[key];

    // Resolve resident / staff IDs to names for incident fields
    const isResidentIds = key === 'residentIds';
    const isStaffIds = key === 'assignedStaffIds';
    const bVal = isResidentIds ? resolveIncidentArray(rawBeforeVal, false, key)
      : isStaffIds ? resolveIncidentArray(rawBeforeVal, true, key)
      : ((key === 'createdBy' || key === 'updatedBy' || key === 'deletedBy' || key === 'deletedById') ? resolveUserName(rawBeforeVal) : rawBeforeVal);
    const aVal = isResidentIds ? resolveIncidentArray(rawAfterVal, false, key)
      : isStaffIds ? resolveIncidentArray(rawAfterVal, true, key)
      : ((key === 'createdBy' || key === 'updatedBy' || key === 'deletedBy' || key === 'deletedById') ? resolveUserName(rawAfterVal) : rawAfterVal);

    const beforeStr = formatValue(bVal, isVi);
    const afterStr = formatValue(aVal, isVi);

    // Only show if values are different
    if (beforeStr !== afterStr) {
      changes.push({
        field: formatFieldName(key, isVi),
        fieldKey: key,
        before: bVal,
        after: aVal,
      });
    }
  });

  if (changes.length === 0) {
    return (
      <div className="al-changes-empty">
        {isVi ? 'Không có thay đổi dữ liệu' : 'No data changes'}
      </div>
    );
  }

  return (
    <div className="al-changes">
      {changes.map((change, idx) => (
        <div key={idx} className="al-change-item">
          <div className="al-change-item__field">{change.field}</div>
          <div className="al-change-item__values">
            <span className="al-change-value-group">
              <span className="al-change-value-group__label">
                {isVi ? 'Cũ' : 'Old'}
              </span>
              <span className="al-change-item__before" title={t('admin.auditLogs.kpi.before')}>
                {isAddEmergencyContact && change.before === undefined
                  ? (isVi ? 'Chưa có liên hệ' : 'No contact existed')
                  : renderValue(change.before, change.fieldKey, isVi, { before: log.beforeData, after: log.afterData })}
              </span>
            </span>
            <span className="al-change-item__arrow">→</span>
            <span className="al-change-value-group">
              <span className="al-change-value-group__label">
                {isVi ? 'Mới' : 'New'}
              </span>
              <span className="al-change-item__after" title={t('admin.auditLogs.kpi.after')}>
                {renderValue(change.after, change.fieldKey, isVi, { before: log.beforeData, after: log.afterData })}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const isVi = i18n?.language !== 'en';

  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [businessModule, setBusinessModule] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hideTechnical, setHideTechnical] = useState(true);
  const [filterOptions, setFilterOptions] = useState({ actions: [], businessModules: [], roles: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (action) count++;
    if (businessModule) count++;
    if (actorRole) count++;
    if (from) count++;
    if (to) count++;
    if (!hideTechnical) count++;
    return count;
  }, [search, action, businessModule, actorRole, from, to, hideTechnical]);

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      action: action || undefined,
      businessModule: businessModule || undefined,
      actorRole: actorRole || undefined,
      fromDate: from || undefined,
      toDate: to || undefined,
      hideTechnical: hideTechnical || undefined,
    }),
    [page, limit, search, action, businessModule, actorRole, from, to, hideTechnical]
  );

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await auditLogService.getAuditLogFilters({ hideTechnical });
      setFilterOptions({
        actions: options.actions || [],
        businessModules: options.businessModules || [],
        roles: options.roles || [],
      });
    } catch (err) {
      console.error('Load audit log filter options failed:', err);
    }
  }, [hideTechnical]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditLogService.getAuditLogs(filters);
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (!data.data || data.data.length === 0) {
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Load audit logs failed:', err);
      setError(err.response?.data?.message || t('admin.auditLogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    if (selectedLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedLog]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setPage(1); };

  const handleResetFilters = () => {
    setSearch('');
    setAction('');
    setBusinessModule('');
    setActorRole('');
    setFrom('');
    setTo('');
    setHideTechnical(true);
    setPage(1);
  };

  const openDrawer = (log) => setSelectedLog(log);
  const closeDrawer = () => setSelectedLog(null);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  };

  const latestTime = logs.length > 0 ? formatShortTime(logs[0].createdAt, t, locale) : '—';

  return (
    <AdminPageShell
      title={t('admin.auditLogs.title')}
      subtitle={t('admin.auditLogs.subtitle')}
    >
      <div className="al-page">
        {/* ── KPI Summary Cards ── */}
        <div className="al-kpi-grid">
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--primary">
              <FileText size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.totalEvents')}</span>
              <span className="al-kpi-card__value">{total.toLocaleString()}</span>
              <span className="al-kpi-card__sub">{t('admin.auditLogs.kpi.matchingFilters')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--blue">
              <Layers size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.pages')}</span>
              <span className="al-kpi-card__value">{page} / {totalPages}</span>
              <span className="al-kpi-card__sub">{limit} {t('admin.auditLogs.kpi.perPage')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--amber">
              <Users size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.activeFilters')}</span>
              <span className="al-kpi-card__value">{activeFilterCount}</span>
              <span className="al-kpi-card__sub">{activeFilterCount > 0 ? t('admin.auditLogs.kpi.filtersApplied') : t('admin.auditLogs.kpi.noFilters')}</span>
            </div>
          </div>
          <div className="al-kpi-card">
            <div className="al-kpi-card__icon al-kpi-card__icon--slate">
              <Clock size={20} />
            </div>
            <div className="al-kpi-card__content">
              <span className="al-kpi-card__label">{t('admin.auditLogs.kpi.latestActivity')}</span>
              <span className="al-kpi-card__value" style={{ fontSize: 16 }}>{latestTime}</span>
              <span className="al-kpi-card__sub">{t('admin.auditLogs.kpi.mostRecent')}</span>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <form className="al-filter-bar" onSubmit={handleSearchSubmit}>
          <div className="al-filter-bar__group al-filter-bar__group--search">
            <span className="al-filter-bar__label">{t('admin.auditLogs.search')}</span>
            <div className="al-filter-bar__input-wrap">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.auditLogs.searchPlaceholder')}
              />
            </div>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--module">
            <span className="al-filter-bar__label">{t('admin.auditLogs.businessModule')}</span>
            <select value={businessModule} onChange={(e) => setBusinessModule(e.target.value)}>
              <option value="">{t('admin.auditLogs.selectBusinessModule')}</option>
              {filterOptions.businessModules.map((opt) => (
                <option key={opt} value={opt}>{BUSINESS_MODULE_LABELS[opt] ? t(BUSINESS_MODULE_LABELS[opt]) : opt}</option>
              ))}
            </select>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--role">
            <span className="al-filter-bar__label">{t('admin.auditLogs.role')}</span>
            <select value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
              <option value="">{t('admin.auditLogs.kpi.allRoles')}</option>
              {filterOptions.roles.map((opt) => (
                <option key={opt} value={opt}>{ROLE_LABELS[opt] ? t(ROLE_LABELS[opt]) : opt}</option>
              ))}
            </select>
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--date">
            <span className="al-filter-bar__label">{t('admin.auditLogs.fromDate')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="al-filter-bar__group al-filter-bar__group--date">
            <span className="al-filter-bar__label">{t('admin.auditLogs.toDate')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="al-filter-bar__actions">
            <button
              type="button"
              className={`al-filter-advanced__toggle ${showAdvanced ? 'al-filter-advanced__toggle--open' : ''}`}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <ChevronDown size={14} />
            </button>
            <button type="submit" className="al-filter-bar__btn al-filter-bar__btn--primary" disabled={loading}>
              {t('admin.auditLogs.apply')}
            </button>
            <button type="button" className="al-filter-bar__btn al-filter-bar__btn--secondary" onClick={handleResetFilters} disabled={loading}>
              {t('admin.auditLogs.reset')}
            </button>
            <button type="button" className="al-filter-bar__btn al-filter-bar__btn--secondary al-filter-bar__btn--icon" onClick={loadLogs} disabled={loading} title={t('admin.auditLogs.refresh')}>
              <RefreshCw size={14} />
            </button>
          </div>
        </form>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="al-filter-advanced">
            <div className="al-filter-bar__group" style={{ flex: '0 1 200px' }}>
              <span className="al-filter-bar__label">{t('admin.auditLogs.action')}</span>
              <input
                list="al-action-opts"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={t('admin.auditLogs.actionPlaceholder')}
                style={{
                  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
                  borderRadius: 10, background: '#f8fafc', color: '#1e293b', fontSize: 13,
                }}
              />
              <datalist id="al-action-opts">
                {filterOptions.actions.map((opt) => <option key={opt} value={opt} />)}
              </datalist>
            </div>
            <label className="al-checkbox-row">
              <input
                type="checkbox"
                checked={hideTechnical}
                onChange={(e) => setHideTechnical(e.target.checked)}
              />
              {t('admin.auditLogs.hideTechnicalHelp')}
            </label>
          </div>
        )}

        {/* ── Error Alert ── */}
        {error && (
          <div className="al-alert">
            <AlertCircle size={16} />
            {error}
            <button className="al-alert__retry" onClick={loadLogs}>{t('admin.auditLogs.refresh')}</button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="al-table-card">
          <div className="al-table-wrapper">
            {loading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="al-skeleton-row">
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                    <div className="al-skeleton-cell" />
                  </div>
                ))}
              </div>
            ) : logs.length > 0 ? (
              <table className="al-table">
                <thead>
                  <tr>
                    <th>{t('admin.auditLogs.timestamp')}</th>
                    <th>{t('admin.auditLogs.kpi.type')}</th>
                    <th>{t('admin.auditLogs.displayAction')}</th>
                    <th>{t('admin.auditLogs.businessModule')}</th>
                    <th>{t('admin.auditLogs.performedBy')}</th>
                    <th>{t('admin.auditLogs.targetName')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className={selectedLog?._id === log._id ? 'al-row--selected' : ''}
                      onClick={() => openDrawer(log)}
                    >
                      <td className="al-cell-time">
                        {formatDateTime(log.createdAt, locale)}
                      </td>
                      <td>
                        <ActionBadge action={log.action} />
                      </td>
                      <td>
                        <span title={getDetailedActionMessage(log, t, i18n)}>
                          {formatActionLabel(log.action, log.displayAction, t)}
                        </span>
                        {log.targetName && (
                          <span className="al-action-target"> · {log.targetName}</span>
                        )}
                      </td>
                      <td>{formatBusinessModuleLabel(log.businessModule || log.module, t)}</td>
                      <td>
                        <div className="al-actor">
                          <span className="al-actor__name">{log.performedBy || log.actorUserId || '—'}</span>
                          <RoleTag role={log.performedByRole || log.actorRole} />
                        </div>
                      </td>
                      <td className="al-cell-target">
                        {formatTargetLabel(log.targetName, log.targetEntityType, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="al-empty">
                <div className="al-empty__icon">
                  <Inbox size={28} />
                </div>
                <p className="al-empty__title">{t('admin.auditLogs.noResults')}</p>
                <p className="al-empty__text">{t('admin.auditLogs.kpi.tryAdjustFilters')}</p>
              </div>
            )}
          </div>

          {!loading && logs.length > 0 && (
            <div className="al-table-footer">
              <ListPagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                total={total}
                hideWhenSinglePage={false}
              />
            </div>
          )}
        </div>

        {/* ── Detail Drawer ── */}
        <div
          className={`al-drawer-backdrop ${selectedLog ? 'is-open' : ''}`}
          onClick={handleBackdropClick}
        >
          {selectedLog && (
            <div className="al-drawer">
              <div className="al-drawer__header">
                <div className="al-drawer__header-info">
                  <h3 className="al-drawer__header-title">
                    {t('admin.auditLogs.details')}
                    <ActionBadge action={selectedLog.action} />
                  </h3>
                  <span className="al-drawer__header-sub">
                    {formatDateTime(selectedLog.createdAt, locale)}
                  </span>
                </div>
                <button className="al-drawer__close" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>

              <div className="al-drawer__body">
                {/* Summary */}
                <div className="al-section">
                  <h4 className="al-section__title">{t('admin.auditLogs.kpi.summary')}</h4>
                  <div className="al-detail-grid">
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.displayAction')}</span>
                      <span className="al-detail-item__value">
                        {getDetailedActionMessage(selectedLog, t, i18n)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.businessModule')}</span>
                      <span className="al-detail-item__value">
                        {formatBusinessModuleLabel(selectedLog.businessModule || selectedLog.module, t)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.performedBy')}</span>
                      <span className="al-detail-item__value">
                        {selectedLog.performedBy || selectedLog.actorUserId || '—'}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.role')}</span>
                      <span className="al-detail-item__value">
                        <RoleTag role={selectedLog.performedByRole || selectedLog.actorRole} />
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.targetName')}</span>
                      <span className="al-detail-item__value">
                        {formatTargetLabel(selectedLog.targetName, selectedLog.targetEntityType, t)}
                      </span>
                    </div>
                    <div className="al-detail-item">
                      <span className="al-detail-item__label">{t('admin.auditLogs.timestamp')}</span>
                      <span className="al-detail-item__value">
                        {formatDateTime(selectedLog.createdAt, locale)}
                      </span>
                    </div>
                    {(selectedLog.description || (isShiftAuditLog(selectedLog))) && (
                      <div className="al-detail-item al-detail-item--full">
                        <span className="al-detail-item__label">{t('admin.auditLogs.description')}</span>
                        <span className="al-detail-item__value">
                          {isShiftAuditLog(selectedLog)
                            ? formatShiftAuditDescription(selectedLog, t)
                            : (selectedLog.description || '—')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medication Invoice Items (table) — hiển thị riêng cho hóa đơn thuốc */}
                {selectedLog.action === 'CREATE_INVOICE'
                  && String(selectedLog?.afterData?.type || '').toUpperCase() === 'MEDICATION'
                  && Array.isArray(selectedLog?.metadata?.items)
                  && selectedLog.metadata.items.length > 0 && (
                  <div className="al-section">
                    <h4 className="al-section__title">Danh sách thuốc trong hóa đơn</h4>
                    <MedicationInvoiceItems
                      items={selectedLog.metadata.items}
                      totals={selectedLog.metadata.totals}
                      invoiceNumber={selectedLog?.afterData?.invoiceNumber}
                      t={t}
                      isVi={isVi}
                    />
                  </div>
                )}

                {/* Changes */}
                {(selectedLog.beforeData || selectedLog.afterData || selectedLog.metadata) && (
                  <div className="al-section">
                    <h4 className="al-section__title">{t('admin.auditLogs.changes')}</h4>
                    <ChangeDetails log={selectedLog} t={t} i18n={i18n} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
