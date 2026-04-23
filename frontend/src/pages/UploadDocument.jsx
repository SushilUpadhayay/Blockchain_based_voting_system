import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, UploadCloud, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const UploadDocument = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFileError('');
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a document to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    // Note: userId is no longer sent in the body.
    // The backend reads the user identity from the JWT token (req.user._id).

    setLoading(true);
    try {
      await API.post('/user/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsUploaded(true);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error(error.response?.data?.message || 'Document upload failed.');
    } finally {
      setLoading(false);
    }
  };

  if (isUploaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300 text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>Waiting for Approval</h2>
          <p className="mb-6 opacity-70 text-sm" style={{ color: 'var(--text-color)' }}>
            Your document has been uploaded securely. An admin will review it shortly.
            You will be able to vote once your account is approved.
          </p>
          <p className="text-sm opacity-50 mb-6" style={{ color: 'var(--text-color)' }}>
            Please check back later or wait for a notification.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--text-color)' }}>Upload ID Document</h2>
        <p className="mb-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          We need to verify your identity before you can participate in the election.
          Accepted formats: JPG, PNG, PDF — max {MAX_FILE_SIZE_MB} MB.
        </p>
        <form onSubmit={handleUpload} className="space-y-6">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors relative"
            style={{ backgroundColor: 'var(--bg-color)', borderColor: fileError ? '#ef4444' : 'var(--border-color)' }}
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 mb-2 opacity-50" style={{ color: 'var(--text-color)' }} />
            <span className="text-sm font-medium text-center" style={{ color: 'var(--text-color)' }}>
              {file ? file.name : 'Click or drag to upload document'}
            </span>
            {file && (
              <span className="text-xs mt-1 opacity-50" style={{ color: 'var(--text-color)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>

          {fileError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {fileError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file || !!fileError}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Document'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadDocument;
