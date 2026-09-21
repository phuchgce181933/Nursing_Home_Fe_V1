import { useTranslation } from 'react-i18next';
import { formatResidentArea, hasAssignedArea } from '../../utils/residentArea';
import { getGenderLabel, getResidencyLabel } from '../../pages/admin/residents/_shared/residentLabels';
import '../../styles/components/ResidentContextBlock.css';

function mergeResident(resident, summary) {
  if (resident && summary) {
    return {
      ...summary,
      ...resident,
      room: resident.room ?? summary.room,
      floor: resident.floor ?? summary.floor,
      building: resident.building ?? summary.building,
      bed: resident.bed ?? summary.bed,
    };
  }
  return resident || summary || null;
}

export default function ResidentContextBlock({
  resident,
  summary,
  showGender = false,
  showStatus = false,
}) {
  const { t } = useTranslation();
  const r = mergeResident(resident, summary);
  if (!r) return null;

  const area = formatResidentArea(r, t);
  const assigned = hasAssignedArea(r);

  const identityParts = [
    r.fullName,
    r.residentCode ? `${t('admin.residents.common.colCode')} ${r.residentCode}` : null,
    r.age != null ? t('admin.residents.common.yearsOldWithAge', { age: r.age }) : null,
    showGender && r.gender ? getGenderLabel(t, r.gender) : null,
  ].filter(Boolean);

  return (
    <div className="resident-context">
      <p className="resident-context__identity">{identityParts.join(' · ')}</p>
      {showStatus && r.residencyStatus && (
        <p className="resident-context__status-row">
          <span
            className={`residency-badge residency-badge--${r.residencyStatus || 'default'}`}
          >
            {getResidencyLabel(t, r.residencyStatus)}
          </span>
        </p>
      )}
      <div className="resident-context__section">{t('admin.residents.common.areaSection')}</div>
      {!assigned ? (
        <p className="resident-context__unassigned">{t('admin.residents.common.unassignedRoom')}</p>
      ) : (
        <>
          <div className="resident-context__row">
            <strong>{t('admin.residents.common.building')}:</strong> {area.building || '—'}
          </div>
          <div className="resident-context__row">
            <strong>{t('admin.residents.common.floor')}:</strong> {area.floor || '—'}
          </div>
          <div className="resident-context__row">
            <strong>{t('admin.residents.common.room')}:</strong> {area.room || '—'}
          </div>
          {area.bed && (
            <div className="resident-context__row">
              <strong>{t('admin.residents.common.bed')}:</strong> {area.bed}
            </div>
          )}
        </>
      )}
    </div>
  );
}
