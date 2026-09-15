const trim = (value) => String(value || '').trim();

const normalize = (value) => trim(value).toLowerCase();

const findEntityByIdOrName = (items, value, key = 'name') => {
  const v = String(value || '').trim();
  if (!v) return null;
  return (
    items.find((item) => String(item?._id) === v) ||
    items.find((item) => normalize(item?.[key]) === normalize(v)) ||
    null
  );
};

export const validateMedicationForm = (form) => {
  if (!trim(form.name)) {
    return { valid: false, message: 'Tên thuốc là bắt buộc.' };
  }
  if (!/^[A-Za-zÀ-ỹ]/u.test(trim(form.name))) {
    return { valid: false, message: 'Tên thuốc phải bắt đầu bằng chữ cái.' };
  }
  if (!trim(form.form)) {
    return { valid: false, message: 'Dạng thuốc là bắt buộc.' };
  }
  if (!trim(form.strength)) {
    return { valid: false, message: 'Hàm lượng là bắt buộc.' };
  }
  if (!trim(form.unit)) {
    return { valid: false, message: 'Đơn vị là bắt buộc.' };
  }
  if (!trim(form.manufacturer)) {
    return { valid: false, message: 'Nhà cung cấp là bắt buộc.' };
  }
  const minStockLevel = Number(form.minStockLevel);
  if (Number.isNaN(minStockLevel) || minStockLevel <= 1) {
    return { valid: false, message: 'Mức tối thiểu phải lớn hơn 1.' };
  }
  return { valid: true };
};

export const buildMedicationPayload = (form) => ({
  medicationCode: trim(form.medicationCode) || undefined,
  name: trim(form.name),
  form: trim(form.form) || undefined,
  strength: trim(form.strength) || undefined,
  unit: trim(form.unit) || undefined,
  manufacturer: trim(form.manufacturer) || undefined,
  description: trim(form.description) || undefined,
  minStockLevel: Number(form.minStockLevel) || 0,
  price: form.price != null && form.price !== '' ? Number(form.price) : undefined,
  isActive: Boolean(form.isActive),
});

export const validateSupplierForm = (form, suppliers = [], currentSupplierId = null) => {
  const name = trim(form.name);
  if (!name) {
    return { valid: false, message: 'Tên nhà cung cấp là bắt buộc.' };
  }
  if (!/^[A-Za-zÀ-ỹ]/u.test(name)) {
    return { valid: false, message: 'Tên nhà cung cấp phải bắt đầu bằng chữ cái.' };
  }

  const contactName = trim(form.contactName);
  if (!contactName) {
    return { valid: false, message: 'Tên người liên hệ là bắt buộc.' };
  }
  if (!/^[A-Za-zÀ-ỹ\s]+$/u.test(contactName)) {
    return { valid: false, message: 'Tên người liên hệ chỉ được chứa chữ cái và khoảng trắng.' };
  }

  const phone = trim(form.phone);
  if (!phone) {
    return { valid: false, message: 'Số điện thoại là bắt buộc.' };
  }
  if (!/^0\d{9}$/.test(phone)) {
    return { valid: false, message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.' };
  }

  const normalizedPhone = phone.replace(/\D/g, '');
  const hasDuplicatePhone = suppliers.some((supplier) => {
    if (currentSupplierId && String(supplier._id) === String(currentSupplierId)) {
      return false;
    }
    const existingPhone = String(supplier.phone || '').trim().replace(/\D/g, '');
    return existingPhone && existingPhone === normalizedPhone;
  });
  if (hasDuplicatePhone) {
    return { valid: false, message: 'Số điện thoại đã tồn tại.' };
  }

  const email = trim(form.email);
  if (!email) {
    return { valid: false, message: 'Email là bắt buộc.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Email không hợp lệ.' };
  }

  const normalizedEmail = email.toLowerCase();
  const hasDuplicateEmail = suppliers.some((supplier) => {
    if (currentSupplierId && String(supplier._id) === String(currentSupplierId)) {
      return false;
    }
    const existingEmail = String(supplier.email || '').trim().toLowerCase();
    return existingEmail && existingEmail === normalizedEmail;
  });
  if (hasDuplicateEmail) {
    return { valid: false, message: 'Email đã tồn tại.' };
  }

  const address = trim(form.address);
  if (!address) {
    return { valid: false, message: 'Địa chỉ là bắt buộc.' };
  }

  return { valid: true };
};

export const buildSupplierPayload = (form) => ({
  name: trim(form.name),
  contactName: trim(form.contactName) || undefined,
  phone: trim(form.phone) || undefined,
  email: trim(form.email) || undefined,
  address: trim(form.address) || undefined,
  notes: trim(form.notes) || undefined,
  isActive: Boolean(form.isActive),
});

const isValidDate = (value) => {
  if (!trim(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const validateStockForm = (form, medications = [], suppliers = [], isEditing = false) => {
  if (!trim(form.medicationId)) {
    return { valid: false, message: 'Thuốc là bắt buộc.' };
  }

  if (!trim(form.supplierId)) {
    return { valid: false, message: 'Nhà cung cấp là bắt buộc.' };
  }

  const quantity = Number(form.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return { valid: false, message: 'Số lượng phải lớn hơn 0.' };
  }

  if (form.costPerUnit == null || form.costPerUnit === '') {
    return { valid: false, message: 'Giá mỗi đơn vị là bắt buộc.' };
  }
  const cost = Number(form.costPerUnit);
  if (Number.isNaN(cost) || cost <= 0) {
    return { valid: false, message: 'Giá phải lớn hơn 0.' };
  }

  if (!trim(form.receivedDate)) {
    return { valid: false, message: 'Ngày nhập thuốc là bắt buộc.' };
  }
  if (!isValidDate(form.receivedDate)) {
    return { valid: false, message: 'Ngày nhập thuốc không hợp lệ.' };
  }
  const receivedTime = new Date(form.receivedDate).getTime();
  if (!isEditing && receivedTime + 60000 < Date.now()) {
    return { valid: false, message: 'Ngày nhập thuốc không được là ngày trong quá khứ.' };
  }

  if (!trim(form.expiryDate)) {
    return { valid: false, message: 'Ngày hết hạn là bắt buộc.' };
  }
  if (!isValidDate(form.expiryDate)) {
    return { valid: false, message: 'Ngày hết hạn không hợp lệ.' };
  }
  const expiryTime = new Date(form.expiryDate).getTime();
  if (!isEditing && expiryTime <= Date.now()) {
    return { valid: false, message: 'Ngày hết hạn phải là ngày trong tương lai.' };
  }
  if (receivedTime && expiryTime <= receivedTime + 365 * 24 * 60 * 60 * 1000) {
    return { valid: false, message: 'Ngày hết hạn phải lớn hơn 12 tháng kể từ ngày nhập thuốc.' };
  }
  
  const medication = findEntityByIdOrName(medications, form.medicationId, 'name');
  const supplier = findEntityByIdOrName(suppliers, form.supplierId, 'name');
  if (!medication) {
    return { valid: false, message: 'Thuốc không hợp lệ.' };
  }
  if (medication.isActive === false) {
    return { valid: false, message: 'Không thể nhập thuốc đã ngừng hoạt động.' };
  }
  if (!supplier) {
    return { valid: false, message: 'Nhà cung cấp không hợp lệ.' };
  }
  if (supplier.isActive === false) {
    return { valid: false, message: 'Không thể nhập thuốc với nhà cung cấp đã ngừng hoạt động.' };
  }
  const medicationManufacturer = normalize(medication.manufacturer);
  const supplierName = normalize(supplier.name);
  if (medicationManufacturer && supplierName && medicationManufacturer !== supplierName) {
    return { valid: false, message: 'Nhà cung cấp chưa có loại thuốc này, vui lòng thêm thuốc trước khi nhập.' };
  }

  return { valid: true };
};

export const getApiErrorMessage = (err, fallbackMessage) => {
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallbackMessage;

  const lowerMessage = String(message).toLowerCase();
  if (lowerMessage.includes('tên nhà cung cấp đã tồn tại') || lowerMessage.includes('supplier name already exists')) {
    return 'Tên nhà cung cấp đã tồn tại.';
  }

  if (lowerMessage.includes('email đã tồn tại') || lowerMessage.includes('email already exists') || lowerMessage.includes('email is already in use')) {
    return 'Email đã tồn tại.';
  }

  if (lowerMessage.includes('minstocklevel') && (lowerMessage.includes('phải lớn hơn 1000') || lowerMessage.includes('less than minimum') || lowerMessage.includes('greater than 1000'))) {
    return 'Mức tối thiểu phải lớn hơn 1000.';
  }

  if (lowerMessage.includes('cùng tên và nhà cung cấp') || lowerMessage.includes('same name and supplier')) {
    return 'Thuốc đã được tạo.';
  }

  if (lowerMessage.includes('đã tồn tại') || lowerMessage.includes('already exists')) {
    return 'Dữ liệu đã tồn tại.';
  }

  return message;
};
