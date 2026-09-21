import { useCallback, useEffect, useState } from 'react';
import nutritionCoverageService from '../../../services/nutritionCoverage.service';

export function useNutritionCoverage(workDate, residents) {
  const [coverageByResident, setCoverageByResident] = useState({});

  const loadCoverage = useCallback(async () => {
    if (!workDate || !residents?.length) {
      setCoverageByResident({});
      return;
    }
    try {
      const res = await nutritionCoverageService.getCoverage({
        workDate,
        residentIds: residents.map((r) => String(r._id)).join(','),
      });
      setCoverageByResident(res?.byResident || {});
    } catch {
      setCoverageByResident({});
    }
  }, [workDate, residents]);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  return coverageByResident;
}

export function getResidentCoverage(coverageByResident, residentId, key) {
  return coverageByResident?.[String(residentId)]?.[key] || { published: false };
}

export function ResidentCoverageBadge({ info, label, publisherLabel }) {
  if (!info?.published) return null;
  return (
    <span className="mp-resident-badge" title={publisherLabel || undefined}>
      {label}
    </span>
  );
}

export function SelectedCoverageBanner({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mp-coverage-banner">
      {items.map((item) => (
        <p key={item.key}>{item.text}</p>
      ))}
    </div>
  );
}
