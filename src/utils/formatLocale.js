import i18n from 'i18next';

const getLocale = () => (i18n.language === 'en' ? 'en-US' : 'vi-VN');
const TZ = 'Asia/Ho_Chi_Minh';

export const formatDisplayDate = (value, opts = {}) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(getLocale(), { timeZone: TZ, ...opts });
};

export const formatDisplayDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(getLocale(), {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatDisplayTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(getLocale(), {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export const formatCurrencyLocale = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumberLocale = (num) => {
  if (num == null) return '0';
  return Number(num).toLocaleString(getLocale());
};

export const timeAgoLocale = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const isVi = i18n.language !== 'en';
  if (mins < 1) return isVi ? 'Vừa xong' : 'Just now';
  if (mins < 60) return isVi ? `${mins} phút trước` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isVi ? `${hours} giờ trước` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isVi ? `${days} ngày trước` : `${days}d ago`;
};
