import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import { CheckCircle2, UploadCloud, AlertCircle, Eye, X } from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED = '.jpg,.jpeg,.png';

/* tiny preview helper */
const ImagePreview = ({ file, onRemove }) => {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  return (
    <div className="relative mt-2 rounded-lg overflow-hidden border"
         style={{ borderColor: 'var(--border-color)' }}>
      <img src={url} alt="preview" className="w-full max-h-40 object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
        title="Remove"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/* drop-zone card */
const DropZone = ({ label, sublabel, file, onChange, onRemove, error, fieldId }) => (
  <div className="space-y-1">
    <p className="text-sm font-semibold" style={{ color: 'var(--text-color)' }}>{label}</p>
    {sublabel && (
      <p className="text-xs opacity-60 mb-1" style={{ color: 'var(--text-color)' }}>{sublabel}</p>
    )}
    <div
      className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer relative transition-colors"
      style={{
        backgroundColor: 'var(--bg-color)',
        borderColor: error ? '#ef4444' : file ? '#3b82f6' : 'var(--border-color)',
      }}
    >
      <input
        id={fieldId}
        type="file"
        accept={ACCEPTED}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {file ? (
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-blue-600 truncate max-w-[200px]">{file.name}</span>
          <span className="text-xs opacity-50" style={{ color: 'var(--text-color)' }}>
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
      ) : (
        <>
          <UploadCloud className="w-8 h-8 mb-2 opacity-40" style={{ color: 'var(--text-color)' }} />
          <span className="text-sm font-medium opacity-60 text-center" style={{ color: 'var(--text-color)' }}>
            Click or drag to upload
          </span>
          <span className="text-xs opacity-40 mt-0.5" style={{ color: 'var(--text-color)' }}>
            JPG / PNG — max {MAX_FILE_SIZE_MB} MB
          </span>
        </>
      )}
    </div>
    {error && (
      <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {error}
      </div>
    )}
    <ImagePreview file={file} onRemove={onRemove} />
  </div>
);

/* main component */
const UploadDocument = () => {
  const navigate  = useNavigate();
  const { refreshUser } = useAuth();
  const [frontFile, setFrontFile] = useState(null);
  const [backFile,  setBackFile]  = useState(null);
  const [frontError, setFrontError] = useState('');
  const [backError,  setBackError]  = useState('');
  const [loading,    setLoading]    = useState(false);

  const validateFile = (file) => {
    if (!file) return 'Please select a file.';
    if (file.size > MAX_FILE_SIZE_BYTES) return `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    return '';
  };

  const handleFrontChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    setFrontError(err);
    setFrontFile(err ? null : file);
  };

  const handleBackChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    setBackError(err);
    setBackFile(err ? null : file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Final validation
    const fe = validateFile(frontFile);
    const be = validateFile(backFile);
    setFrontError(fe);
    setBackError(be);
    if (fe || be) return;

    const formData = new FormData();
    formData.append('documentFront', frontFile);
    formData.append('documentBack',  backFile);

    setLoading(true);
    try {
      await API.post('/user/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Documents uploaded successfully!');
      await refreshUser();
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error(error.response?.data?.message || 'Document upload failed.');
    } finally {
      setLoading(false);
    }
  };

  /* upload form  */
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      <div
        className="max-w-xl w-full p-8 rounded-2xl shadow-md border transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: 'var(--text-color)' }}>
          Upload Citizenship Document
        </h2>
        <p className="mb-6 text-center text-sm opacity-60" style={{ color: 'var(--text-color)' }}>
          Upload <strong>both sides</strong> of your Nepali citizenship card to verify your identity.
        </p>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Front side */}
          <DropZone
            label="Front Side (Nepali side)"
            sublabel="The side with your photo and Nepali text"
            file={frontFile}
            onChange={handleFrontChange}
            onRemove={() => { setFrontFile(null); setFrontError(''); }}
            error={frontError}
            fieldId="docFront"
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border-color)' }} />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs font-semibold uppercase tracking-wider opacity-40"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}
              >
                and
              </span>
            </div>
          </div>

          {/* Back side */}
          <DropZone
            label="Back Side (English side)"
            sublabel="The side with your name, citizenship number, and date of birth in English"
            file={backFile}
            onChange={handleBackChange}
            onRemove={() => { setBackFile(null); setBackError(''); }}
            error={backError}
            fieldId="docBack"
          />

          <button
            type="submit"
            disabled={loading || !frontFile || !backFile || !!frontError || !!backError}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              'Submit Documents'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadDocument;
