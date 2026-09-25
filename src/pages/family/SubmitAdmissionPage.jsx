import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Stethoscope,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Send,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import admissionService from '../../services/admission.service';
import Step1 from '../../components/family/SubmitAdmission/Step1';
import Step2 from '../../components/family/SubmitAdmission/Step2';
import Step3 from '../../components/family/SubmitAdmission/Step3';
import SuccessScreen from '../../components/family/SubmitAdmission/SuccessScreen';
import LockoutScreen from '../../components/family/SubmitAdmission/LockoutScreen';
import Stepper, { Step } from '../../components/ui/Stepper/Stepper';

/* ─── constants ─────────────────────────────── */
// Maps known backend validation error substrings to the form field + step that should show the error,
// since the API returns plain messages rather than a field-keyed error object.
const BACKEND_FIELD_ERROR_MAP = [
  { test: /requestedByPhone/i, field: 'contactPhone', step: 3 },
  { test: /reasonForAdmission/i, field: 'admissionReason', step: 3 },
  { test: /preferredAdmissionDate/i, field: 'preferredDate', step: 3 },
  { test: /citizenId/i, field: 'idNumber', step: 1 },
  { test: /initialHealthCondition/i, field: 'healthCondition', step: 2 },
  { test: /^notes/i, field: 'additionalNotes', step: 3 },
];

const CITIZEN_ID_DUPLICATE_MESSAGE = 'submitAdmission.validation.citizenIdDuplicate';

const STEP_KEYS = [
  { i18nKey: 'submitAdmission.steps.personalInfo', Icon: User },
  { i18nKey: 'submitAdmission.steps.healthRecord',   Icon: Stethoscope },
  { i18nKey: 'submitAdmission.steps.admissionDetails', Icon: ClipboardCheck },
];

/* ─── main page ─────────────────────────────── */
export default function SubmitAdmissionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [admissions, setAdmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  // Real-time citizenId duplicate checking state
  const [checkingCitizenId, setCheckingCitizenId] = useState(false);
  const citizenIdCheckTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await admissionService.getAdmissionHistory({ limit: 100 });
        if (isMounted) {
          const list = res?.data || [];
          setAdmissions(list);
        }
      } catch (err) {
        console.error('Failed to load admission requests history:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const checkDuplicateRequest = (fullName, idNumber) => {
    if (!fullName || !idNumber) return null;
    const nameClean = fullName.trim().toLowerCase();
    const idClean = idNumber.trim();

    return admissions.find((a) => {
      const matchName = a.applicant?.fullName?.trim().toLowerCase() === nameClean;
      const matchId = a.applicant?.citizenId?.trim() === idClean;
      const isActive = ['new_request', 'consulting', 'assessing', 'contracting'].includes(a.status);
      return matchName && matchId && isActive;
    });
  };

  // Real-time check for duplicate citizenId against backend (residents + active admissions)
  const checkCitizenIdRealTime = useCallback(async (citizenId) => {
    const cleanId = citizenId?.trim() || '';

    // Clear previous timer
    if (citizenIdCheckTimerRef.current) {
      clearTimeout(citizenIdCheckTimerRef.current);
    }

    // Clear error if empty
    if (!cleanId) {
      setErrors((prev) => {
        if (prev.idNumber === t(CITIZEN_ID_DUPLICATE_MESSAGE)) {
          return { ...prev, idNumber: null };
        }
        return prev;
      });
      return;
    }

    // Only check if it passes basic format validation
    const isCccd = /^\d{12}$/.test(cleanId);
    const isPassport = /^[A-Z0-9]{8,12}$/i.test(cleanId);
    if (!isCccd && !isPassport) {
      return; // Let format validation handle it
    }

    // Debounce the API call (500ms delay)
    citizenIdCheckTimerRef.current = setTimeout(async () => {
      setCheckingCitizenId(true);
      try {
        const result = await admissionService.checkCitizenIdDuplicate(cleanId);
        if (result?.duplicate) {
          setErrors((prev) => ({ ...prev, idNumber: t(CITIZEN_ID_DUPLICATE_MESSAGE) }));
          setTouched((prev) => ({ ...prev, idNumber: true }));
        } else {
          // Only clear if it was the duplicate error
          setErrors((prev) => {
            if (prev.idNumber === t(CITIZEN_ID_DUPLICATE_MESSAGE)) {
              return { ...prev, idNumber: null };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to check citizenId duplicate:', err);
      } finally {
        setCheckingCitizenId(false);
      }
    }, 500);
  }, [t]);

  // Listen for idNumber changes to trigger real-time check
  useEffect(() => {
    // When idNumber changes and field has been touched, trigger real-time check
    if (touched.idNumber) {
      checkCitizenIdRealTime(formData.idNumber);
    }
    return () => {
      if (citizenIdCheckTimerRef.current) {
        clearTimeout(citizenIdCheckTimerRef.current);
      }
    };
  }, [formData.idNumber, touched.idNumber, checkCitizenIdRealTime]);

  const validateField = (name, value) => {
    const val = typeof value === 'string' ? value.trim() : (value ?? '');

    switch (name) {
      case 'fullName':
        if (!val) return t('submitAdmission.validation.fullNameRequired');
        if (val.length < 2 || val.length > 50) return t('submitAdmission.validation.fullNameLength');
        if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưẠ-ỹ\s]+$/.test(val))
          return t('submitAdmission.validation.fullNameLettersOnly');
        return null;

      case 'dob': {
        if (val === 'INVALID_DATE') {
          return t('submitAdmission.validation.dobInvalidFormat');
        }
        if (!val) {
          return t('submitAdmission.validation.dobRequired');
        }
        const dobDate = new Date(val);
        if (isNaN(dobDate.getTime())) {
          return t('submitAdmission.validation.dobInvalid');
        }
        if (dobDate >= new Date()) {
          return t('submitAdmission.validation.dobPast');
        }
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        if (age < 50 || age > 110) {
          return t('submitAdmission.validation.dobAge');
        }
        return null;
      }

      case 'gender':
        if (!val) return t('submitAdmission.validation.genderRequired');
        return null;

      case 'idNumber':
        if (!val) return t('submitAdmission.validation.idRequired');
        const isCccd = /^\d{12}$/.test(val);
        const isPassport = /^[A-Z0-9]{8,12}$/i.test(val);
        if (!isCccd && !isPassport)
          return t('submitAdmission.validation.idInvalid');
        return null;

      case 'address':
        if (!val) return t('submitAdmission.validation.addressRequired');
        if (val.length < 5 || val.length > 150) return t('submitAdmission.validation.addressLength');
        return null;

      case 'relationship':
        if (!val) return t('submitAdmission.validation.relationshipRequired');
        return null;

      case 'phone':
        if (val) {
          if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(val)) {
            return t('submitAdmission.validation.phoneInvalid');
          }
        }
        return null;

      case 'healthCondition':
        if (!val) return t('submitAdmission.validation.healthRequired');
        if (val.length < 10 || val.length > 500) return t('submitAdmission.validation.healthLength');
        return null;

      case 'preferredDate':
        if (!val) return t('submitAdmission.validation.preferredDateRequired');
        const prefDate = new Date(val);
        if (isNaN(prefDate.getTime())) return t('submitAdmission.validation.dateInvalid');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (prefDate < today) return t('submitAdmission.validation.preferredDateFuture');
        return null;

      case 'contactPhone':
        if (!val) return t('submitAdmission.validation.contactPhoneRequired');
        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(val))
          return t('submitAdmission.validation.contactPhoneInvalid');
        return null;

      case 'admissionReason':
        if (!val) return t('submitAdmission.validation.admissionReasonRequired');
        return null;

      case 'additionalNotes':
        if (val && val.length > 500) return t('submitAdmission.validation.additionalNotesMax');
        return null;

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
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const validateStep = (stepNum) => {
    let stepFields = [];
    if (stepNum === 1) {
      stepFields = ['fullName', 'dob', 'gender', 'idNumber', 'address', 'relationship'];
    } else if (stepNum === 2) {
      stepFields = ['healthCondition'];
    } else if (stepNum === 3) {
      stepFields = ['preferredDate', 'contactPhone', 'admissionReason', 'additionalNotes'];
    }

    const stepErrors = {};
    let isValid = true;

    stepFields.forEach((name) => {
      const err = validateField(name, formData[name]);
      if (err) {
        stepErrors[name] = err;
        isValid = false;
      }
    });

    setErrors((prev) => {
      const nextErrors = { ...prev };
      stepFields.forEach((f) => delete nextErrors[f]);
      return { ...nextErrors, ...stepErrors };
    });

    setTouched((prev) => {
      const nextTouched = { ...prev };
      stepFields.forEach((f) => {
        nextTouched[f] = true;
      });
      return nextTouched;
    });

    if (!isValid) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.has-error');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorEl.focus?.();
        }
      }, 50);
    }

    return isValid;
  };

  const handleBeforeStepChange = async (from, to) => {
    if (to > from) {
      // Check for duplicate citizenId before allowing to proceed
      if (from === 1 && formData.idNumber?.trim()) {
        const cleanId = formData.idNumber.trim();
        const isCccd = /^\d{12}$/.test(cleanId);
        const isPassport = /^[A-Z0-9]{8,12}$/i.test(cleanId);
        if (isCccd || isPassport) {
          try {
            const result = await admissionService.checkCitizenIdDuplicate(cleanId);
            if (result?.duplicate) {
              setErrors((prev) => ({ ...prev, idNumber: t(CITIZEN_ID_DUPLICATE_MESSAGE) }));
              setTouched((prev) => ({ ...prev, idNumber: true }));
              return false;
            }
          } catch (err) {
            console.error('Failed to check citizenId duplicate:', err);
          }
        }
      }
      return validateStep(from);
    }
    return true;
  };

  const handleStepChange = (newStep) => {
    setStep(newStep);
  };

  const handleNext = async () => {
    // Check for duplicate citizenId before proceeding
    if (step === 1 && formData.idNumber?.trim()) {
      const cleanId = formData.idNumber.trim();
      const isCccd = /^\d{12}$/.test(cleanId);
      const isPassport = /^[A-Z0-9]{8,12}$/i.test(cleanId);
      if (isCccd || isPassport) {
        try {
          const result = await admissionService.checkCitizenIdDuplicate(cleanId);
          if (result?.duplicate) {
            setErrors((prev) => ({ ...prev, idNumber: t(CITIZEN_ID_DUPLICATE_MESSAGE) }));
            setTouched((prev) => ({ ...prev, idNumber: true }));
            return; // Don't proceed
          }
        } catch (err) {
          console.error('Failed to check citizenId duplicate:', err);
        }
      }
    }

    if (validateStep(step)) {
      if (step < STEP_KEYS.length) setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (step < STEP_KEYS.length) {
      handleNext();
      return;
    }

    setSubmitError(null);

    let firstErrorStep = null;
    if (!validateStep(1)) {
      firstErrorStep = 1;
    } else if (!validateStep(2)) {
      firstErrorStep = 2;
    } else if (!validateStep(3)) {
      firstErrorStep = 3;
    }

    if (firstErrorStep !== null) {
      setStep(firstErrorStep);
      return;
    }

    const dup = checkDuplicateRequest(formData.fullName, formData.idNumber);
    if (dup) {
      setActiveRequest(dup);
      setDuplicateDetected(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        applicant: {
          fullName:                formData.fullName || '',
          dateOfBirth:             formData.dob || undefined,
          gender:                  formData.gender || 'unknown',
          citizenId:               formData.idNumber || undefined,
          bloodType:               formData.bloodType || 'unknown',
          personalAddress:         formData.address || undefined,
          relationshipToRequester: formData.relationship || '',
          allergies:               formData.allergies || [],
          chronicConditions:       formData.chronicConditions || [],
          initialHealthCondition:  formData.healthCondition || undefined,
          phone:                   formData.phone || undefined,
          avatarUrl:               formData.avatarUrl || undefined,
        },
        preferredAdmissionDate: formData.preferredDate || undefined,
        reasonForAdmission:     formData.admissionReason || undefined,
        requestedByPhone:       formData.contactPhone || undefined,
        notes:                  formData.additionalNotes || undefined,
      };

      const res = await admissionService.submitAdmissionRequest(payload);
      setSubmittedData(res?.admission || payload);
      setSubmitted(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t('submitAdmission.errorFallback');

      if (err?.response?.status === 409 || msg.toLowerCase().includes('already have a pending') || msg.toLowerCase().includes('trùng')) {
        const dup = checkDuplicateRequest(formData.fullName, formData.idNumber);
        if (dup) {
          setActiveRequest(dup);
        } else {
          setActiveRequest({
            createdAt: new Date(),
            applicant: { fullName: formData.fullName, citizenId: formData.idNumber }
          });
        }
        setDuplicateDetected(true);
      } else {
        const matched = BACKEND_FIELD_ERROR_MAP.find(({ test }) => test.test(msg));
        if (matched) {
          setErrors((prev) => ({ ...prev, [matched.field]: msg }));
          setTouched((prev) => ({ ...prev, [matched.field]: true }));
          setStep(matched.step);
        }
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (duplicateDetected) {
    return (
      <LockoutScreen
        activeRequest={activeRequest}
        setDuplicateDetected={setDuplicateDetected}
        setStep={setStep}
        setFormData={setFormData}
        setErrors={setErrors}
        admissions={admissions}
        navigate={navigate}
      />
    );
  }

  if (submitted) {
    return (
      <SuccessScreen
        submittedData={submittedData}
        formData={formData}
        navigate={navigate}
      />
    );
  }

  const renderStepIndicator = ({ step: stepNum, currentStep: current, onStepClick }) => {
    const stepInfo = STEP_KEYS[stepNum - 1];
    if (!stepInfo) return null;
    const { Icon } = stepInfo;
    const status = current === stepNum ? 'active' : current > stepNum ? 'complete' : 'inactive';

    return (
      <div
        className="sap-stepper-indicator-wrap"
        onClick={() => {
          if (stepNum < current) onStepClick(stepNum);
        }}
        style={{ cursor: stepNum < current ? 'pointer' : 'default' }}
      >
        <div className={`sap-stepper-indicator-circle sap-stepper-indicator-circle--${status}`}>
          {status === 'complete' ? (
            <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" width={16} height={16}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <Icon size={16} />
          )}
        </div>
        <span className={`sap-stepper-indicator-label sap-stepper-indicator-label--${status}`}>
          {t(stepInfo.i18nKey)}
        </span>
      </div>
    );
  };

  return (
    <form className="sap-page" onSubmit={handleSubmit} noValidate>
      <div className="sap-page__header">
        <h1 className="sap-page__title">{t('submitAdmission.title')}</h1>
        <p className="sap-page__subtitle">
          {t('submitAdmission.subtitle')}
        </p>
      </div>

      <div className="sap-card">
        <Stepper
          currentStep={step}
          onStepChange={handleStepChange}
          onBeforeStepChange={handleBeforeStepChange}
          hideFooter
          disableStepIndicators
          renderStepIndicator={renderStepIndicator}
          stepCircleContainerClassName="sap-stepper-container"
          stepContainerClassName="sap-stepper-row"
          contentClassName="sap-stepper-content"
        >
          <Step>
            <Step1 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} checkingCitizenId={checkingCitizenId} />
          </Step>
          <Step>
            <Step2 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />
          </Step>
          <Step>
            <Step3 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />
          </Step>
        </Stepper>

        {submitError && (
          <div className="sap-error-banner">
            <AlertCircle size={16} className="sap-error-banner__icon" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="sap-footer">
          <button
            key="btn-back"
            type="button"
            className="sap-btn sap-btn--outline"
            onClick={handlePrev}
            disabled={submitting}
          >
            <ChevronLeft size={16} />
            {t('submitAdmission.back')}
          </button>

          {step < STEP_KEYS.length ? (
            <button key="btn-next" type="button" className="sap-btn sap-btn--primary" onClick={handleNext}>
              {t('submitAdmission.next')}
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              key="btn-submit"
              type="submit"
              className="sap-btn sap-btn--primary sap-btn--submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="sap-spinner" />
                  {t('submitAdmission.submitting')}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t('submitAdmission.submit')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="sap-help-row">
        <div className="sap-help-card">
          <div className="sap-help-card__icon-wrap">
            <Phone size={20} />
          </div>
          <div>
            <h4 className="sap-help-card__title">{t('submitAdmission.helpTitle')}</h4>
            <p className="sap-help-card__desc">
              {t('submitAdmission.helpCall')} <strong>1900 1234</strong> {t('submitAdmission.helpCallSuffix')}
            </p>
          </div>
        </div>
        <div className="sap-help-card">
          <div className="sap-help-card__icon-wrap">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h4 className="sap-help-card__title">{t('submitAdmission.docsTitle')}</h4>
            <p className="sap-help-card__desc">
              {t('submitAdmission.docsDesc')}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
