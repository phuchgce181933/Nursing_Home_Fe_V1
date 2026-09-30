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
  prescription: 'admin.auditLogs.businessModules.prescription',
  'clinical-billing': 'admin.auditLogs.businessModules.clinicalBilling',
  auth: 'admin.auditLogs.businessModules.auth',
  contract: 'admin.auditLogs.businessModules.contract',
};

const ROLE_LABELS = {
  // doctor role hidden from display
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

// Extract readable name from a user object or ID
const resolveUserName = (val) => {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.fullName) return val.fullName;
    if (val.userId?.fullName) return val.userId.fullName;
    if (val._id) return String(val._id);
    return JSON.stringify(val);
  }
  return String(val);
};

const formatActionLabel = (actionKey, displayAction, t) => {
  if (!actionKey && !displayAction) return '—';
  const translationKey = actionKey ? `admin.auditLogs.actionNames.${actionKey}` : null;
  const translated = translationKey ? t(translationKey) : null;

  // Medication logs previously stored English displayAction values. Prefer the
  // current locale mapping for these actions so old and new logs are consistent.
  const medicationActions = new Set([
    'CREATE_MEDICATION',
    'UPDATE_MEDICATION',
    'UPDATE_SELLING_PRICE',
    'ADD_MEDICATION_NOTE',
    'CREATE_MEDICATION_STOCK',
    'UPDATE_MEDICATION_STOCK',
    'DISPENSE_MEDICATION',
  ]);
  if (medicationActions.has(actionKey) && translated && translated !== translationKey) return translated;
  // Prioritize displayAction for other modules because it may contain specific context.
  if (displayAction) return displayAction;
  if (translated && translated !== translationKey) return translated;
  return humanizeAction(actionKey);
};

const getDetailedActionMessage = (log, t, i18n) => {
  // performedBy takes priority; fall back to actorUserId (string ID or populated object)
  const rawActorId = log.actorUserId;
  const actorNameFromId = rawActorId && typeof rawActorId === 'object' ? rawActorId.fullName : rawActorId;
  const actor = log.performedBy || actorNameFromId || 'Người dùng';
  const target = log.targetName || '—';
  const action = log.action;

  const isVi = String(i18n?.language || '').toLowerCase().startsWith('vi');

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

  // Leave request actions
  const translateLeaveType = (type) => {
    if (!type) return '';
    const mapVi = { annual: 'Nghỉ phép năm', sick: 'Nghỉ ốm', emergency: 'Nghỉ khẩn cấp', unpaid: 'Nghỉ không lương', other: 'Khác' };
    const mapEn = { annual: 'Annual leave', sick: 'Sick leave', emergency: 'Emergency leave', unpaid: 'Unpaid leave', other: 'Other' };
    return isVi ? (mapVi[type] || type) : (mapEn[type] || type);
  };
  const translateLeaveStatus = (status) => {
    if (!status) return '';
    const mapVi = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' };
    const mapEn = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
    return isVi ? (mapVi[status] || status) : (mapEn[status] || status);
  };
  const leaveAfterData = log.afterData || {};
  const leaveBeforeData = log.beforeData || {};
  const leaveType = leaveAfterData.leaveType || leaveBeforeData.leaveType || '';
  const leaveStartDate = leaveAfterData.startDate || leaveBeforeData.startDate;
  const leaveEndDate = leaveAfterData.endDate || leaveBeforeData.endDate;
  const leaveDays = leaveAfterData.daysRequested || leaveBeforeData.daysRequested;
  const leaveReason = leaveAfterData.reason || leaveBeforeData.reason || log.description || '';
  const leaveReviewNote = leaveAfterData.reviewNote || leaveBeforeData.reviewNote;
  const leaveStatus = leaveAfterData.status || leaveBeforeData.status || '';
  const formatLeaveDateRange = (start, end) => {
    if (!start) return '';
    const fmt = (d) => {
      const date = new Date(d);
      return date.toLocaleDateString(isVi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
  };
  const leaveTarget = leaveType
    ? `${translateLeaveType(leaveType)}${leaveStartDate ? ` (${formatLeaveDateRange(leaveStartDate, leaveEndDate)})` : ''}`
    : leaveStartDate ? formatLeaveDateRange(leaveStartDate, leaveEndDate) : target;

  if (action === 'SUBMIT_LEAVE_REQUEST') {
    return isVi
      ? `${actor} đã gửi đơn xin nghỉ phép${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveDays ? ` (${leaveDays} ngày)` : ''}${leaveReason ? `\nLý do: ${leaveReason}` : ''}`
      : `${actor} submitted leave request${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveDays ? ` (${leaveDays} day(s))` : ''}${leaveReason ? `\nReason: ${leaveReason}` : ''}`;
  }
  if (action === 'APPROVE_LEAVE_REQUEST') {
    return isVi
      ? `${actor} đã phê duyệt đơn nghỉ phép${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveReviewNote ? `\nGhi chú: ${leaveReviewNote}` : ''}`
      : `${actor} approved leave request${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveReviewNote ? `\nNote: ${leaveReviewNote}` : ''}`;
  }
  if (action === 'REJECT_LEAVE_REQUEST') {
    return isVi
      ? `${actor} đã từ chối đơn nghỉ phép${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveReviewNote ? `\nLý do từ chối: ${leaveReviewNote}` : ''}`
      : `${actor} rejected leave request${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}${leaveReviewNote ? `\nRejection reason: ${leaveReviewNote}` : ''}`;
  }
  if (action === 'CANCEL_LEAVE_REQUEST') {
    return isVi
      ? `${actor} đã hủy đơn nghỉ phép${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}`
      : `${actor} cancelled leave request${leaveTarget !== '—' ? ` — ${leaveTarget}` : ''}`;
  }

  // CareNote actions
  const noteTypeMapVi = { meal: 'Bữa ăn', activity: 'Hoạt động', daily_living: 'Sinh hoạt hàng ngày', health: 'Sức khỏe', general: 'Tổng quát' };
  const noteTypeMapEn = { meal: 'Meal', activity: 'Activity', daily_living: 'Daily living', health: 'Health', general: 'General' };
  const translateNoteType = (type) => isVi ? (noteTypeMapVi[type] || type) : (noteTypeMapEn[type] || type);

  const noteData = log.afterData || log.beforeData || {};
  const noteType = noteData.noteType || '';
  const noteContent = noteData.content || '';
  const noteAt = noteData.noteAt || noteData.createdAt;
  const residentName = noteData.residentName || log.targetName?.split(' — ')[0] || '—';
  const displayNoteType = translateNoteType(noteType);
  const noteTarget = noteType ? `${residentName} — ${displayNoteType}` : (residentName !== '—' ? residentName : target);

  if (action === 'CREATE' && log.module === 'CareNote') {
    return isVi
      ? `${actor} đã tạo ghi chú chăm sóc — ${noteTarget}${noteContent ? `\nNội dung: ${noteContent.slice(0, 100)}${noteContent.length > 100 ? '...' : ''}` : ''}`
      : `${actor} created care note — ${noteTarget}${noteContent ? `\nContent: ${noteContent.slice(0, 100)}${noteContent.length > 100 ? '...' : ''}` : ''}`;
  }
  if (action === 'UPDATE' && log.module === 'CareNote') {
    return isVi
      ? `${actor} đã cập nhật ghi chú chăm sóc — ${noteTarget}`
      : `${actor} updated care note — ${noteTarget}`;
  }
  if (action === 'DELETE' && log.module === 'CareNote') {
    return isVi
      ? `${actor} đã xóa ghi chú chăm sóc — ${noteTarget}`
      : `${actor} deleted care note — ${noteTarget}`;
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
  'familyAccountId', 'residentId', 'chargeId', 'attachmentsAdded',
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

function summarizeArray(val, isVi, field) {
  if (!Array.isArray(val)) return String(val);
  if (val.length === 0) return '—';
  if (field === 'entries') {
    const mealNames = [...new Set(val.map((item) => item?.mealName).filter(Boolean))];
    const timeEntries = val.filter((item) => item?.breakfastTime || item?.lunchTime || item?.dinnerTime);
    if (mealNames.length) return isVi ? `${val.length} mục món ăn: ${mealNames.join(', ')}` : `${val.length} meal item(s): ${mealNames.join(', ')}`;
    if (timeEntries.length) {
      const details = timeEntries.map((item) => {
        const residentName = item?.residentId?.fullName || (typeof item?.residentId === 'string' ? item.residentId : (isVi ? 'Cư dân' : 'Resident'));
        return `${residentName}: Sáng ${item.breakfastTime || '—'}, Trưa ${item.lunchTime || '—'}, Tối ${item.dinnerTime || '—'}`;
      });
      return isVi ? details.join('; ') : details.join('; ');
    }
  }
  if (field === 'changeLog') {
    const actionLabels = { created: 'Đã tạo', updated: 'Đã cập nhật', published: 'Đã xuất bản' };
    const actions = val.map((item) => isVi ? (actionLabels[item?.action] || item?.action) : item?.action).filter(Boolean);
    if (actions.length) return actions.join(', ');
  }
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

// Translate care note metadata fields
const METADATA_KEY_LABELS_VI = {
  mealType: 'Bữa ăn',
  intakeAmount: 'Lượng ăn',
  appetite: 'Ngon miệng',
  activityType: 'Loại hoạt động',
  participationLevel: 'Mức độ tham gia',
  mood: 'Tâm trạng',
  duration: 'Thời gian (phút)',
  assistanceLevel: 'Mức độ hỗ trợ',
  completionStatus: 'Trạng thái hoàn thành',
  consciousness: 'Tri giác',
  fallRisk: 'Nguy cơ té ngã',
  symptoms: 'Triệu chứng',
  painLevel: 'Mức độ đau',
  temperature: 'Nhiệt độ (°C)',
  skinCondition: 'Tình trạng da',
  observations: 'Quan sát',
  priority: 'Ưu tiên',
};
const METADATA_KEY_LABELS_EN = {
  mealType: 'Meal type',
  intakeAmount: 'Intake amount',
  appetite: 'Appetite',
  activityType: 'Activity type',
  participationLevel: 'Participation level',
  mood: 'Mood',
  duration: 'Duration (min)',
  assistanceLevel: 'Assistance level',
  completionStatus: 'Completion status',
  consciousness: 'Consciousness',
  fallRisk: 'Fall risk',
  symptoms: 'Symptoms',
  painLevel: 'Pain level',
  temperature: 'Temperature (°C)',
  skinCondition: 'Skin condition',
  observations: 'Observations',
  priority: 'Priority',
};
const METADATA_VALUE_LABELS_VI = {
  // meal
  breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối', snack: 'Phụ',
  none: 'Không ăn', little: 'Ít', half: 'Nửa', most: 'Hầu hết', all: 'Hết',
  poor: 'Kém', fair: 'Bình thường', good: 'Tốt', excellent: 'Rất tốt',
  // activity
  walking: 'Đi bộ', exercise: 'Tập thể dục', physiotherapy: 'Vật lý trị liệu',
  reading: 'Đọc sách', socializing: 'Giao lưu', entertainment: 'Giải trí', other: 'Khác',
  refused: 'Từ chối', assisted: 'Cần hỗ trợ', supervised: 'Giám sát', independent: 'Tự lập',
  // mood
  happy: 'Vui vẻ', neutral: 'Bình thường', sad: 'Buồn', agitated: 'Bồn chồn', anxious: 'Lo lắng',
  // daily living
  bathing: 'Tắm rửa', grooming: 'Vệ sinh cá nhân', dressing: 'Mặc quần áo',
  eating: 'Ăn uống', mobility: 'Di chuyển', toileting: 'Vệ sinh', sleeping: 'Ngủ nghỉ',
  total_care: 'Chăm sóc toàn diện',
  completed: 'Hoàn thành', partial: 'Một phần',
  // health
  alert: 'Tỉnh táo', confused: 'Lú lẫn', drowsy: 'Buồn ngủ', unresponsive: 'Không phản ứng',
  low: 'Thấp', medium: 'Trung bình', high: 'Cao',
};
const METADATA_VALUE_LABELS_EN = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  none: 'None', little: 'Little', half: 'Half', most: 'Most', all: 'All',
  poor: 'Poor', fair: 'Fair', good: 'Good', excellent: 'Excellent',
  walking: 'Walking', exercise: 'Exercise', physiotherapy: 'Physiotherapy',
  reading: 'Reading', socializing: 'Socializing', entertainment: 'Entertainment', other: 'Other',
  refused: 'Refused', assisted: 'Assisted', supervised: 'Supervised', independent: 'Independent',
  happy: 'Happy', neutral: 'Neutral', sad: 'Sad', agitated: 'Agitated', anxious: 'Anxious',
  bathing: 'Bathing', grooming: 'Grooming', dressing: 'Dressing',
  eating: 'Eating', mobility: 'Mobility', toileting: 'Toileting', sleeping: 'Sleeping',
  total_care: 'Total care',
  completed: 'Completed', partial: 'Partial',
  alert: 'Alert', confused: 'Confused', drowsy: 'Drowsy', unresponsive: 'Unresponsive',
  low: 'Low', medium: 'Medium', high: 'High',
};

const renderCareNoteMetadata = (metadata, isVi) => {
  if (!metadata || typeof metadata !== 'object') return String(metadata);
  const keyLabels = isVi ? METADATA_KEY_LABELS_VI : METADATA_KEY_LABELS_EN;
  const valueLabels = isVi ? METADATA_VALUE_LABELS_VI : METADATA_VALUE_LABELS_EN;
  const translateVal = (v) => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return valueLabels[v] || v;
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v)) return v.map(translateVal).join(', ');
    return String(v);
  };
  return Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const label = keyLabels[k] || k;
      const displayVal = translateVal(v);
      return `${label}: ${displayVal}`;
    })
    .join('\n');
};

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

    const bStr = bVal !== undefined && bVal !== null ? (bIsArr ? summarizeArray(bVal, isVi, key) : (typeof bVal === 'object' ? resolveUserName(bVal) : String(bVal))) : '';
    const aStr = aVal !== undefined && aVal !== null ? (aIsArr ? summarizeArray(aVal, isVi, key) : (typeof aVal === 'object' ? resolveUserName(aVal) : String(aVal))) : '';
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
  medicationCode: 'Mã thuốc',
  name: 'Tên thuốc',
  form: 'Dạng thuốc',
  strength: 'Hàm lượng',
  unit: 'Đơn vị',
  manufacturer: 'Nhà sản xuất',
  minStockLevel: 'Mức tồn kho tối thiểu',
  isActive: 'Đang hoạt động',
  price: 'Giá bán',
  sellingPrice: 'Giá bán',
  batchNumber: 'Số lô',
  lotNumber: 'Số lô',
  expiryDate: 'Hạn sử dụng',
  receivedDate: 'Ngày nhập',
  costPerUnit: 'Đơn giá nhập',
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
  measuredAt: 'Thời gian đo',
  bloodPressureSystolic: 'Huyết áp tâm thu',
  bloodPressureDiastolic: 'Huyết áp tâm trương',
  pulse: 'Mạch',
  temperatureCelsius: 'Nhiệt độ',
  oxygenSaturation: 'Độ bão hòa oxy',
  bloodSugar: 'Đường huyết',
  weightKg: 'Cân nặng',
  heightCm: 'Chiều cao',
  bloodType: 'Nhóm máu',
  abnormalFlag: 'Chỉ số bất thường',
  summary: 'Tóm tắt khám',
  physicalExamination: 'Khám lâm sàng',
  selectedServices: 'Dịch vụ lâm sàng',
  workDate: 'Ngày làm việc',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  mealType: 'Bữa ăn',
  intakeStatus: 'Tình trạng ăn',
  portionPercent: 'Tỷ lệ ăn',
  plannedMealName: 'Tên món ăn',
  recordedByStaffId: 'Người ghi nhận',
  recordedAt: 'Thời gian ghi nhận',
  activityType: 'Loại hoạt động vệ sinh',
  activityCategory: 'Nhóm hoạt động vệ sinh',
  careStage: 'Giai đoạn chăm sóc',
  title: 'Tên kế hoạch',
  mealTimeScheduleDayId: 'Lịch giờ ăn',
  entries: 'Danh sách giờ ăn',
  changeLog: 'Lịch sử thay đổi',
  observationCategory: 'Nhóm quan sát',
  moodLevel: 'Mức tâm trạng',
  behaviorType: 'Loại hành vi',
  severity: 'Mức độ',
  observedAt: 'Thời gian quan sát',
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
  // Leave request fields
  leaveType: 'Loại nghỉ phép',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  daysRequested: 'Số ngày nghỉ',
  reason: 'Lý do',
  reviewNote: 'Ghi chú phê duyệt',
  status: 'Trạng thái',
  actualTimeTaken: 'Thời điểm dùng thuốc',
  administrationTiming: 'Thời điểm dùng thuốc',
  // CareNote fields
  noteType: 'Loại ghi chú',
  content: 'Nội dung',
  noteAt: 'Thời gian ghi',
  metadata: 'Dữ liệu bổ sung',
  // Contract terminate fields
  bedId: 'Giường',
  cancellationReason: 'Lý do chấm dứt',
  bedFreed: 'Giường đã giải phóng',
  tasksCancelled: 'Công việc đã hủy',
  terminatedAt: 'Thời gian chấm dứt',
  eligibilityStatusReset: 'Đã reset trạng thái đủ điều kiện',
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
  measuredAt: 'Measurement time',
  bloodPressureSystolic: 'Systolic blood pressure',
  bloodPressureDiastolic: 'Diastolic blood pressure',
  pulse: 'Pulse',
  temperatureCelsius: 'Temperature',
  oxygenSaturation: 'Oxygen saturation',
  bloodSugar: 'Blood sugar',
  weightKg: 'Weight',
  heightCm: 'Height',
  bloodType: 'Blood type',
  abnormalFlag: 'Abnormal readings',
  summary: 'Examination summary',
  physicalExamination: 'Physical examination',
  selectedServices: 'Clinical services',
  workDate: 'Work date',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  mealType: 'Meal type',
  intakeStatus: 'Intake status',
  portionPercent: 'Portion percentage',
  plannedMealName: 'Planned meal name',
  recordedByStaffId: 'Recorded by',
  recordedAt: 'Recorded at',
  activityType: 'Hygiene activity type',
  activityCategory: 'Hygiene activity category',
  careStage: 'Care stage',
  title: 'Plan title',
  mealTimeScheduleDayId: 'Meal time schedule',
  entries: 'Meal entries',
  changeLog: 'Change history',
  observationCategory: 'Observation category',
  moodLevel: 'Mood level',
  behaviorType: 'Behavior type',
  severity: 'Severity',
  observedAt: 'Observed at',
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
  // Leave request fields
  leaveType: 'Leave Type',
  startDate: 'Start Date',
  endDate: 'End Date',
  daysRequested: 'Days Requested',
  reason: 'Reason',
  reviewNote: 'Review Note',
  status: 'Status',
  actualTimeTaken: 'Medication time taken',
  administrationTiming: 'Administration timing',
  // CareNote fields
  noteType: 'Note Type',
  content: 'Content',
  noteAt: 'Recorded At',
  metadata: 'Additional Data',
  // Contract terminate fields
  bedId: 'Bed',
  cancellationReason: 'Cancellation Reason',
  bedFreed: 'Bed Freed',
  tasksCancelled: 'Tasks Cancelled',
  terminatedAt: 'Terminated At',
  eligibilityStatusReset: 'Eligibility Status Reset',
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

  // Build resident name lookup from metadata (for attendance / participation records)
  const metadata = log.metadata || {};
  const residentNameLookup = {};
  if (Array.isArray(metadata.residentNames)) {
    metadata.residentNames.forEach(n => { if (n?.id) residentNameLookup[n.id] = n.name; });
  }

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
                ? (Array.isArray(val) ? summarizeArray(val, isVi, key) : (typeof val === 'object' ? (field === 'metadata' ? renderCareNoteMetadata(val, isVi) : resolveUserName(val)) : String(val)))
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
    medicationCode: 'Mã thuốc',
    name: 'Tên thuốc',
    form: 'Dạng thuốc',
    strength: 'Hàm lượng',
    unit: 'Đơn vị',
    manufacturer: 'Nhà sản xuất',
    minStockLevel: 'Mức tồn kho tối thiểu',
    isActive: 'Đang hoạt động',
    price: 'Giá bán',
    sellingPrice: 'Giá bán',
    medicationId: 'Mã thuốc',
    batchNumber: 'Số lô',
    expiryDate: 'Hạn sử dụng',
    quantity: 'Số lượng',
    allergies: 'Dị ứng',
    drugAllergies: 'Dị ứng thuốc',
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
    authorStaffId: 'Người tạo',
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
    // Activity attendance / participation fields
    attendanceRecords: 'Bản ghi điểm danh',
    participationRecords: 'Bản ghi tham gia',
    participantResultNotes: 'Ghi chú kết quả',
    // Prescription fields
    diagnosisNote: 'Chẩn đoán',
    validUntil: 'Ngày hết hạn',
    frequency: 'Tần suất',
    dosage: 'Liều lượng',
    unit: 'Đơn vị',
    times: 'Giờ uống',
    route: 'Đường dùng',
    duration: 'Thời gian',
    instructions: 'Hướng dẫn',
    isPRN: 'Khi cần',
    maxDailyDoses: 'Liều tối đa/ngày',
    prnReason: 'Lý do khi cần',
    itemCount: 'Số loại thuốc',
    // CareNote fields
    noteType: 'Loại ghi chú',
    content: 'Nội dung',
    noteAt: 'Thời gian ghi',
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
    authorStaffId: 'Created by',
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
    // Activity attendance / participation fields
    attendanceRecords: 'Attendance Records',
    participationRecords: 'Participation Records',
    participantResultNotes: 'Result Notes',
    // Prescription fields
    diagnosisNote: 'Diagnosis',
    validUntil: 'Valid Until',
    frequency: 'Frequency',
    dosage: 'Dosage',
    unit: 'Unit',
    times: 'Administration Times',
    route: 'Route',
    duration: 'Duration',
    instructions: 'Instructions',
    isPRN: 'PRN',
    maxDailyDoses: 'Max Daily Doses',
    prnReason: 'PRN Reason',
    itemCount: 'Item Count',
    // CareNote fields
    noteType: 'Note Type',
    content: 'Content',
    noteAt: 'Recorded At',
  };
  return fieldMap[field] || field;
};

const formatFieldName = (field, isVi) => isVi ? formatFieldNameVi(field) : formatFieldNameEn(field);

const formatValue = (val, field, isVi = true) => {
  const emptyLabel = isVi ? '(trống)' : '(empty)';
  if (val === undefined || val === null) return '—';
  if (val === '') return emptyLabel;
  if (Array.isArray(val)) {
    if (val.length === 0) return emptyLabel;
    if (typeof val[0] === 'object') return summarizeArray(val, isVi, field);
    return val.join(', ');
  }
  if (typeof val === 'object') {
    if (field === 'metadata') return renderCareNoteMetadata(val, isVi);
    return resolveUserName(val);
  }
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

const translateMedicationStatus = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const upper = val.toUpperCase();
  const mapVi = {
    PENDING: 'Chờ dùng',
    TAKEN: 'Đã dùng',
    LATE_TAKEN: 'Đã dùng muộn',
    MISSED: 'Bỏ lỡ',
    REFUSED: 'Từ chối dùng',
    HELD: 'Đã giữ lại',
    NOT_AVAILABLE: 'Không có thuốc',
    OVERDUE: 'Quá giờ',
    SKIPPED: 'Đã bỏ qua',
  };
  const mapEn = {
    PENDING: 'Pending',
    TAKEN: 'Taken',
    LATE_TAKEN: 'Taken late',
    MISSED: 'Missed',
    REFUSED: 'Refused',
    HELD: 'Held',
    NOT_AVAILABLE: 'Not available',
    OVERDUE: 'Overdue',
    SKIPPED: 'Skipped',
  };
  return (isVi ? mapVi[upper] : mapEn[upper]) || val;
};

const translateAdministrationTiming = (val, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const mapVi = { early: 'Sớm', late: 'Muộn', on_time: 'Đúng giờ' };
  const mapEn = { early: 'Early', late: 'Late', on_time: 'On time' };
  const key = val.toLowerCase();
  return (isVi ? mapVi[key] : mapEn[key]) || val;
};

const translateMealIntakeValue = (val, field, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const maps = {
    mealType: {
      vi: { breakfast: 'Sáng', lunch: 'Trưa', dinner: 'Tối' },
      en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' },
    },
    intakeStatus: {
      vi: { full: 'Ăn hết', partial: 'Ăn một phần', refused: 'Từ chối ăn', assisted: 'Cần hỗ trợ' },
      en: { full: 'Full', partial: 'Partial', refused: 'Refused', assisted: 'Assisted' },
    },
  };
  const map = maps[field]?.[isVi ? 'vi' : 'en'];
  return map?.[val.toLowerCase()] || val;
};

const translateHygieneValue = (val, field, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const maps = {
    activityType: {
      vi: {
        bathing: 'Tắm rửa', oral_care: 'Vệ sinh răng miệng', grooming: 'Chải chuốt',
        toileting: 'Đi vệ sinh', diaper_change: 'Thay tã', room_tidy: 'Dọn phòng',
        bathroom_clean: 'Vệ sinh phòng tắm', linen_change: 'Thay ga giường', laundry: 'Giặt đồ',
      },
      en: {
        bathing: 'Bathing', oral_care: 'Oral care', grooming: 'Grooming',
        toileting: 'Toileting', diaper_change: 'Diaper change', room_tidy: 'Room tidy',
        bathroom_clean: 'Bathroom clean', linen_change: 'Linen change', laundry: 'Laundry',
      },
    },
    activityCategory: {
      vi: { personal: 'Cá nhân', environment: 'Môi trường' },
      en: { personal: 'Personal', environment: 'Environment' },
    },
    completionStatus: {
      vi: { completed: 'Hoàn thành', partial: 'Một phần', refused: 'Từ chối', assisted: 'Cần hỗ trợ' },
      en: { completed: 'Completed', partial: 'Partial', refused: 'Refused', assisted: 'Assisted' },
    },
  };
  const map = maps[field]?.[isVi ? 'vi' : 'en'];
  return map?.[val.toLowerCase()] || val;
};

const translateBehaviorValue = (val, field, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const maps = {
    observationCategory: {
      vi: { mood: 'Tâm trạng', behavior: 'Hành vi', abnormal: 'Bất thường' },
      en: { mood: 'Mood', behavior: 'Behavior', abnormal: 'Abnormal' },
    },
    moodLevel: {
      vi: { calm: 'Bình tĩnh', happy: 'Vui vẻ', neutral: 'Bình thường', anxious: 'Lo lắng', sad: 'Buồn', agitated: 'Kích động', confused: 'Lú lẫn', irritable: 'Cáu gắt' },
      en: { calm: 'Calm', happy: 'Happy', neutral: 'Neutral', anxious: 'Anxious', sad: 'Sad', agitated: 'Agitated', confused: 'Confused', irritable: 'Irritable' },
    },
    behaviorType: {
      vi: { cooperative: 'Hợp tác', withdrawn: 'Thu mình', restless: 'Bồn chồn', wandering: 'Đi lang thang', verbal_outburst: 'La hét/lời nói bộc phát', physical_resistance: 'Kháng cự', sleep_disturbance: 'Rối loạn giấc ngủ', appetite_change: 'Thay đổi cảm giác ăn uống', social_withdrawal: 'Xa cách xã hội', repetitive_behavior: 'Hành vi lặp lại', other: 'Khác' },
      en: { cooperative: 'Cooperative', withdrawn: 'Withdrawn', restless: 'Restless', wandering: 'Wandering', verbal_outburst: 'Verbal outburst', physical_resistance: 'Physical resistance', sleep_disturbance: 'Sleep disturbance', appetite_change: 'Appetite change', social_withdrawal: 'Social withdrawal', repetitive_behavior: 'Repetitive behavior', other: 'Other' },
    },
    severity: {
      vi: { normal: 'Bình thường', mild: 'Nhẹ', moderate: 'Vừa', urgent: 'Khẩn cấp' },
      en: { normal: 'Normal', mild: 'Mild', moderate: 'Moderate', urgent: 'Urgent' },
    },
  };
  const map = maps[field]?.[isVi ? 'vi' : 'en'];
  return map?.[val.toLowerCase()] || val;
};

const translateMealPlanValue = (val, field, isVi) => {
  if (!val || typeof val !== 'string') return val;
  const maps = {
    careStage: {
      vi: { recovery: 'Phục hồi', maintenance: 'Duy trì', special_monitoring: 'Theo dõi đặc biệt' },
      en: { recovery: 'Recovery', maintenance: 'Maintenance', special_monitoring: 'Special monitoring' },
    },
    status: {
      vi: { draft: 'Bản nháp', published: 'Đã xuất bản' },
      en: { draft: 'Draft', published: 'Published' },
    },
  };
  const map = maps[field]?.[isVi ? 'vi' : 'en'];
  return map?.[val.toLowerCase()] || val;
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

      // attendanceRecords: show resident name + attendance status + date
      if (field === 'attendanceRecords' || field === 'Bản ghi điểm danh') {
        const ATTENDANCE_LABELS_VI = { present: 'Có mặt', absent: 'Vắng mặt', late: 'Đi muộn', left_early: 'Về sớm' };
        const ATTENDANCE_LABELS_EN = { present: 'Present', absent: 'Absent', late: 'Late', left_early: 'Left early' };
        return val.map((rec) => {
          const name = dataContext?.residentNameLookup?.[rec.residentId] || rec.residentId;
          const statusLabel = (isVi ? ATTENDANCE_LABELS_VI[rec.status] : ATTENDANCE_LABELS_EN[rec.status]) || rec.status || '—';
          const dateStr = rec.occurrenceDate ? new Date(rec.occurrenceDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit' }) : '';
          const note = rec.notes ? ` (${rec.notes})` : '';
          return `${name}: ${statusLabel}${dateStr ? ` · ${dateStr}` : ''}${note}`;
        }).join('\n');
      }

      // participationRecords: show resident name + participation level + date
      if (field === 'participationRecords' || field === 'Bản ghi tham gia') {
        const LEVEL_LABELS_VI = { active: 'Tích cực', partial: 'Một phần', passive: 'Thụ động' };
        const LEVEL_LABELS_EN = { active: 'Active', partial: 'Partial', passive: 'Passive' };
        return val.map((rec) => {
          const name = dataContext?.residentNameLookup?.[rec.residentId] || rec.residentId;
          const levelLabel = (isVi ? LEVEL_LABELS_VI[rec.level] : LEVEL_LABELS_EN[rec.level]) || rec.level || '—';
          const dateStr = rec.occurrenceDate ? new Date(rec.occurrenceDate).toLocaleDateString(isVi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit' }) : '';
          const note = rec.notes ? ` (${rec.notes})` : '';
          return `${name}: ${levelLabel}${dateStr ? ` · ${dateStr}` : ''}${note}`;
        }).join('\n');
      }

      return summarizeArray(val, isVi, field);
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
    if (field === 'metadata') {
      return renderCareNoteMetadata(val, isVi);
    }
    return resolveUserName(val);
  }

  const strVal = String(val);

  if (field === 'mealType' || field === 'intakeStatus') {
    return translateMealIntakeValue(strVal, field, isVi);
  }

  if (field === 'activityType' || field === 'activityCategory' || field === 'completionStatus') {
    return translateHygieneValue(strVal, field, isVi);
  }

  if (field === 'observationCategory' || field === 'moodLevel' || field === 'behaviorType' || field === 'severity') {
    return translateBehaviorValue(strVal, field, isVi);
  }

  if (field === 'careStage' || (field === 'status' && ['draft', 'published'].includes(strVal.toLowerCase()))) {
    return translateMealPlanValue(strVal, field, isVi);
  }

  if (field === 'portionPercent' && isVi) {
    return `${strVal}%`;
  }

  // Translate gender values
  if (field === 'gender' || field === 'Giới tính' || field === 'Gender' || field === 'applicantGender') {
    return translateGender(strVal, isVi);
  }

  // Date fields: format as locale datetime
  if (['dueDate', 'issuedAt', 'paidAt', 'createdAt', 'updatedAt', 'completedAt', 'performedAt', 'confirmedAt', 'expiryDate', 'receivedDate', 'workDate', 'scheduledStartAt', 'scheduledEndAt', 'incidentAt', 'noteAt', 'actualTimeTaken', 'recordedAt'].includes(field)) {
    const date = new Date(strVal);
    if (!isNaN(date)) {
      return date.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  }

  // Translate medication schedule status values before generic status handling.
  if ((field === 'status' || field === 'Trạng thái' || field === 'Status') &&
    ['PENDING', 'TAKEN', 'LATE_TAKEN', 'MISSED', 'REFUSED', 'HELD', 'NOT_AVAILABLE', 'OVERDUE', 'SKIPPED'].includes(strVal.toUpperCase())) {
    return translateMedicationStatus(strVal, isVi);
  }

  if (field === 'administrationTiming' || field === 'Thời điểm dùng thuốc' || field === 'Administration timing') {
    return translateAdministrationTiming(strVal, isVi);
  }

  // Translate prescription status values (before generic status check)
  if ((field === 'status' || field === 'Trạng thái' || field === 'Status') &&
    ['ACTIVE', 'DRAFT', 'SUSPENDED', 'COMPLETED', 'EXPIRED', 'CANCELLED'].includes(strVal.toUpperCase())) {
    const mapVi = { ACTIVE: 'Hoạt động', DRAFT: 'Bản nháp', SUSPENDED: 'Tạm ngưng', COMPLETED: 'Hoàn thành', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' };
    const mapEn = { ACTIVE: 'Active', DRAFT: 'Draft', SUSPENDED: 'Suspended', COMPLETED: 'Completed', EXPIRED: 'Expired', CANCELLED: 'Cancelled' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
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

  // Translate leave type values
  if (field === 'leaveType' || field === 'Loại nghỉ phép' || field === 'Leave Type' || field === 'type') {
    const mapVi = { annual: 'Nghỉ phép năm', sick: 'Nghỉ ốm', emergency: 'Nghỉ khẩn cấp', unpaid: 'Nghỉ không lương', other: 'Khác' };
    const mapEn = { annual: 'Annual leave', sick: 'Sick leave', emergency: 'Emergency leave', unpaid: 'Unpaid leave', other: 'Other' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Translate leave request status values
  if ((field === 'status' || field === 'Trạng thái' || field === 'Status') &&
    ['pending', 'approved', 'rejected', 'cancelled'].includes(strVal.toLowerCase())) {
    const mapVi = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' };
    const mapEn = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
  }

  // Format leave request date fields
  if (['startDate', 'endDate', 'start', 'end'].includes(field)) {
    const date = new Date(strVal);
    if (!isNaN(date)) {
      return date.toLocaleDateString(isVi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  // Translate daysRequested
  if (field === 'daysRequested' || field === 'Số ngày nghỉ' || field === 'Days Requested') {
    const n = Number(strVal);
    return isVi ? `${n} ngày` : `${n} day(s)`;
  }

  // Translate care note type values
  if (field === 'noteType' || field === 'Loại ghi chú' || field === 'Note Type') {
    const mapVi = { meal: 'Bữa ăn', activity: 'Hoạt động', daily_living: 'Sinh hoạt hàng ngày', health: 'Sức khỏe', general: 'Tổng quát' };
    const mapEn = { meal: 'Meal', activity: 'Activity', daily_living: 'Daily living', health: 'Health', general: 'General' };
    return (isVi ? mapVi[strVal] : mapEn[strVal]) || strVal;
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
  const isVi = String(i18n?.language || '').toLowerCase().startsWith('vi');
  const isAddEmergencyContact = log.action === 'ADD_RESIDENT_EMERGENCY_CONTACT';
  const changes = [];

  // Build lookup for user names from metadata (backend sends createdByName/updatedByName)
  const metadata = log.metadata || {};
  const userNameLookup = {};

  // Helper to extract user ID from various formats (string, ObjectId, or populated object)
  const extractUserId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // Populated user shape: { _id, fullName, role } or { _id: ObjectId, fullName, role }
      if (val._id) return val._id.toString();
      if (val.id) return val.id.toString();
    }
    return String(val);
  };

  // Helper to resolve user ID to name, with fallback to embedded fullName if available
  const resolveUserName = (val) => {
    if (!val) return val;
    // If already a populated object with fullName, use it directly
    if (typeof val === 'object') {
      if (val.fullName) return val.fullName;
      if (val.userId && typeof val.userId === 'object' && val.userId.fullName) return val.userId.fullName;
      // Otherwise extract ID and lookup
      const id = extractUserId(val);
      if (id) return userNameLookup[id] || id;
      return val;
    }
    // String ID: lookup by ID
    return userNameLookup[val] || val;
  };

  // Build the lookup table using creator name from metadata
  if (metadata.createdByName) {
    // Handle both 'createdBy' (meal plan, meal time schedule) and 'authorStaffId' (care note)
    const beforeCreatedById = extractUserId(log.beforeData?.createdBy) || extractUserId(log.beforeData?.authorStaffId);
    const afterCreatedById = extractUserId(log.afterData?.createdBy) || extractUserId(log.afterData?.authorStaffId);
    if (beforeCreatedById) userNameLookup[beforeCreatedById] = metadata.createdByName;
    if (afterCreatedById) userNameLookup[afterCreatedById] = metadata.createdByName;
  }
  // Handle updatedBy (name of last editor, not the creator)
  if (metadata.updatedByName) {
    const updatedById = extractUserId(log.afterData?.updatedBy);
    if (updatedById) userNameLookup[updatedById] = metadata.updatedByName;
  }
  if (metadata.recordedByName) {
    const beforeRecordedById = extractUserId(log.beforeData?.recordedByStaffId);
    const afterRecordedById = extractUserId(log.afterData?.recordedByStaffId);
    if (beforeRecordedById) userNameLookup[beforeRecordedById] = metadata.recordedByName;
    if (afterRecordedById) userNameLookup[afterRecordedById] = metadata.recordedByName;
  }
  // Also use performedBy as fallback for last editor (keyed by updatedBy or creator ID)
  if (log.performedBy) {
    const updatedById = extractUserId(log.afterData?.updatedBy);
    if (updatedById) userNameLookup[updatedById] = log.performedBy;
  }
  // Map deletedById → tên (cho audit log dừng hóa đơn)
  if (log.afterData?.deletedById && log.performedBy) {
    const deletedById = extractUserId(log.afterData.deletedById);
    if (deletedById) userNameLookup[deletedById] = log.performedBy;
  }

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
    // User fields: createdBy (meal plan/schedule), authorStaffId (care note), updatedBy, deletedBy, deletedById
    const isUserField = ['createdBy', 'updatedBy', 'deletedBy', 'deletedById', 'authorStaffId', 'recordedByStaffId'].includes(key);
    const recordedByName = metadata.recordedByName;
    const entriesSummary = Array.isArray(metadata.entriesSummary) ? metadata.entriesSummary.join('; ') : null;
    const bVal = isResidentIds ? resolveIncidentArray(rawBeforeVal, false, key)
      : isStaffIds ? resolveIncidentArray(rawBeforeVal, true, key)
      : key === 'entries' && entriesSummary ? undefined
      : key === 'recordedByStaffId' && recordedByName ? recordedByName
      : (isUserField ? resolveUserName(rawBeforeVal) : rawBeforeVal);
    const aVal = isResidentIds ? resolveIncidentArray(rawAfterVal, false, key)
      : isStaffIds ? resolveIncidentArray(rawAfterVal, true, key)
      : key === 'entries' && entriesSummary ? entriesSummary
      : key === 'recordedByStaffId' && recordedByName ? recordedByName
      : (isUserField ? resolveUserName(rawAfterVal) : rawAfterVal);

    const beforeStr = formatValue(bVal, key, isVi);
    const afterStr = formatValue(aVal, key, isVi);

    // Only show if values are different
    if (beforeStr !== afterStr) {
      changes.push({
        field: getFieldKeyLabel(key, isVi ? 'vi' : 'en'),
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
                  : renderValue(change.before, change.fieldKey, isVi, { before: log.beforeData, after: log.afterData, residentNameLookup })}

              </span>
            </span>
            <span className="al-change-item__arrow">→</span>
            <span className="al-change-value-group">
              <span className="al-change-value-group__label">
                {isVi ? 'Mới' : 'New'}
              </span>
              <span className="al-change-item__after" title={t('admin.auditLogs.kpi.after')}>
                {renderValue(change.after, change.fieldKey, isVi, { before: log.beforeData, after: log.afterData, residentNameLookup })}
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
                          <span className="al-actor__name">{(() => {
                            const raw = log.actorUserId;
                            return log.performedBy
                              || (raw && typeof raw === 'object' ? raw.fullName : raw)
                              || '—';
                          })()}</span>
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
                        {(() => {
                          const raw = selectedLog.actorUserId;
                          return selectedLog.performedBy
                            || (raw && typeof raw === 'object' ? raw.fullName : raw)
                            || '—';
                        })()}
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
