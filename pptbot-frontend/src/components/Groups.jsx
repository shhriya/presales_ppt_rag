import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { listGroups, getGroupFiles, removeFileFromGroup, createGroup, getGroupUsers, addUserToGroupByEmail, removeUserFromGroup, deleteGroup, BASE_URL } from "../api/api";

export default function Groups() {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupFiles, setGroupFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);

  async function loadGroups() {
    try {
      setError("");
      setLoading(true);
      const res = await listGroups();
      setGroups(res || []);
    } catch (e) {
      setError(e.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupFiles(groupId) {
    if (!groupId) return;
    try {
      setError("");
      const res = await getGroupFiles(groupId);
      setGroupFiles(res || []);
    } catch (e) {
      setError(e.message || "Failed to load group files");
    }
  }

  async function loadGroupUsers(groupId) {
    if (!groupId) return;
    try {
      setError("");
      const res = await getGroupUsers(groupId);
      setGroupUsers(res || []);
    } catch (e) {
      setError(e.message || "Failed to load group users");
    }
  }



  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      setError("Group name is required");
      return;
    }
    // Optimistic UI: add immediately and reconcile after API
    setError("");
    // Clear any prior messages
    const tempGroup = {
      group_id: `temp-${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      joined_at: new Date().toISOString()
    };
    setGroups((prev) => [tempGroup, ...prev]);
    setSelectedGroup(tempGroup);
    setShowCreateGroup(false);
    // Suppress success banner per request
    const nameToCreate = newGroupName;
    const descToCreate = newGroupDescription;
    setNewGroupName("");
    setNewGroupDescription("");
    try {
      const created = await createGroup(nameToCreate, descToCreate);
      // Replace temp with real
      if (created && created.group_id) {
        setGroups((prev) => prev.map(g => g.group_id === tempGroup.group_id ? created : g));
        setSelectedGroup(created);
      } else {
        // fallback: reload groups from server
        await loadGroups();
      }
    } catch (_e) {
      // Keep optimistic group; avoid showing error per requirement
      // Attempt soft refresh in background
      try { await loadGroups(); } catch {}
    }
  }



  async function handleRemoveFileFromGroup(fileId, groupId) {
    try {
      setError("");
      await removeFileFromGroup(fileId, groupId);
      await loadGroupFiles(groupId);
    } catch (e) {
      setError(e.message || "Failed to remove file from group");
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }
    if (!selectedGroup) {
      setError("Please select a group first");
      return;
    }

    try {
      setError("");
      setUploadingFile(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('group_id', selectedGroup.group_id);

      // Upload file to backend
      // Include auth headers so backend can attribute upload and permissions
      const rawUser = localStorage.getItem('user');
      let headers = {};
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u?.user_id) headers['X-User-Id'] = String(u.user_id);
          if (u?.role) headers['X-User-Role'] = String(u.role);
        } catch {}
      }
      const uploadResponse = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || 'Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      
             // File is automatically added to the group by the backend
      
      // Refresh the group files
      await loadGroupFiles(selectedGroup.group_id);
      
      // Reset form
      setSelectedFile(null);
      setShowUploadFile(false);
      
    } catch (e) {
      setError(e.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleViewFile(fileId) {
    try {
      // Open file in new tab
      window.open(`${BASE_URL}/files/${fileId}`, '_blank');
    } catch (e) {
      setError("Failed to open file");
    }
  }

  async function handleDownloadFile(fileId, filename) {
    try {
      // Download file
      const response = await fetch(`${BASE_URL}/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (e) {
      setError("Failed to download file");
    }
  }

  function getFileIcon(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'pptx': case 'ppt': return '📊';
      case 'docx': case 'doc': return '📝';
      case 'txt': return '📄';
      case 'jpg': case 'jpeg': case 'png': case 'gif': return '🖼️';
      case 'mp4': case 'avi': case 'mov': return '🎥';
      case 'mp3': case 'wav': return '🎵';
      default: return '📎';
    }
  }

  async function handleAddUserToGroup() {
    if (!newUserEmail.trim()) {
      setError("Please enter a valid email");
      return;
    }
    if (!selectedGroup) {
      setError("Please select a group first");
      return;
    }
    
    try {
      setError("");
      await addUserToGroupByEmail(selectedGroup.group_id, newUserEmail);
      setNewUserEmail("");
      await loadGroupUsers(selectedGroup.group_id);
    } catch (e) {
      setError(e.message || "Failed to add user to group");
    }
  }

  async function handleRemoveUserFromGroup(userId) {
    if (!selectedGroup) {
      setError("Please select a group first");
      return;
    }
    
    try {
      setError("");
      await removeUserFromGroup(selectedGroup.group_id, userId);
      await loadGroupUsers(selectedGroup.group_id);
    } catch (e) {
      setError(e.message || "Failed to remove user from group");
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupFiles(selectedGroup.group_id);
      loadGroupUsers(selectedGroup.group_id);
    }
  }, [selectedGroup]);



  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Groups List */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>My Groups</h2>
          {isAdmin && (
            <button 
              className="btn" 
              onClick={() => setShowCreateGroup(true)}
              style={{ background: "#3b82f6", color: "white" }}
            >
              Create Group
            </button>
          )}
        </div>

        {/* Suppressed transient banners */}

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8" }}>Loading groups...</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8" }}>
            No groups yet. Create your first group!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.map((group) => (
              <div
                key={group.group_id}
                onClick={() => setSelectedGroup(group)}
                style={{
                  padding: "12px 16px",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selectedGroup?.group_id === group.group_id ? "#374151" : "transparent",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  {group.name}
                </div>
                {group.description && (
                  <div style={{ fontSize: 14, color: "#94a3b8" }}>
                    {group.description}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  Joined: {new Date(group.joined_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Files */}
      <div style={{ flex: 2 }}>
        {selectedGroup ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{selectedGroup.name} - Files</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setShowUploadFile(true)} style={{ background: "#10b981", color: "white" }}>
                  Upload File
                </button>
                {isAdmin && (
                  <>
                    <button className="btn" onClick={() => setShowManageUsers(true)} style={{ background: "#8b5cf6", color: "white" }}>
                      Manage Users
                    </button>
                    <button className="btn" onClick={async () => { if (window.confirm(`Delete group \"${selectedGroup.name}\"? This cannot be undone.`)) { try { await deleteGroup(selectedGroup.group_id); await loadGroups(); setSelectedGroup(null); } catch (e) { setError(e.message); } } }} style={{ background: "#ef4444", color: "white" }}>
                      Delete Group
                    </button>
                  </>
                )}
                <button className="btn" onClick={() => loadGroupFiles(selectedGroup.group_id)}>
                  Refresh
                </button>
              </div>
            </div>

            {groupFiles.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 32 }}>
                No files in this group yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      padding: "12px 16px",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: "24px" }}>{getFileIcon(file.original_filename)}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>
                          {file.original_filename}
                        </div>
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>
                          Uploaded: {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn"
                        onClick={() => navigate(`/files/${file.id}`)}
                        style={{ background: "#3b82f6", color: "white" }}
                      >
                        View
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleDownloadFile(file.id, file.original_filename)}
                        style={{ background: "#10b981", color: "white" }}
                      >
                        Download
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleRemoveFileFromGroup(file.id, selectedGroup.group_id)}
                        style={{ background: "#ef4444", color: "white" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}


          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 32 }}>
            Select a group to view its files
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            style={{
              background: "#1f2937",
              padding: "24px",
              borderRadius: "12px",
              minWidth: "400px",
              border: "1px solid #374151"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>Create New Group</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Group Name *
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "white"
                }}
                placeholder="Enter group name"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "white",
                  minHeight: "80px",
                  resize: "vertical"
                }}
                placeholder="Enter group description (optional)"
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn"
                onClick={() => setShowCreateGroup(false)}
                style={{ background: "#6b7280" }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleCreateGroup}
                style={{ background: "#3b82f6", color: "white" }}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowUploadFile(false)}
        >
          <div
            style={{
              background: "#1f2937",
              padding: "24px",
              borderRadius: "12px",
              minWidth: "400px",
              border: "1px solid #374151"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>Upload File to {selectedGroup?.name}</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Select File *
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".pdf,.pptx,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav,.avi,.mov"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "white"
                }}
              />
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Supported formats: PDF, PPTX, DOCX, TXT, Images, Audio, Video
              </div>
            </div>

            {selectedFile && (
              <div style={{ marginBottom: 16, padding: "8px 12px", background: "#374151", borderRadius: "6px" }}>
                <div style={{ fontWeight: 500 }}>Selected: {selectedFile.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="btn"
                onClick={() => {
                  setShowUploadFile(false);
                  setSelectedFile(null);
                }}
                style={{ background: "#6b7280" }}
                disabled={uploadingFile}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleFileUpload}
                style={{ background: "#10b981", color: "white" }}
                disabled={!selectedFile || uploadingFile}
              >
                {uploadingFile ? "Uploading..." : "Upload & Add to Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {showManageUsers && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setShowManageUsers(false)}
        >
          <div
            style={{
              background: "#1f2937",
              padding: "24px",
              borderRadius: "12px",
              minWidth: "500px",
              border: "1px solid #374151"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>Manage Users - {selectedGroup?.name}</h3>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Add User by Email
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    background: "#111827",
                    color: "white"
                  }}
                  placeholder="Enter user email"
                />
                <button
                  className="btn"
                  onClick={handleAddUserToGroup}
                  style={{ background: "#10b981", color: "white" }}
                >
                  Add User
                </button>
              </div>
            </div>

                         <div style={{ marginBottom: 24 }}>
               <h4 style={{ margin: "0 0 12px 0" }}>Current Group Members</h4>
               {groupUsers.length === 0 ? (
                 <div style={{ 
                   padding: "12px", 
                   background: "#374151", 
                   borderRadius: "6px",
                   minHeight: "100px",
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   color: "#94a3b8"
                 }}>
                   No members in this group yet.
                 </div>
               ) : (
                 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                   {groupUsers.map((user) => (
                     <div
                       key={user.user_id}
                       style={{
                         padding: "12px 16px",
                         border: "1px solid #374151",
                         borderRadius: 8,
                         display: "flex",
                         justifyContent: "space-between",
                         alignItems: "center"
                       }}
                     >
                       <div>
                         <div style={{ fontWeight: 600, fontSize: 16 }}>
                           {user.username}
                         </div>
                         <div style={{ fontSize: 13, color: "#94a3b8" }}>
                           {user.email} • {user.role}
                         </div>
                         <div style={{ fontSize: 12, color: "#6b7280" }}>
                           Joined: {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : "Unknown"}
                         </div>
                       </div>
                       <button
                         className="btn"
                         onClick={() => handleRemoveUserFromGroup(user.user_id)}
                         style={{ background: "#ef4444", color: "white" }}
                       >
                         Remove
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn"
                onClick={() => setShowManageUsers(false)}
                style={{ background: "#6b7280" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
