import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ListPagination({
  page,
  totalPages,
  onPageChange,
  total,
  hideWhenSinglePage = false,
}) {
  const { t } = useTranslation();

  if (hideWhenSinglePage && totalPages <= 1) {
    return null;
  }

  if (totalPages <= 1 && total === 0) {
    return null;
  }

  const handlePrev = () => onPageChange(Math.max(1, page - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className="resident-page__pagination">
      <button
        type="button"
        className="resident-page__page-btn"
        onClick={handlePrev}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} />
        {t('common.prev')}
      </button>
      <span>
        {t('common.pageOf', { page, totalPages })}
        {total != null && total > 0 ? ` · ${t('common.itemCount', { count: total })}` : ''}
      </span>
      <button
        type="button"
        className="resident-page__page-btn"
        onClick={handleNext}
        disabled={page >= totalPages}
      >
        {t('common.next')}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
