import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Users,
  MessageSquare,
  ChevronLeft,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import residentVisitService from '../../services/residentVisit.service';
import residentService from '../../services/resident.service';

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

export default function SubmitResidentVisitPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(true);

  const [formData, setFormData] = useState({
    residentId: '',
    visitorName: '',
    visitorPhone: '',
    requestedDate: '',
    requestedTimeSlot: TIME_SLOTS[0],
    numberOfVisitors: 1,
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const loadResidents = async () => {
      try {
        const data = await residentService.getFamilyResidentList();
        const list = Array.isArray(data) ? data : [];
        setResidents(list);
        if (list.length === 1) {
          setFormData((prev) => ({ ...prev, residentId: list[0]._id }));
        }
      } catch (err) {
        console.error('Failed to load family residents:', err);
      } finally {
        setLoadingResidents(false);
      }
    };
    loadResidents();
  }, []);

  const validateField = (name, value, currentFormData = formData) => {
    const val = typeof value === 'string' ? value.trim() : (value ?? '');

    switch (name) {
      case 'residentId':
        if (!val) return t('residentVisit.validation.residentRequired');
        return null;

      case 'visitorName':
        if (!val) return t('residentVisit.validation.nameRequired');
        if (val.length < 2 || val.length > 50) return t('residentVisit.validation.nameLength');
        return null;

      case 'visitorPhone':
        if (!val) return t('residentVisit.validation.phoneRequired');
        if (!/^[0-9+\s-]{8,15}$/.test(val)) return t('residentVisit.validation.phoneInvalid');
        return null;

      case 'requestedDate': {
        if (!val) return t('residentVisit.validation.dateRequired');
        const dateObj = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) return t('residentVisit.validation.dateFuture');

        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        if (val === todayStr && currentFormData.requestedTimeSlot) {
          const [startPart] = currentFormData.requestedTimeSlot.split(' - ');
          if (startPart) {
            const [startHour, startMinute] = startPart.split(':').map(Number);
            if (!isNaN(startHour) && !isNaN(startMinute)) {
              const now = new Date();
              const curHour = now.getHours();
              const curMin = now.getMinutes();
              if (curHour > startHour || (curHour === startHour && curMin >= startMinute)) {
                return t('residentVisit.validation.timeSlotPast');
              }
            }
          }
        }
        return null;
      }

      case 'numberOfVisitors': {
        const visitors = parseInt(value, 10);
        if (isNaN(visitors) || visitors < 1 || visitors > 20) {
          return t('residentVisit.validation.visitorsRange');
        }
        return null;
      }

      default:
        return null;
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const setField = (name, value) => {
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);
    const error = validateField(name, value, nextFormData);
    let nextErrors = { ...errors, [name]: error };
    if (name === 'requestedTimeSlot' || name === 'requestedDate') {
      nextErrors.requestedDate = validateField('requestedDate', nextFormData.requestedDate, nextFormData);
    }
    if (touched[name] || touched.requestedDate || name === 'requestedTimeSlot') {
      setErrors(nextErrors);
    }
  };

  const validateForm = () => {
    const fields = ['residentId', 'visitorName', 'visitorPhone', 'requestedDate', 'numberOfVisitors'];
    const formErrors = {};
    let isValid = true;

    fields.forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) {
        formErrors[f] = err;
        isValid = false;
      }
    });

    setErrors(formErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        residentId: formData.residentId,
        visitorName: formData.visitorName.trim(),
        visitorPhone: formData.visitorPhone.trim(),
        requestedDate: formData.requestedDate,
        requestedTimeSlot: formData.requestedTimeSlot,
        numberOfVisitors: parseInt(formData.numberOfVisitors, 10),
        notes: formData.notes.trim() || undefined,
      };

      const res = await residentVisitService.createVisit(payload);
      setSubmittedData(res?.visit || payload);
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('residentVisit.errorFallback');
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="sftp-success">
        <div className="sftp-success__card">
          <div className="sftp-success__icon-box">
            <CheckCircle size={48} className="sftp-success__icon" />
          </div>
          <h2 className="sftp-success__title">{t('residentVisit.successTitle')}</h2>
          <p className="sftp-success__desc">
            {t('residentVisit.successDesc')}
          </p>

          <div className="sftp-success__details">
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">{t('residentVisit.successVisitor')}</span>
              <strong className="sftp-success__detail-value">{submittedData?.visitorName}</strong>
            </div>
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">{t('residentVisit.successPreferredDate')}</span>
              <strong className="sftp-success__detail-value">
                {submittedData?.requestedDate
                  ? new Date(submittedData.requestedDate).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : t('residentVisit.successNotDetermined')}
              </strong>
            </div>
            {submittedData?.requestedTimeSlot && (
              <div className="sftp-success__detail-row">
                <span className="sftp-success__detail-label">{t('residentVisit.successTimeSlot')}</span>
                <strong className="sftp-success__detail-value">{submittedData.requestedTimeSlot}</strong>
              </div>
            )}
            <div className="sftp-success__detail-row">
              <span className="sftp-success__detail-label">{t('residentVisit.successVisitors')}</span>
              <strong className="sftp-success__detail-value">{submittedData?.numberOfVisitors}</strong>
            </div>
          </div>

          <div className="sftp-success__actions">
            <button
              onClick={() => navigate('/family/resident-visits')}
              className="sftp-btn sftp-btn--primary"
            >
              {t('residentVisit.viewHistory')}
            </button>
            <button
              onClick={() => navigate('/family/dashboard')}
              className="sftp-btn sftp-btn--outline"
            >
              {t('residentVisit.backToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="sftp-page" onSubmit={handleSubmit} noValidate>
      {/* ── Header ── */}
      <div className="sftp-header">
        <h1 className="sftp-header__title">{t('residentVisit.title')}</h1>
        <p className="sftp-header__subtitle">
          {t('residentVisit.subtitle')}
        </p>
      </div>

      {/* ── Form Card ── */}
      <div className="sftp-card">
        <div className="sftp-grid">
          {/* Resident Picker */}
          <div className={`sftp-group sftp-group--full ${errors.residentId && touched.residentId ? 'has-error' : ''}`}>
            <label className="sftp-label">{t('residentVisit.labelResident')} <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <User size={16} className="sftp-input-icon" />
              <select
                className="sftp-input sftp-select"
                value={formData.residentId}
                onChange={(e) => setField('residentId', e.target.value)}
                onBlur={() => handleBlur('residentId')}
                disabled={submitting || loadingResidents}
              >
                <option value="">
                  {loadingResidents ? t('residentVisit.loadingResidents') : t('residentVisit.selectResident')}
                </option>
                {residents.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fullName} {r.residentCode ? `(${r.residentCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {errors.residentId && touched.residentId && (
              <span className="sftp-error-text">{errors.residentId}</span>
            )}
          </div>

          {/* Visitor Name */}
          <div className={`sftp-group ${errors.visitorName && touched.visitorName ? 'has-error' : ''}`}>
            <label className="sftp-label">{t('residentVisit.labelVisitorName')} <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <User size={16} className="sftp-input-icon" />
              <input
                type="text"
                className="sftp-input"
                placeholder={t('residentVisit.placeholderName')}
                value={formData.visitorName}
                onChange={(e) => setField('visitorName', e.target.value)}
                onBlur={() => handleBlur('visitorName')}
                disabled={submitting}
              />
            </div>
            {errors.visitorName && touched.visitorName && (
              <span className="sftp-error-text">{errors.visitorName}</span>
            )}
          </div>

          {/* Visitor Phone */}
          <div className={`sftp-group ${errors.visitorPhone && touched.visitorPhone ? 'has-error' : ''}`}>
            <label className="sftp-label">{t('residentVisit.labelPhone')} <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <Phone size={16} className="sftp-input-icon" />
              <input
                type="tel"
                className="sftp-input"
                placeholder={t('residentVisit.placeholderPhone')}
                value={formData.visitorPhone}
                onChange={(e) => setField('visitorPhone', e.target.value)}
                onBlur={() => handleBlur('visitorPhone')}
                disabled={submitting}
              />
            </div>
            {errors.visitorPhone && touched.visitorPhone && (
              <span className="sftp-error-text">{errors.visitorPhone}</span>
            )}
          </div>

          {/* Requested Date */}
          <div className={`sftp-group ${errors.requestedDate && touched.requestedDate ? 'has-error' : ''}`}>
            <label className="sftp-label">
              {t('residentVisit.labelPreferredDate')} *{' '}
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '4px' }}>
                {t('residentVisit.dateHint')}
              </span>
            </label>
            <div className="sftp-input-wrap">
              <Calendar size={16} className="sftp-input-icon" />
              <input
                type="date"
                className="sftp-input"
                value={formData.requestedDate}
                onChange={(e) => setField('requestedDate', e.target.value)}
                onBlur={() => handleBlur('requestedDate')}
                disabled={submitting}
              />
            </div>
            {errors.requestedDate && touched.requestedDate && (
              <span className="sftp-error-text">{errors.requestedDate}</span>
            )}
          </div>

          {/* Requested Time Slot */}
          <div className="sftp-group">
            <label className="sftp-label">{t('residentVisit.labelTimeSlot')}</label>
            <div className="sftp-input-wrap">
              <Clock size={16} className="sftp-input-icon" />
              <select
                className="sftp-input sftp-select"
                value={formData.requestedTimeSlot}
                onChange={(e) => setField('requestedTimeSlot', e.target.value)}
                disabled={submitting}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Number of Visitors */}
          <div className={`sftp-group ${errors.numberOfVisitors && touched.numberOfVisitors ? 'has-error' : ''}`}>
            <label className="sftp-label">{t('residentVisit.labelVisitors')} <span className="sftp-required">*</span></label>
            <div className="sftp-input-wrap">
              <Users size={16} className="sftp-input-icon" />
              <input
                type="number"
                className="sftp-input"
                min="1"
                max="20"
                value={formData.numberOfVisitors}
                onChange={(e) => setField('numberOfVisitors', e.target.value)}
                onBlur={() => handleBlur('numberOfVisitors')}
                disabled={submitting}
              />
            </div>
            {errors.numberOfVisitors && touched.numberOfVisitors && (
              <span className="sftp-error-text">{errors.numberOfVisitors}</span>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="sftp-group sftp-group--full">
          <label className="sftp-label">{t('residentVisit.labelNotes')}</label>
          <div className="sftp-input-wrap sftp-textarea-wrap">
            <MessageSquare size={16} className="sftp-input-icon sftp-textarea-icon" />
            <textarea
              className="sftp-input sftp-textarea"
              placeholder={t('residentVisit.placeholderNotes')}
              rows={4}
              value={formData.notes}
              onChange={(e) => setField('notes', e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="sftp-error-banner">
            <AlertCircle size={16} className="sftp-error-banner__icon" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sftp-footer">
          <button
            type="button"
            className="sftp-btn sftp-btn--outline"
            onClick={() => navigate('/family/dashboard')}
            disabled={submitting}
          >
            <ChevronLeft size={16} />
            {t('residentVisit.back')}
          </button>

          <button
            type="submit"
            className="sftp-btn sftp-btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="sftp-spinner" />
                {t('residentVisit.submitting')}
              </>
            ) : (
              <>
                <Send size={16} />
                {t('residentVisit.submit')}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
