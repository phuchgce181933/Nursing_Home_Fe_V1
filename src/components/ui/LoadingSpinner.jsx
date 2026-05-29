import { useTranslation } from 'react-i18next';

function LoadingSpinner({ label }) {
  const { t } = useTranslation();

  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      <span className="loading-spinner__label">{label || t('common.loading')}</span>
    </div>
  );
}

export default LoadingSpinner;
