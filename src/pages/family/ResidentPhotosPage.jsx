import { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon, Calendar, User } from 'lucide-react';
import residentPhotoService from '../../services/residentPhoto.service';
import residentService from '../../services/resident.service';

const formatViDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

export default function ResidentPhotosPage() {
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [loadingResidents, setLoadingResidents] = useState(true);

  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState(null);

  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    const loadResidents = async () => {
      try {
        const data = await residentService.getFamilyResidentList();
        const list = Array.isArray(data) ? data : [];
        setResidents(list);
        if (list.length) setSelectedResidentId(list[0]._id);
      } catch (err) {
        console.error('Failed to load family residents:', err);
      } finally {
        setLoadingResidents(false);
      }
    };
    loadResidents();
  }, []);

  useEffect(() => {
    if (!selectedResidentId) return;

    const loadPhotos = async () => {
      setLoadingPhotos(true);
      setError(null);
      try {
        const res = await residentPhotoService.listPhotosForFamily(selectedResidentId);
        setPhotos(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Không thể tải album ảnh.';
        setError(msg);
        setPhotos([]);
      } finally {
        setLoadingPhotos(false);
      }
    };
    loadPhotos();
  }, [selectedResidentId]);

  return (
    <div className="arh-page">
      {/* Header Section */}
      <div className="arh-header">
        <div className="arh-header__title-group">
          <h1 className="arh-header__title">Album ảnh người thân</h1>
          <p className="arh-header__subtitle">
            Xem những khoảnh khắc thường ngày của người thân do nhân viên chăm sóc chia sẻ.
          </p>
        </div>

        {residents.length > 1 && (
          <div className="arh-filters__field">
            <select
              className="arh-filters__select"
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              disabled={loadingResidents}
            >
              {residents.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fullName} {r.residentCode ? `(${r.residentCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="arh-table-container">
        {loadingResidents || loadingPhotos ? (
          <div className="arh-loading">
            <Loader2 size={32} className="arh-spinner" />
            <span>Đang tải album ảnh...</span>
          </div>
        ) : error ? (
          <div className="arh-empty">
            <ImageIcon size={48} className="arh-empty__icon" />
            <h4>Không thể tải album ảnh</h4>
            <p>{error}</p>
          </div>
        ) : !selectedResidentId ? (
          <div className="arh-empty">
            <User size={48} className="arh-empty__icon" />
            <h4>Chưa có người thân liên kết</h4>
            <p>Tài khoản của bạn hiện chưa liên kết với hồ sơ người thân nào.</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="arh-empty">
            <ImageIcon size={48} className="arh-empty__icon" />
            <h4>Chưa có ảnh nào</h4>
            <p>Nhân viên chăm sóc chưa tải lên ảnh nào cho người thân của bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {photos.map((photo) => (
              <button
                key={photo._id}
                type="button"
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus:outline-none"
                onClick={() => setPreviewPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Ảnh người thân'}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                    <p className="truncate text-[12px] font-medium text-white">{photo.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="max-h-full max-w-2xl overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhoto.url} alt={previewPhoto.caption || 'Ảnh người thân'} className="max-h-[70vh] w-full object-contain bg-black" />
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                {previewPhoto.caption && <p className="font-medium text-slate-800">{previewPhoto.caption}</p>}
                <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                  <Calendar size={13} />
                  {formatViDateTime(previewPhoto.uploadedAt)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setPreviewPhoto(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
