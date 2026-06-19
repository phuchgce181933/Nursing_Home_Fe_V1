import { useTranslation } from 'react-i18next';
import { hygieneActivityLabel } from '../../../../utils/hygieneLabels';

function HygieneContextBanner({ context }) {
  const { t } = useTranslation();
  const ns = 'caregiver.hygiene.contextBanner';

  if (!context) return null;

  const activity = hygieneActivityLabel(context.activityType, t);

  if (context.hasExistingRecord) {
    return (
      <p className="hygiene-page__context hygiene-page__context--warn">
        {t(`${ns}.duplicate`, { activity })}
      </p>
    );
  }

  return (
    <p className="hygiene-page__context">
      {t(`${ns}.recording`, { activity })}
    </p>
  );
}

export default HygieneContextBanner;
