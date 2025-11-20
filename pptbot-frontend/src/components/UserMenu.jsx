import React, { useState, useEffect, useRef } from 'react';
import './UserMenu.css';

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const dropdownRef = useRef(null);

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    try {
      setMsg({ text: '', type: '' });
      
      // Validate passwords
      if (!currentPwd) {
        setMsg({ text: 'Current password is required', type: 'error' });
        return;
      }
      if (!newPwd) {
        setMsg({ text: 'New password is required', type: 'error' });
        return;
      }
      if (newPwd.length < 6) {
        setMsg({ text: 'Password must be at least 6 characters', type: 'error' });
        return;
      }
      if (newPwd !== confirmPwd) {
        setMsg({ text: 'Passwords do not match', type: 'error' });
        return;
      }

      console.log('Sending request to update password...');
      console.log('User ID:', user?.user_id);
      console.log('Current password length:', currentPwd.length);
      console.log('New password length:', newPwd.length);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      };

      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(
        `${apiBaseUrl}/api/users/${user.user_id}/password`,
        {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            password: newPwd,
            current_password: currentPwd
          })
        }
      ).catch(error => {
        console.error('Network error:', error);
        throw new Error('Unable to connect to the server. Please check your internet connection.');
      });

      if (!response) {
        throw new Error('Failed to connect to the server. Please try again later.');
      }

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Error parsing response:', e);
        data = {};
      }
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (!response.ok) {
        let errorMessage = 'Failed to update password';
        
        if (data.detail) {
          errorMessage = typeof data.detail === 'string' 
            ? data.detail 
            : JSON.stringify(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.status === 422) {
          errorMessage = 'Validation error. Please check your input.';
        }

        console.error('Error details:', {
          status: response.status,
          statusText: response.statusText,
          data
        });

        throw new Error(errorMessage);
      }

      // Success
      setMsg({
        text: 'Password updated successfully!',
        type: 'success'
      });

      // Reset form
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');

      // Close form after 2 seconds
      setTimeout(() => {
        setMsg({ text: '', type: '' });
        setIsEditing(false);
      }, 2000);

    } catch (err) {
      console.error('Error in changePassword:', err);
      setMsg({
        text: err.message || 'An error occurred while updating password',
        type: 'error'
      });
    }
  }

  return (
    <div className="user-menu-container" ref={dropdownRef}>
      <button
        className="profile-button"
        onClick={() => setOpen(o => !o)}
        title="Profile"
      >
        <i className="bi bi-person-circle"></i>
        <span className="username">{user?.username || 'User'}</span>
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-content">
            <div className="profile-header">
              <div className="profile-avatar">
                <i className="bi bi-person-fill"></i>
              </div>
              <div className="profile-info">
                <h3>{user?.username || 'User'}</h3>
                <p className="email">{user?.email || 'No email provided'}</p>
                <span className="role-badge">{user?.role || 'User'}</span>
              </div>
            </div>

            <div className="profile-section">
              <h4>Account Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Username:</span>
                  <span className="info-value">{user?.username || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user?.email || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Role:</span>
                  <span className="info-value">{user?.role || 'User'}</span>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <div className="section-header">
                <h4>Change Password</h4>
                <button
                  type="button"
                  className="toggle-edit"
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setMsg({ text: '', type: '' });
                  }}
                >
                  {isEditing ? (
                    <>
                      <i className="bi bi-x-lg"></i> Cancel
                    </>
                  ) : (
                    <>
                      <i className="bi bi-pencil"></i> Change
                    </>
                  )}
                </button>
              </div>

              {isEditing && (
                <form onSubmit={changePassword} className="password-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        aria-label={showCurrentPwd ? 'Hide password' : 'Show password'}
                      >
                        <i
                          className={`bi ${showCurrentPwd ? 'bi-eye-slash' : 'bi-eye'}`}
                        ></i>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="New password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                      >
                        <i
                          className={`bi ${showNewPwd ? 'bi-eye-slash' : 'bi-eye'}`}
                        ></i>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {msg.text && (
                    <div className={`message ${msg.type}`}>
                      <i
                        className={`bi ${
                          msg.type === 'success'
                            ? 'bi-check-circle'
                            : 'bi-exclamation-triangle'
                        }`}
                      ></i>
                      {msg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="save-button"
                    disabled={!currentPwd || !newPwd || !confirmPwd}
                  >
                    <i className="bi bi-key"></i> Update Password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;