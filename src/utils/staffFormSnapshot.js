/** Map API staff → edit form state (pre-fill inputs). */
export const staffToEditForm = (staff) => ({
  fullName: staff?.fullName || '',
  phone: staff?.phone || '',
  gender: staff?.gender && staff.gender !== 'unknown' ? staff.gender : '',
  dateOfBirth: staff?.dateOfBirth ? String(staff.dateOfBirth).slice(0, 10) : '',
  specialty: staff?.staffProfile?.specialty || '',
  role: staff?.role || 'nurse',
  address: staff?.address || '',
  avatarFile: null,
  avatarUrl: staff?.avatarUrl || '',
  password: '',
});
