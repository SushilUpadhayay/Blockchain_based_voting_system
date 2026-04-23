import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, UploadCloud } from 'lucide-react';

const UploadDocument = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const userId = user?._id;
    
    if (!userId) {
      toast.error("User ID not found. Please register first.");
      navigate('/register');
      return;
    }
    if (!file) {
      toast.error("Please select a document to upload.");
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('userId', userId);

    setLoading(true);
    try {
      await API.post('/user/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Show waiting for approval UI
      setIsUploaded(true);
      toast.success("Document uploaded successfully.");
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error(error.response?.data?.message || "Document upload failed.");
    } finally {
      setLoading(false);
    }
  };

  if (isUploaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--text-color)' }}>Waiting for Approval</h2>
          <p className="mb-6 text-center opacity-70" style={{ color: 'var(--text-color)' }}>
            Your document has been uploaded securely. An admin will review it shortly. You won't be able to log in until your account is approved.
          </p>
          <p className="text-sm text-center opacity-50" style={{ color: 'var(--text-color)' }}>
            Please check back later or wait for a notification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-color)' }}>Upload ID Document</h2>
        <p className="mb-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>We need to verify your identity before you can participate in the election.</p>
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors relative" 
               style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
            <input 
              type="file" 
              onChange={handleFileChange} 
              accept=".jpg,.jpeg,.png,.pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 mb-2 opacity-50" style={{ color: 'var(--text-color)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
              {file ? file.name : "Click or drag to upload document"}
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Submit Document'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadDocument;
