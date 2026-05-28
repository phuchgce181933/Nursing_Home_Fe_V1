import { formatResidentArea, hasAssignedArea } from '../../utils/residentArea';
import '../../styles/components/ResidentContextBlock.css';

const GENDER_LABELS = { male: 'Nam', female: 'Nữ', other: 'Khác', unknown: 'Không rõ' };

const RESIDENCY_LABELS = {
  pending: 'Chờ nhập viện',
  admitted: 'Đang điều trị',
  discharged: 'Đã xuất viện',
  transferred: 'Chuyển viện',
  deceased: 'Đã qua đời',
};

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
  const r = mergeResident(resident, summary);
  if (!r) return null;

  const area = formatResidentArea(r);
  const assigned = hasAssignedArea(r);

  const identityParts = [
    r.fullName,
    r.residentCode ? `Mã ${r.residentCode}` : null,
    r.age != null ? `${r.age} tuổi` : null,
    showGender && r.gender ? GENDER_LABELS[r.gender] || r.gender : null,
  ].filter(Boolean);

  return (
    <div className="resident-context">
      <p className="resident-context__identity">{identityParts.join(' · ')}</p>
      {showStatus && r.residencyStatus && (
        <p className="resident-context__status-row">
          <span
            className={`residency-badge residency-badge--${r.residencyStatus || 'default'}`}
          >
            {RESIDENCY_LABELS[r.residencyStatus] || r.residencyStatus}
          </span>
        </p>
      )}
      <div className="resident-context__section">Vị trí</div>
      {!assigned ? (
        <p className="resident-context__unassigned">Chưa xếp phòng</p>
      ) : (
        <>
          <div className="resident-context__row">
            <strong>Tòa:</strong> {area.building || '—'}
          </div>
          <div className="resident-context__row">
            <strong>Tầng:</strong> {area.floor || '—'}
          </div>
          <div className="resident-context__row">
            <strong>Phòng:</strong> {area.room || '—'}
          </div>
          {area.bed && (
            <div className="resident-context__row">
              <strong>Giường:</strong> {area.bed}
            </div>
          )}
        </>
      )}
    </div>
  );
}
