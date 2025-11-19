import React, { useEffect, useState } from "react";
import { listFiles } from "../api/api";
import { useNavigate } from "react-router-dom";
import "./Chunks.css"; // 👈 add a css file for scroll styling

export default function Chunks() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // desc = latest first
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState(""); // yyyy-mm-dd
  const [filterMonth, setFilterMonth] = useState(""); // yyyy-mm
  const [filterYear, setFilterYear] = useState(""); // yyyy
  const [filterWeekStart, setFilterWeekStart] = useState(""); // yyyy-mm-dd (monday)
  const [searchFileName, setSearchFileName] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadFiles() {
      try {
        setError("");
        const res = await listFiles();
        setFiles(res.files || res || []);
      } catch (e) {
        setError(e.message || "Failed to list files");
      }
    }
    loadFiles();
  }, []);

  const handleViewChunks = (sessionId) => {
    if (!sessionId) return alert("No session available for this file");
    navigate(`/chunks/${sessionId}`);
  };

  // Utilities
  const parseDate = (d) => {
    try {
      return new Date(d);
    } catch {
      return new Date(0);
    }
  };

  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const getWeekStart = (d) => {
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1) - day; // move to Monday
    const monday = addDays(d, diff);
    return startOfDay(monday);
  };

  // Prepare filtered + sorted list
  const filtered = (files || []).filter((f) => {
    // Apply date filters
    const dt = parseDate(f.uploaded_at);
    if (filterType === "date" && filterDate) {
      const target = parseDate(filterDate);
      if (!isSameDay(dt, target)) return false;
    }
    if (filterType === "month" && filterMonth) {
      const [y, m] = filterMonth.split("-");
      if (!(dt.getFullYear() === Number(y) && dt.getMonth() + 1 === Number(m))) return false;
    }
    if (filterType === "year" && filterYear) {
      if (dt.getFullYear() !== Number(filterYear)) return false;
    }
    if (filterType === "week" && filterWeekStart) {
      const start = getWeekStart(parseDate(filterWeekStart));
      const end = addDays(start, 7);
      if (!(dt >= start && dt < end)) return false;
    }

    // Apply search filters
    if (searchFileName && !f.original_filename?.toLowerCase().includes(searchFileName.toLowerCase())) {
      return false;
    }
    
    if (searchUsername) {
      const uploadedBy = (f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || '').toLowerCase();
      if (!uploadedBy.includes(searchUsername.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    const da = parseDate(a.uploaded_at).getTime();
    const db = parseDate(b.uploaded_at).getTime();
    return sortOrder === "asc" ? da - db : db - da;
  });

  // Grouping
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const sevenDaysAgo = addDays(today, -7);

  const groups = {
    today: [],
    yesterday: [],
    last7: [],
    older: [],
  };

  filtered.forEach((f) => {
    const dt = startOfDay(parseDate(f.uploaded_at));
    if (isSameDay(dt, today)) groups.today.push(f);
    else if (isSameDay(dt, yesterday)) groups.yesterday.push(f);
    else if (dt >= sevenDaysAgo) groups.last7.push(f);
    else groups.older.push(f);
  });

  return (
    <div className="chunks-page">
      <div className="chunks-container">
        <h2 className="chunks-title">Select a file to view chunks</h2>
        {error && (
          <div style={{ color: "#ff3c00", textAlign: "center" }}>{error}</div>
        )}

        {/* Filter + Sort Bar */}
        <div className="filter-bar" style={{ marginTop: 8 }}>
          <div className="filter-row">
            <div className="filter-item">
              <label>Filter</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                <option value="all">All</option>
                <option value="date">Date</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>

            {filterType === "date" && (
              <div className="filter-item">
                <label>Pick Date</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="filter-input" />
              </div>
            )}

            {filterType === "week" && (
              <div className="filter-item">
                <label>Week Start (Mon)</label>
                <input type="date" value={filterWeekStart} onChange={(e) => setFilterWeekStart(e.target.value)} className="filter-input" />
              </div>
            )}

            {filterType === "month" && (
              <div className="filter-item">
                <label>Month</label>
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="filter-input" />
              </div>
            )}

            {filterType === "year" && (
              <div className="filter-item">
                <label>Year</label>
                <input type="number" min="1970" max="2100" placeholder="YYYY" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="filter-input" />
              </div>
            )}

            <div className="filter-item">
              <label>Search Filename</label>
              <input 
                type="text" 
                placeholder="Search by filename..." 
                value={searchFileName}
                onChange={(e) => setSearchFileName(e.target.value)}
                className="filter-input"
                style={{ minWidth: '180px' }}
              />
            </div>

            <div className="filter-item">
              <label>Search Uploader</label>
              <input 
                type="text" 
                placeholder="Search by uploader..." 
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="filter-input"
                style={{ minWidth: '180px' }}
              />
            </div>

            <div className="filter-item" style={{ marginLeft: "auto" }}>
              <label>Sort</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="filter-select">
                <option value="desc">Latest</option>
                <option value="asc">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="scroll-container" style={{ width: "100%", maxWidth: 960, margin: "10px auto 0", padding: 10 }}>
          {/* Group: Today */}
          {groups.today.length > 0 && (
            <div className="group-block">
              <div className="group-title">Today</div>
              <ul className="file-list">
                {groups.today.map((f) => (
                  <li key={f.id} className="file-item" onClick={() => handleViewChunks(f.session_id)}>
                    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
                      Uploaded: {new Date(f.uploaded_at).toLocaleString()}
                    </div>
                    {(f.uploaded_by || f.uploaded_by_name || f.uploaded_by_role) && (
                      <div style={{ fontSize: 12, marginTop: 2, color: "var(--muted)" }}>
                        By: {f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || "Unknown"}
                        {f.uploaded_by_role ? ` • ${f.uploaded_by_role}` : (f.uploaded_by?.role ? ` • ${f.uploaded_by.role}` : "")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Group: Yesterday */}
          {groups.yesterday.length > 0 && (
            <div className="group-block">
              <div className="group-title">Yesterday</div>
              <ul className="file-list">
                {groups.yesterday.map((f) => (
                  <li key={f.id} className="file-item" onClick={() => handleViewChunks(f.session_id)}>
                    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
                      Uploaded: {new Date(f.uploaded_at).toLocaleString()}
                    </div>
                    {(f.uploaded_by || f.uploaded_by_name || f.uploaded_by_role) && (
                      <div style={{ fontSize: 12, marginTop: 2, color: "var(--muted)" }}>
                        By: {f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || "Unknown"}
                        {f.uploaded_by_role ? ` • ${f.uploaded_by_role}` : (f.uploaded_by?.role ? ` • ${f.uploaded_by.role}` : "")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Group: Last 7 Days */}
          {groups.last7.length > 0 && (
            <div className="group-block">
              <div className="group-title">Last 7 Days</div>
              <ul className="file-list">
                {groups.last7.map((f) => (
                  <li key={f.id} className="file-item" onClick={() => handleViewChunks(f.session_id)}>
                    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
                      Uploaded: {new Date(f.uploaded_at).toLocaleString()}
                    </div>
                    {(f.uploaded_by || f.uploaded_by_name || f.uploaded_by_role) && (
                      <div style={{ fontSize: 12, marginTop: 2, color: "var(--muted)" }}>
                        By: {f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || "Unknown"}
                        {f.uploaded_by_role ? ` • ${f.uploaded_by_role}` : (f.uploaded_by?.role ? ` • ${f.uploaded_by.role}` : "")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Group: Older */}
          {groups.older.length > 0 && (
            <div className="group-block">
              <div className="group-title">Older</div>
              <ul className="file-list">
                {groups.older.map((f) => (
                  <li key={f.id} className="file-item" onClick={() => handleViewChunks(f.session_id)}>
                    <div style={{ fontWeight: 600 }}>{f.original_filename}</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
                      Uploaded: {new Date(f.uploaded_at).toLocaleString()}
                    </div>
                    {(f.uploaded_by || f.uploaded_by_name || f.uploaded_by_role) && (
                      <div style={{ fontSize: 12, marginTop: 2, color: "var(--muted)" }}>
                        By: {f.uploaded_by_name || f.uploaded_by?.username || f.uploaded_by?.email || "Unknown"}
                        {f.uploaded_by_role ? ` • ${f.uploaded_by_role}` : (f.uploaded_by?.role ? ` • ${f.uploaded_by.role}` : "")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}