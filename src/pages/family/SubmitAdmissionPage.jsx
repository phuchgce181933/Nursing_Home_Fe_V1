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
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import admissionService from '../../services/admission.service';
import Step1 from '../../components/family/SubmitAdmission/Step1';
import Step2 from '../../components/family/SubmitAdmission/Step2';
import Step3 from '../../components/family/SubmitAdmission/Step3';
import SuccessScreen from '../../components/family/SubmitAdmission/SuccessScreen';
import LockoutScreen from '../../components/family/SubmitAdmission/LockoutScreen';

/* ─── constants ─────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Thông tin cá nhân', Icon: User },
  { id: 2, label: 'Hồ sơ sức khỏe',   Icon: Stethoscope },
  { id: 3, label: 'Yêu cầu nhập viện', Icon: ClipboardCheck },
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

  // States mới cho việc quản lý trùng lặp và API
  const [admissions, setAdmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  // Tải lịch sử khi mount
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await admissionService.getAdmissionHistory({ limit: 100 });
        if (isMounted) {
          const list = res?.data || [];
          setAdmissions(list);
          // KHÔNG tự động set duplicateDetected = true khi mount để tránh ẩn biểu mẫu đăng ký mới của gia đình
        }
      } catch (err) {
        console.error('Không thể tải lịch sử yêu cầu nhập viện:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hàm kiểm tra trùng Họ tên và CCCD/Số hộ chiếu của bệnh nhân
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
      // Step 1
      case 'fullName':
        if (!val) {
          return 'Họ và tên là bắt buộc / Full Name is required';
        }
        if (val.length < 2 || val.length > 50) {
          return 'Họ và tên phải từ 2 đến 50 ký tự / Full Name must be between 2 and 50 characters';
        }
        if (!/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơưẠ-ỹ\s]+$/.test(val)) {
          return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng / Full Name must contain only letters and spaces';
        }
        return null;

      case 'dob':
        if (!val) {
          return 'Ngày sinh là bắt buộc / Date of Birth is required';
        }
        const dobDate = new Date(val);
        if (isNaN(dobDate.getTime())) {
          return 'Ngày sinh không hợp lệ / Invalid Date of Birth';
        }
        if (dobDate >= new Date()) {
          return 'Ngày sinh phải ở quá khứ / Date of Birth must be in the past';
        }
        return null;

      case 'gender':
        if (!val) {
          return 'Giới tính là bắt buộc / Gender is required';
        }
        return null;

      case 'idNumber':
        if (!val) {
          return 'Số định danh là bắt buộc / ID Number is required';
        }
        const isCccd = /^\d{12}$/.test(val);
        const isPassport = /^[A-Z0-9]{8,12}$/i.test(val);
        if (!isCccd && !isPassport) {
          return 'Số định danh không hợp lệ. Phải là CCCD (12 số) hoặc Hộ chiếu (8-12 chữ và số) / ID Number must be exactly 12 digits (CCCD) or Passport (8-12 alphanumeric characters)';
        }
        return null;

      case 'address':
        if (!val) {
          return 'Địa chỉ hiện tại là bắt buộc / Current Address is required';
        }
        if (val.length < 5 || val.length > 150) {
          return 'Địa chỉ phải từ 5 đến 150 ký tự / Address must be between 5 and 150 characters';
        }
        return null;

      case 'relationship':
        if (!val) {
          return 'Mối quan hệ là bắt buộc / Relationship is required';
        }
        return null;

      // Step 2
      case 'healthCondition':
        if (!val) {
          return 'Tình trạng sức khỏe hiện tại là bắt buộc / Initial Health Condition is required';
        }
        if (val.length < 10 || val.length > 500) {
          return 'Tình trạng sức khỏe phải từ 10 đến 500 ký tự / Initial Health Condition must be between 10 and 500 characters';
        }
        return null;

      // Step 3
      case 'preferredDate':
        if (!val) {
          return 'Ngày dự kiến nhập viện là bắt buộc / Preferred Date is required';
        }
        const prefDate = new Date(val);
        if (isNaN(prefDate.getTime())) {
          return 'Ngày không hợp lệ / Invalid Date';
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (prefDate < today) {
          return 'Ngày dự kiến phải từ hôm nay trở đi / Preferred Date must be today or in the future';
        }
        return null;

      case 'contactPhone':
        if (!val) {
          return 'Số điện thoại là bắt buộc / Contact Phone is required';
        }
        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(val)) {
          return 'Số điện thoại không hợp lệ (phải gồm 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09) / Contact Phone must be a valid VN phone number (10 digits starting with 03, 05, 07, 08, 09)';
        }
        return null;

      case 'admissionReason':
        if (!val) {
          return 'Lý do nhập viện là bắt buộc / Reason for Admission is required';
        }
        return null;

      case 'additionalNotes':
        if (val && val.length > 500) {
          return 'Ghi chú thêm tối đa 500 ký tự / Additional Notes must not exceed 500 characters';
        }
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

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < STEPS.length) setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    // Kiểm tra trùng lặp khi bấm gửi yêu cầu
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
        'Có lỗi xảy ra. Vui lòng thử lại.';

      // Nếu là lỗi trùng đơn từ API (409 Conflict hoặc thông báo trùng khớp)
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

  /* ── duplicate request detected / lockout screen ── */
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

  /* ── success screen ── */
  if (submitted) {
    return (
      <SuccessScreen
        submittedData={submittedData}
        formData={formData}
        navigate={navigate}
      />
    );
  }


  return (
    <form className="sap-page" onSubmit={handleSubmit} noValidate>
      {/* ── page header ── */}
      <div className="sap-page__header">
        <h1 className="sap-page__title">Gửi yêu cầu nhập viện</h1>
        <p className="sap-page__subtitle">
          Vui lòng hoàn thành các bước dưới đây để chúng tôi có thể hỗ trợ
          tốt nhất cho người thân của bạn.
        </p>
      </div>

      {/* ── stepper ── */}
      <div className="sap-stepper">
        {/* background track */}
        <div className="sap-stepper__track" />
        {/* progress fill */}
        <div
          className="sap-stepper__progress"
          style={{ width: `${progressPct}%` }}
        />

        {STEPS.map(({ id, label, Icon }) => {
          const done    = id < step;
          const active  = id === step;
          return (
            <div key={id} className="sap-stepper__step">
              <div
                className={`sap-stepper__circle ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
              >
                {done ? <Check size={16} /> : <Icon size={16} />}
              </div>
              <span
                className={`sap-stepper__label ${active || done ? 'is-active' : ''}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── form card ── */}
      <div className="sap-card">
        {step === 1 && <Step1 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />}
        {step === 2 && <Step2 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />}
        {step === 3 && <Step3 data={formData} onChange={setField} errors={errors} touched={touched} onBlur={handleBlur} />}

        {/* ── error banner ── */}
        {submitError && (
          <div className="sap-error-banner">
            <AlertCircle size={16} className="sap-error-banner__icon" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ── footer buttons ── */}
        <div className="sap-footer">
          <button
            type="button"
            className={`sap-btn sap-btn--outline ${step === 1 ? 'sap-btn--invisible' : ''}`}
            onClick={handlePrev}
            disabled={step === 1 || submitting}
          >
            <ChevronLeft size={16} />
            Quay lại
          </button>

          {step < STEPS.length ? (
            <button type="button" className="sap-btn sap-btn--primary" onClick={handleNext}>
              Tiếp tục
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
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
                  Gửi yêu cầu nhập viện
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── help cards ── */}
      <div className="sap-help-row">
        <div className="sap-help-card">
          <div className="sap-help-card__icon-wrap">
            <Phone size={20} />
          </div>
          <div>
            <h4 className="sap-help-card__title">Cần trợ giúp?</h4>
            <p className="sap-help-card__desc">
              Gọi ngay <strong>1900 1234</strong> để được tư vấn trực tiếp 24/7 về thủ tục nhập viện.
            </p>
          </div>
        </div>
        <div className="sap-help-card">
          <div className="sap-help-card__icon-wrap">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h4 className="sap-help-card__title">Tài liệu cần thiết</h4>
            <p className="sap-help-card__desc">
              Vui lòng chuẩn bị sẵn bản gốc CCCD và hồ sơ bệnh án cũ khi đến trung tâm.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
