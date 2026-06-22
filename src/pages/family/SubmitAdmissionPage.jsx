import { useState, useEffect } from 'react';
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
const STEP_LABELS = [
  { label: 'Thông tin cá nhân', Icon: User },
  { label: 'Hồ sơ sức khỏe',   Icon: Stethoscope },
  { label: 'Chi tiết tiếp nhận', Icon: ClipboardCheck },
];

/* ─── main page ─────────────────────────────── */
export default function SubmitAdmissionPage() {
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

  const validateField = (name, value) => {
    const val = typeof value === 'string' ? value.trim() : (value ?? '');

    switch (name) {
      case 'fullName':
        if (!val) return 'Họ và tên là bắt buộc';
        if (val.length < 2 || val.length > 50) return 'Họ và tên phải từ 2 đến 50 ký tự';
        if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưẠ-ỹ\s]+$/.test(val))
          return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        return null;

      case 'dob':
        if (!val) return 'Ngày sinh là bắt buộc';
        const dobDate = new Date(val);
        if (isNaN(dobDate.getTime())) return 'Ngày sinh không hợp lệ';
        if (dobDate >= new Date()) return 'Ngày sinh phải ở trong quá khứ';
        return null;

      case 'gender':
        if (!val) return 'Giới tính là bắt buộc';
        return null;

      case 'idNumber':
        if (!val) return 'Số định danh (CCCD/Hộ chiếu) là bắt buộc';
        const isCccd = /^\d{12}$/.test(val);
        const isPassport = /^[A-Z0-9]{8,12}$/i.test(val);
        if (!isCccd && !isPassport)
          return 'Số định danh không hợp lệ. Phải là 12 chữ số CCCD hoặc 8-12 ký tự Hộ chiếu.';
        return null;

      case 'address':
        if (!val) return 'Địa chỉ hiện tại là bắt buộc';
        if (val.length < 5 || val.length > 150) return 'Địa chỉ phải từ 5 đến 150 ký tự';
        return null;

      case 'relationship':
        if (!val) return 'Mối quan hệ là bắt buộc';
        return null;

      case 'healthCondition':
        if (!val) return 'Tóm tắt sức khỏe hiện tại là bắt buộc';
        if (val.length < 10 || val.length > 500) return 'Tóm tắt sức khỏe phải từ 10 đến 500 ký tự';
        return null;

      case 'preferredDate':
        if (!val) return 'Ngày nhập viện mong muốn là bắt buộc';
        const prefDate = new Date(val);
        if (isNaN(prefDate.getTime())) return 'Ngày không hợp lệ';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (prefDate < today) return 'Ngày mong muốn phải là ngày hôm nay hoặc trong tương lai';
        return null;

      case 'contactPhone':
        if (!val) return 'Số điện thoại liên hệ là bắt buộc';
        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(val))
          return 'Số điện thoại không hợp lệ (di động 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
        return null;

      case 'admissionReason':
        if (!val) return 'Lý do nhập viện là bắt buộc';
        return null;

      case 'additionalNotes':
        if (val && val.length > 500) return 'Ghi chú thêm không được vượt quá 500 ký tự';
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

  const handleBeforeStepChange = (from, to) => {
    if (to > from) {
      return validateStep(from);
    }
    return true;
  };

  const handleStepChange = (newStep) => {
    setStep(newStep);
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < STEP_LABELS.length) setStep(step + 1);
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

    if (step < STEP_LABELS.length) {
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
        'Đã xảy ra lỗi. Vui lòng thử lại.';

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
    const stepInfo = STEP_LABELS[stepNum - 1];
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
          {stepInfo.label}
        </span>
      </div>
    );
  };

  return (
    <form className="sap-page" onSubmit={handleSubmit} noValidate>
      <div className="sap-page__header">
        <h1 className="sap-page__title">Đăng ký tiếp nhận cư dân</h1>
        <p className="sap-page__subtitle">
          Vui lòng hoàn thành các bước bên dưới để chúng tôi hỗ trợ người thân của bạn tốt nhất.
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
            <Step1 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />
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
            Quay lại
          </button>

          {step < STEP_LABELS.length ? (
            <button key="btn-next" type="button" className="sap-btn sap-btn--primary" onClick={handleNext}>
              Tiếp tục
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
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Gửi yêu cầu tiếp nhận
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
            <h4 className="sap-help-card__title">Cần hỗ trợ?</h4>
            <p className="sap-help-card__desc">
              Gọi <strong>1900 1234</strong> để được hướng dẫn trực tiếp 24/7 về thủ tục tiếp nhận.
            </p>
          </div>
        </div>
        <div className="sap-help-card">
          <div className="sap-help-card__icon-wrap">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h4 className="sap-help-card__title">Hồ sơ chuẩn bị</h4>
            <p className="sap-help-card__desc">
              Vui lòng chuẩn bị CCCD/Hộ chiếu gốc của cư dân và tóm tắt lịch sử y tế.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
