function LoadingSpinner({ label = 'Đang tải...' }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      <span className="loading-spinner__label">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
