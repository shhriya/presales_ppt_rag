// src/components/Groups.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "./Groups.css";
import { useExtraction } from "../context/ExtractionContext";
import {
  listGroups,
  getGroupFiles,
  removeFileFromGroup,
  createGroup,
  getGroupUsers,
  addUserToGroupByEmail,
  removeUserFromGroup,
  deleteGroup,
  BASE_URL,
} from "../api/api";

/* ----------------------
   Helpers
   ---------------------- */
function toIST(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));

  return istTime.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) + " IST";
}
/* ----------------------
   Small internal components
   (keeps main render clear)
   ---------------------- */

/* Generic modal wrapper */
function Modal({ children, onClose, large = false }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal ${large ? "large" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* Create Group Modal */
function CreateGroupModal({
  name,
  setName,
  description,
  setDescription,
  onCreate,
  onCancel,
  creating,
  error,
}) {
  return (
    <Modal onClose={onCancel}>
      <h3>Create Group</h3>
      {error && <div className="error-message">{error}</div>}
      <input
        type="text"
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="modal-actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onCreate} disabled={creating}>
          {creating ? "Creating..." : "Create"}
        </button>
      </div>
    </Modal>
  );
}

/* Upload File Modal */
function UploadFileModal({
  selectedFile,
  setSelectedFile,
  onUpload,
  onCancel,
  uploading,
  error,
}) {
  return (
    <Modal onClose={onCancel}>
      <h3>Upload File</h3>
      {error && <div className="error-message">{error}</div>}
      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
      />
      {selectedFile && (
        <div className="selected-file-info">{selectedFile.name}</div>
      )}
      <div className="modal-actions">
        <button onClick={onCancel} disabled={uploading}>
          Cancel
        </button>
        <button onClick={onUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </Modal>
  );
}

/* Manage Users Modal */
function ManageUsersModal({
  groupUsers,
  newUserEmail,
  setNewUserEmail,
  missingUserEmail,
  onAddUser,
  onRemoveUser,
  onClose,
  error,
  loadingUsers,
}) {
  return (
    <Modal onClose={onClose} large>
      <h3>Manage Users</h3>
      {error && <div className="error-message">{error}</div>}
      <div className="user-add-section">
        <input
          type="email"
          placeholder="Add user by email"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
        <button onClick={onAddUser}>Add</button>
      </div>
      {missingUserEmail && (
        <div className="error-message">
          User "{missingUserEmail}" does not exist. Create user in Admin first.
        </div>
      )}
      <h4>Users in this group</h4>
      <div className="user-list">
        {loadingUsers ? (
          <div className="loading-state">Loading users...</div>
        ) : groupUsers.length === 0 ? (
          <div className="empty-state">No users yet</div>
        ) : (
          groupUsers.map((u) => (
              <div className="user-row" key={u.user_id ?? u.id ?? u.email}>
                <span>{u.email || u.username || u.name}</span>
                <button onClick={() => onRemoveUser(u.user_id ?? u.id)}>Remove</button>
              </div>
          ))
        )}
      </div>

      <div className="modal-actions">
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* File card inside list */
function FileCard({ file, currentUser, isAdmin, onView, onDownload, onDelete }) {
  const isMine =
    (file.uploaded_by && String(file.uploaded_by) === String(currentUser?.user_id)) ||
    (file.uploader?.id && String(file.uploader.id) === String(currentUser?.user_id));

  const ext = (file.original_filename || "").split(".").pop()?.toLowerCase();
  const icon = "📄"; // you can switch to icons later

  // Short pretty date
  const dateObj = new Date(file.uploaded_at);
  const prettyTime =
    dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " • " +
    dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="filecard-container">
      <div className="filecard-left">
        <div className="filecard-icon">{icon}</div>

        <div className="filecard-info">
          <div className="filecard-name">{file.original_filename}</div>
          <div className="filecard-meta">
            Uploaded by: {file.uploader?.username || "Unknown"}
          </div>
          <div className="filecard-time">{prettyTime}</div>
        </div>
      </div>

      <div className="filecard-menu">
        <div className="dropdown">
          <button className="menu-btn">
            <i className="bi bi-three-dots-vertical"></i>
          </button>

          <div className="dropdown-menu">
            <div onClick={() => onView(file.id, file.original_filename)}>View</div>
            <div onClick={() => onDownload(file.id, file.original_filename)}>Download</div>
            {(isAdmin || isMine) && (
              <div onClick={() => onDelete(file.id)} className="delete-option">Delete</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* Groups list item */
function GroupListItem({ group, selected, onSelect }) {
  return (
    
    <div
      className="my-groups"
      
      style={{
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.15)",
        cursor: "pointer",
        background: selected ? "#0a225e" : "rgba(255,255,255,0.05)",
        color: selected ? "white" : "var(--primary)",
        transition: "all 0.2s",
      }}
      onClick={() => onSelect(group)}
    >
      <div style={{ fontWeight: 600, fontSize: 15 }}>{group.name}</div>
      {group.description && <div style={{ fontSize: 13, opacity: 0.7 }}>{group.description}</div>}
      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
        Created: {new Date(group.joined_at || Date.now()).toLocaleDateString()}
      </div>
    </div>
  );
}

/* ----------------------
   Main Groups component
   ---------------------- */
export default function Groups() {
  const { user } = useAuth();
  // const { setExtracting } = useExtraction();
  const navigate = useNavigate();

  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  // Primary state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupFiles, setGroupFiles] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");


  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const [showUploadFile, setShowUploadFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [showManageUsers, setShowManageUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [missingUserEmail, setMissingUserEmail] = useState("");

  const [isSmall, setIsSmall] = useState(false);

  // Visual helper (keeps your style behaviour)
  const baseBtnStyle = { background: "#e5e7eb", color: "#111827" };
  function interactiveButtonProps(hoverBg, activeBg, hoverColor = "#ffffff") {
    return {
      onMouseEnter: (e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; },
      onMouseLeave: (e) => { e.currentTarget.style.background = baseBtnStyle.background; e.currentTarget.style.color = baseBtnStyle.color; },
      onMouseDown: (e) => { e.currentTarget.style.background = activeBg; },
      onMouseUp: (e) => { e.currentTarget.style.background = hoverBg; },
    };
  }

  /* ----------------------
     API interactions
     ---------------------- */

  const loadGroups = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await listGroups();
      setGroups(res || []);
    } catch (e) {
      setError(e.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroupFiles = useCallback(async (groupId) => {
    if (!groupId) return;
    setError("");
    try {
      const res = await getGroupFiles(groupId);
      setGroupFiles(res || []);
    } catch (e) {
      setError(e.message || "Failed to load group files");
    }
  }, []);

  const loadGroupUsers = useCallback(async (groupId) => {
    if (!groupId) return;
    setError("");
    setLoadingUsers(true);
    try {
      const res = await getGroupUsers(groupId);
      setGroupUsers(res || []);
    } catch (e) {
      setError(e.message || "Failed to load group users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupFiles(selectedGroup.group_id);
      loadGroupUsers(selectedGroup.group_id);
    } else {
      setGroupFiles([]);
      setGroupUsers([]);
    }
  }, [selectedGroup, loadGroupFiles, loadGroupUsers]);

  useEffect(() => {
    function handleResize() {
      setIsSmall(window.innerWidth < 900);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ----------------------
     Action handlers
     ---------------------- */

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      setError("Group name is required");
      return;
    }
    setError("");
    setCreatingGroup(true);

    // Optimistic add (keeps behavior you had)
    const tempGroup = {
      group_id: `temp-${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      joined_at: new Date().toISOString(),
    };
    setGroups((prev) => [tempGroup, ...prev]);
    setSelectedGroup(tempGroup);
    setShowCreateGroup(false);

    const nameToCreate = newGroupName;
    const descToCreate = newGroupDescription;
    setNewGroupName("");
    setNewGroupDescription("");

    try {
      const created = await createGroup(nameToCreate, descToCreate);
      if (created && created.group_id) {
        setGroups((prev) => prev.map((g) => (g.group_id === tempGroup.group_id ? created : g)));
        setSelectedGroup(created);
      } else {
        await loadGroups();
      }
    } catch (_e) {
      // best-effort: refresh groups
      try { await loadGroups(); } catch {}
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleRemoveFileFromGroup(fileId) {
    if (!selectedGroup) return;
    setError("");
    try {
      await removeFileFromGroup(fileId, selectedGroup.group_id);
      await loadGroupFiles(selectedGroup.group_id);
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

    setError("");
    setUploadingFile(true);
    // setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("group_id", selectedGroup.group_id);

      const rawUser = localStorage.getItem("user");
      let headers = {};
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (u?.user_id) headers["X-User-Id"] = String(u.user_id);
          if (u?.role) headers["X-User-Role"] = String(u.role);
        } catch {}
      }

      const uploadResponse = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!uploadResponse.ok) {
        let err = "Failed to upload file";
        try {
          const data = await uploadResponse.json();
          err = data.detail || err;
        } catch {}
        throw new Error(err);
      }

      await loadGroupFiles(selectedGroup.group_id);
      setSelectedFile(null);
      setShowUploadFile(false);
    } catch (e) {
      setError(e.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
      // setExtracting(false);
    }
  }

  function handleViewFile(fileId, filename) {
     navigate(`/groups/file/${fileId}/${filename}`);
  }

  async function handleDownloadFile(fileId, filename) {
    try {
      const response = await fetch(`${BASE_URL}/api/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("Download failed");
      }
    } catch (e) {
      setError("Failed to download file");
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
    setError("");
    setMissingUserEmail("");
    try {
      await addUserToGroupByEmail(selectedGroup.group_id, newUserEmail);
      setNewUserEmail("");
      await loadGroupUsers(selectedGroup.group_id);
    } catch (e) {
      const msg = (e?.message || "").toLowerCase();
      if (msg.includes("user does not exist")) {
        setMissingUserEmail(newUserEmail);
        setError("User does not exist. Please create the user in Admin first.");
      } else {
        setError(e.message || "Failed to add user to group");
      }
    }
  }

  async function handleRemoveUserFromGroup(userId) {
    if (!selectedGroup) {
      setError("Please select a group first");
      return;
    }
    setError("");
    try {
      await removeUserFromGroup(selectedGroup.group_id, userId);
      await loadGroupUsers(selectedGroup.group_id);
    } catch (e) {
      setError(e.message || "Failed to remove user from group");
    }
  }

  async function handleDeleteGroup(groupId, groupName) {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`)) return;
    try {
      await deleteGroup(groupId);
      await loadGroups();
      if (selectedGroup?.group_id === groupId) setSelectedGroup(null);
    } catch (e) {
      setError(e.message || "Failed to delete group");
    }
  }

  /* ----------------------
     Render
     ---------------------- */

  return (
    <div
      style={{
        height: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: isSmall ? "column" : "row",
        overflow: "hidden",
        background: "transparent",
      }}
    >
{/* LEFT PANE — GROUP NAMES */}
<div
  style={{
    width: isSmall ? "100%" : 320,
    flexShrink: 0,
    display: isSmall && selectedGroup ? "none" : "flex",
    flexDirection: "column",
    borderRight: isSmall ? "none" : "1px solid rgba(255,255,255,0.1)",
    padding: 16,
    overflowY: "auto",
    scrollbarWidth: "thin",
  }}
>

  {/* 🔍 Search + ➕ Add Group */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 12,
    }}
  >
    <input
      type="text"
      placeholder="Search groups..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 6,
         border: "1px solid #1e3a8a",
        background: "rgba(255,255,255,0.1)",
        color: "black",
        outline: "none"
      }}
    />

    {isAdmin && (
      <button
        className="btn"
        onClick={() => setShowCreateGroup(true)}
        style={baseBtnStyle}
        {...interactiveButtonProps("#3b82f6", "#1e40af")}
        title="Create Group"
      >
        <i className="bi bi-plus-lg" />
      </button>
    )}
  </div>

  {/* 🔄 Loading / Empty / Group List */}
  {loading ? (
    <div style={{ textAlign: "center", color: "#94a3b8" }}>Loading groups...</div>
  ) : groups.length === 0 ? (
    <div style={{ textAlign: "center", color: "#94a3b8" }}>
      No groups yet. Create your first group!
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {groups
        .filter((g) =>
          g.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((g) => (
          <GroupListItem
            key={g.group_id}
            group={g}
            selected={selectedGroup?.group_id === g.group_id}
            onSelect={setSelectedGroup}
          />
        ))}
    </div>
  )}
</div>


      {/* RIGHT PANE — FILES/CHAT */}
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedGroup ? (
          <>
            {/* Header */}
            <div
              style={{
                flexShrink: 0,
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isSmall && (
                  <button
                    className="btn"
                    onClick={() => setSelectedGroup(null)}
                    style={baseBtnStyle}
                    {...interactiveButtonProps("#334155", "#1f2937")}
                    title="Back"
                  >
                    ←
                  </button>
                )}
                <h2 style={{ margin: 0, color: "white" }}>{selectedGroup.name} - Files</h2>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => setShowUploadFile(true)}
                  style={baseBtnStyle}
                  {...interactiveButtonProps("#10b981", "#065f46")}
                  title="Upload File"
                >
                  <i className="bi bi-cloud-arrow-up" />
                </button>

                {isAdmin && (
                  <>
                    <button
                      className="btn"
                      onClick={() => { setShowManageUsers(true); setMissingUserEmail(""); }}
                      style={baseBtnStyle}
                      {...interactiveButtonProps("#6b7280", "#4b5563")}
                      title="Manage Users"
                    >
                      <i className="bi bi-people-fill" />
                    </button>

                    <button
                      className="btn"
                      onClick={() => handleDeleteGroup(selectedGroup.group_id, selectedGroup.name)}
                      style={baseBtnStyle}
                      {...interactiveButtonProps("#ef4444", "#b91c1c")}
                      title="Delete Group"
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </>
                )}

                <button
                  className="btn"
                  onClick={() => loadGroupFiles(selectedGroup.group_id)}
                  style={baseBtnStyle}
                  {...interactiveButtonProps("#334155", "#1f2937")}
                  title="Refresh"
                >
                  <i className="bi bi-arrow-clockwise" />
                </button>
              </div>
            </div>

            {/* Files area */}
           
            <div style={{ flex: 1, overflowY: "auto", padding: 16, scrollbarWidth: "thin" }}>
              {groupFiles.length === 0 ? (
                <div className="groups-empty">No files in this group yet.</div>
              ) : (
                <div className="chat-thread">
                  {groupFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      currentUser={user}
                      isAdmin={isAdmin}
                      onView={handleViewFile}
                      onDownload={handleDownloadFile}
                      onDelete={(fileId) => handleRemoveFileFromGroup(fileId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div
  style={{
   flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      color: "#94a3b8",        // light grey
      fontWeight: "600",       // bold
      fontSize: "20px",
      padding: "20px",
      opacity: 0.9,
  }}
>
  <div>Click a group to view its files</div>
</div>

        )}
      </div>

      {/* ---------- Modals ---------- */}

      {showCreateGroup && (
        <CreateGroupModal
          name={newGroupName}
          setName={setNewGroupName}
          description={newGroupDescription}
          setDescription={setNewGroupDescription}
          onCreate={handleCreateGroup}
          onCancel={() => { setShowCreateGroup(false); setError(""); }}
          creating={creatingGroup}
          error={error}
        />
      )}

      {showUploadFile && (
        <UploadFileModal
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          onUpload={handleFileUpload}
          onCancel={() => { setShowUploadFile(false); setSelectedFile(null); setError(""); }}
          uploading={uploadingFile}
          error={error}
        />
      )}

      {showManageUsers && (
        <ManageUsersModal
          groupUsers={groupUsers}
          newUserEmail={newUserEmail}
          setNewUserEmail={setNewUserEmail}
          missingUserEmail={missingUserEmail}
          onAddUser={handleAddUserToGroup}
          onRemoveUser={handleRemoveUserFromGroup}
          onClose={() => { setShowManageUsers(false); setError(""); setNewUserEmail(""); setMissingUserEmail(""); }}
          error={error}
          loadingUsers={loadingUsers}
        />
      )}
    </div>
  );
}
