import { hygieneActivityLabel } from '../../../../utils/hygieneLabels';

function HygieneContextBanner({ context }) {
  if (!context) return null;

  if (context.hasExistingRecord) {
    return (
      <p className="hygiene-page__context hygiene-page__context--warn">
        Đã có ghi nhận cho <strong>{hygieneActivityLabel(context.activityType)}</strong> trong ngày
        này. Vui lòng đóng và chọn <strong>Sửa</strong> từ danh sách.
      </p>
    );
  }

  return (
    <p className="hygiene-page__context">
      Ghi nhận hoạt động: <strong>{hygieneActivityLabel(context.activityType)}</strong>
    </p>
  );
}

export default HygieneContextBanner;
