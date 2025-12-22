"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse } from "./types";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterArchived, setFilterArchived] = useState("all");
  const [filterCircle, setFilterCircle] = useState("all");
  const [uniqueCircles, setUniqueCircles] = useState<string[]>([]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterArchived !== "all") params.append("filterArchived", filterArchived);
      if (filterCircle !== "all") params.append("filterCircle", filterCircle);

      const response = await fetch(`/participants/api?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to fetch participants: ${response.status}`);
      }

      const data: ParticipantsResponse = await response.json();
      setParticipants(data.participants || []);

      // Extract unique circles for filter
      const circles = new Set<string>();
      (data.participants || []).forEach((p) => {
        if (p.bereavement_circle) {
          circles.add(p.bereavement_circle);
        }
      });
      setUniqueCircles(Array.from(circles).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching participants:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterArchived, filterCircle]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleMarkAttendance = async (participantId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch("/participants/api", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: participantId,
          last_attendance: today,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update attendance");
      }

      // Refresh the list
      fetchParticipants();
    } catch (err) {
      console.error("Error marking attendance:", err);
      alert("שגיאה בעדכון נוכחות. נסה שוב.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "לא נרשמה";
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL");
  };

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateString === today;
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>רשימת משתתפים</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="filterArchived">סטטוס:</label>
            <select
              id="filterArchived"
              value={filterArchived}
              onChange={(e) => setFilterArchived(e.target.value)}
            >
              <option value="all">הכל</option>
              <option value="active">פעיל</option>
              <option value="archived">בארכיון</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="filterCircle">מעגל שכול:</label>
            <select
              id="filterCircle"
              value={filterCircle}
              onChange={(e) => setFilterCircle(e.target.value)}
            >
              <option value="all">הכל</option>
              {uniqueCircles.map((circle) => (
                <option key={circle} value={circle}>
                  {circle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className={styles.loading}>טוען...</div>}

      {error && (
        <div className={styles.error}>
          <div>שגיאה: {error}</div>
          <details style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            <summary>פרטים נוספים</summary>
            <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!loading && !error && participants.length === 0 && (
        <div className={styles.empty}>לא נמצאו משתתפים</div>
      )}

      {!loading && !error && participants.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className={styles.participantsTable}>
            <thead>
              <tr>
                <th>שם מלא</th>
                <th>טלפון</th>
                <th>אימייל</th>
                <th>מעגל שכול</th>
                <th>נוכחות אחרונה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => {
                const attendedToday = isToday(participant.last_attendance);
                return (
                  <tr
                    key={participant.id}
                    className={participant.is_archived ? styles.archived : ""}
                  >
                    <td>{participant.full_name}</td>
                    <td>{participant.phone || "-"}</td>
                    <td>{participant.email || "-"}</td>
                    <td>{participant.bereavement_circle || "-"}</td>
                    <td>
                      <span className={styles.lastAttendance}>
                        {formatDate(participant.last_attendance)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.attendanceButton} ${
                          attendedToday
                            ? styles.present
                            : participant.last_attendance
                            ? styles.notPresent
                            : styles.mark
                        }`}
                        onClick={() => handleMarkAttendance(participant.id)}
                        disabled={attendedToday}
                      >
                        {attendedToday
                          ? "נוכח היום"
                          : participant.last_attendance
                          ? "סמן נוכחות"
                          : "סמן נוכחות"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

