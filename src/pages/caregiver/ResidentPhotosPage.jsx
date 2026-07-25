import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Image as ImageIcon, Calendar, User, Trash2, Upload, X } from 'lucide-react';
import residentPhotoService from '../../services/residentPhoto.service';
import caregiverResidentService from '../../services/caregiverResident.service';

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
  const fileInputRef = useRef(null);

  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [loadingResidents, setLoadingResidents] = useState(true);

  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState(null);

  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    const loadResidents = async () => {
      try {
        const res = await caregiverResidentService.listResidents();
        const list = Array.isArray(res?.data) ? res.data : [];
        setResidents(list);
        if (list.length) setSelectedResidentId(list[0]._id);
      } catch (err) {
        console.error('Failed to load assigned residents:', err);
      } finally {
        setLoadingResidents(false);
      }
    };
    loadResidents();
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!selectedResidentId) return;
    setLoadingPhotos(true);
    setError(null);
    try {
      const res = await residentPhotoService.listPhotosForCaregiver(selectedResidentId);
      setPhotos(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải album ảnh.';
      setError(msg);
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [selectedResidentId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setUploadError(null);
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setCaption('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedResidentId || selectedFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      await residentPhotoService.addPhotos(selectedResidentId, selectedFiles, caption.trim());
      handleClearSelection();
      await loadPhotos();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải ảnh lên.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;
    setDeleting(true);
    try {
      await residentPhotoService.deletePhoto(selectedResidentId, photoToDelete._id);
      setPhotoToDelete(null);
      await loadPhotos();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa ảnh.';
      setError(msg);
      setPhotoToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="arh-page">
      {/* Header Section */}
      <div className="arh-header">
        <div className="arh-header__title-group">
          <h1 className="arh-header__title">Album ảnh cư dân</h1>
          <p className="arh-header__subtitle">
            Đăng tải và quản lý ảnh sinh hoạt hằng ngày của cư dân được phân công.
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

      {/* Upload Panel */}
      {selectedResidentId && (
        <div className="arh-table-container" style={{ marginBottom: '16px', padding: '16px' }}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Upload size={15} />
                Chọn ảnh
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={handleFilesSelected}
                />
              </label>
              <span className="text-xs text-slate-500">
                {selectedFiles.length > 0
                  ? `Đã chọn ${selectedFiles.length} ảnh`
                  : 'Chưa có ảnh nào được chọn (tối đa 10 ảnh/lần)'}
              </span>
            </div>

            {selectedFiles.length > 0 && (
              <>
                <input
                  type="text"
                  className="arh-filters__select"
                  style={{ width: '100%' }}
                  placeholder="Chú thích chung cho các ảnh (không bắt buộc)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-sage px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: '#1B365D' }}
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={14} className="animate-spin" /> Đang tải lên...
                      </span>
                    ) : (
                      'Tải ảnh lên'
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={handleClearSelection}
                    disabled={uploading}
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
            <h4>Chưa có cư dân nào được phân công</h4>
            <p>Bạn hiện chưa được phân công chăm sóc cư dân nào.</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="arh-empty">
            <ImageIcon size={48} className="arh-empty__icon" />
            <h4>Chưa có ảnh nào</h4>
            <p>Hãy tải lên ảnh đầu tiên cho cư dân này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {photos.map((photo) => (
              <div
                key={photo._id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <button
                  type="button"
                  className="h-full w-full focus:outline-none"
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Ảnh cư dân'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                      <p className="truncate text-[12px] font-medium text-white">{photo.caption}</p>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                  title="Xóa ảnh"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(photo);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
            <img src={previewPhoto.url} alt={previewPhoto.caption || 'Ảnh cư dân'} className="max-h-[70vh] w-full object-contain bg-black" />
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

      {/* Delete Confirm Modal */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
          onClick={() => !deleting && setPhotoToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h4 className="text-base font-bold text-slate-800">Xóa ảnh này?</h4>
              <button type="button" onClick={() => !deleting && setPhotoToDelete(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Ảnh sẽ bị xóa vĩnh viễn khỏi album và không thể khôi phục.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setPhotoToDelete(null)}
                disabled={deleting}
              >
                Hủy
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" /> Đang xóa...
                  </span>
                ) : (
                  'Xóa ảnh'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
