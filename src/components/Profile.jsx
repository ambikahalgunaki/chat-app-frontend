import React, { useState, useRef } from 'react';
import API from '../utils/api';

const Profile = ({ user, onUpdateUser, onClose }) => {
  const [name, setName] = useState(user.name);
  const [fileName, setFileName] = useState('No file chosen');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      setSelectedFile(null);
      setFileName('No file chosen');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('name', name);
    
    if (selectedFile) {
      formData.append('profilePic', selectedFile);
    }

    try {
      if (selectedFile) {
        const res = await API.post('/upload-profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success) {
          onUpdateUser(res.data.user);
          onClose(); 
        }
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to upload profile picture', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Profile Settings</h2>
        
        {/* NEW: Avatar Preview Circle */}
        <div className="profile-avatar-preview" onClick={() => fileInputRef.current.click()}>
          {user.profiePic ? (
            <img src={`http://localhost:3000${user.profiePic}`} alt="Profile" />
          ) : (
            user.name?.charAt(0)
          )}
          <div className="avatar-edit-overlay">📷</div>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="profile-form-group">
            <label>Change Picture</label>
            <div className="file-input-wrapper">
              <button type="button" className="choose-file-btn" onClick={() => fileInputRef.current.click()}>
                Choose File
              </button>
              <span className="file-name">{fileName}</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*"
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="profile-form-group">
            <label>Name</label>
            <input 
              type="text" 
              className="profile-input"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="profile-form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="profile-input"
              value={user.email} 
              readOnly
              style={{ background: '#f0f2f5', cursor: 'not-allowed' }}
            />
          </div>

          <div className="profile-modal-actions">
            <button type="submit" className="btn-update-profile" disabled={isUploading}>
              {isUploading ? 'Updating...' : 'Update Profile'}
            </button>
            <button type="button" className="btn-close-profile" onClick={onClose}>
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;