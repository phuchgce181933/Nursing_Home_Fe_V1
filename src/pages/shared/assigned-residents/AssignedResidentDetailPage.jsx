import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import AdminPageShell from '../../../components/admin/AdminPageShell';
import ResidentContextBlock from '../../../components/resident/ResidentContextBlock';
import staffAssignedResidentService from '../../../services/staffAssignedResident.service';
import { resolveApiError } from '../../../utils/apiMessage';
import { formatResidentAreaLine } from '../../../utils/residentArea';
import {
  getAssignedResidentsBasePath,
  getAssignedResidentsI18nNs,
  formatAllergies,
  formatConditions,
  formatAdmittedAt,
} from './assignedResidentHelpers';
import { pickDrugAllergiesList } from '../../../utils/residentArea';
import '../../../styles/shared/AssignedResidentsPage.css';

function ResidentWarning({ resident, t, ns }) {
  if (!resident) return null;
  const drug = pickDrugAllergiesList(resident);
  const food = (resident.allergies || []).filter(Boolean);
  const conditions = resident.chronicConditions || [];
  if (!drug.length && !food.length && !conditions.length) return null;

  return (
    <div className="ar-detail-warning">
      {drug.length > 0 && (
        <p>
          <strong>{t(`${ns}.drugAllergies`)}:</strong> {drug.join(', ')}
        </p>
      )}
      {food.length > 0 && (
        <p>
          <strong>{t(`${ns}.otherAllergies`)}:</strong> {food.join(', ')}
        </p>
      )}
      {conditions.length > 0 && (
        <p>
          <strong>{t(`${ns}.chronicConditions`)}:</strong> {conditions.join(', ')}
        </p>
      )}
    </div>
  );
}

export default function AssignedResidentDetailPage({ role }) {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const ns = getAssignedResidentsI18nNs(role);
  const basePath = getAssignedResidentsBasePath(role);
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const residentData = await staffAssignedResidentService.getResident(role, id);
        if (cancelled) return;
        setResident(residentData);
      } catch (e) {
        if (!cancelled) {
          setError(resolveApiError(e, t, `${ns}.detailLoadFailed`));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, role, t, ns]);

  return (
    <AdminPageShell title={t(`${ns}.detailTitle`)} subtitle={t(`${ns}.detailSubtitle`)}>
      <button type="button" className="ar-detail-back" onClick={() => navigate(basePath)}>
        <ArrowLeft size={16} />
        {t(`${ns}.backToList`)}
      </button>

      {loading && <p className="ar-detail-loading">{t('common.loading')}</p>}
      {error && <div className="resident-page__error">{error}</div>}

      {!loading && resident && (
        <div className="ar-detail-card">
          <ResidentWarning resident={resident} t={t} ns={ns} />
          <ResidentContextBlock resident={resident} showGender showStatus />

          <div className="ar-detail-grid">
            <div className="ar-detail-field">
              <span className="ar-detail-field__label">{t('common.colArea')}</span>
              <span className="ar-detail-field__value">{formatResidentAreaLine(resident, t) || '—'}</span>
            </div>
            <div className="ar-detail-field">
              <span className="ar-detail-field__label">{t(`${ns}.admittedAt`)}</span>
              <span className="ar-detail-field__value">{formatAdmittedAt(resident.admittedAt, locale)}</span>
            </div>
            {resident.bloodType && resident.bloodType !== 'unknown' && (
              <div className="ar-detail-field">
                <span className="ar-detail-field__label">{t(`${ns}.bloodType`)}</span>
                <span className="ar-detail-field__value">{resident.bloodType}</span>
              </div>
            )}
          </div>

          <div className="ar-detail-section">
            <span className="ar-detail-field__label">{t('common.colAllergies')}</span>
            <p className="ar-detail-text">{formatAllergies(resident, t, ns)}</p>
          </div>

          <div className="ar-detail-section">
            <span className="ar-detail-field__label">{t('common.colConditions')}</span>
            <p className="ar-detail-text">{formatConditions(resident)}</p>
          </div>

          {resident.initialHealthCondition && (
            <div className="ar-detail-section">
              <span className="ar-detail-field__label">{t(`${ns}.initialHealth`)}</span>
              <p className="ar-detail-text">{resident.initialHealthCondition}</p>
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
