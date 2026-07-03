export function resolveApiError(err, t, fallbackKey) {
  const data = err?.response?.data;
  const fallback = fallbackKey ? t(fallbackKey) : (data?.message || '');
  if (!data) return fallback;
  const key = `apiErrors.${data.errorCode}`;
  const translated = t(key, data.params || {});
  if (translated && translated !== key) return translated;
  return data.message || fallback;
}

export function resolveApiSuccess(data, t, fallbackKey) {
  const fallback = fallbackKey ? t(fallbackKey) : (data?.message || '');
  const key = `apiSuccess.${data.messageKey}`;
  const translated = t(key, data.params || {});
  if (translated && translated !== key) return translated;
  return data.message || fallback;
}
