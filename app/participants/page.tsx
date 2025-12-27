"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse } from "./types";

export default function ParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterArchived, setFilterArchived] = useState("all");
  const [filterCircle, setFilterCircle] = useState("all");
  const [filterLastAttendance, setFilterLastAttendance] = useState("all");
  const [uniqueCircles, setUniqueCircles] = useState<string[]>([]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterArchived !== "all") params.append("filterArchived", filterArchived);
      if (filterCircle !== "all") params.append("filterCircle", filterCircle);
      if (filterLastAttendance !== "all") params.append("filterLastAttendance", filterLastAttendance);

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
  }, [search, filterArchived, filterCircle, filterLastAttendance]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleMarkAttendance = async (participantId: string, currentAttendance: string | null) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const attendedToday = currentAttendance && currentAttendance === today;

      // If already attended today, remove attendance (set to null)
      // Otherwise, mark as attended today
      const newAttendance = attendedToday ? null : today;

      const response = await fetch("/participants/api", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: participantId,
          last_attendance: newAttendance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || `Failed to update attendance: ${response.status}`;
        console.error("API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      // Refresh the list
      fetchParticipants();
    } catch (err) {
      console.error("Error marking attendance:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בעדכון נוכחות";
      alert(`${errorMessage}. נסה שוב.`);
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

  const hasRecentCall = (participant: Participant) => {
    if (!participant.last_phone_call) return false;
    const callDate = new Date(participant.last_phone_call);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return callDate > thirtyDaysAgo;
  };

  // Count participants marked as present today (from the current list)
  const presentTodayCount = participants.filter((p) => isToday(p.last_attendance)).length;


  return (
    <main className={styles.container}>
      {/* Purple Header */}
      <div className={styles.purpleHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>אדממי</div>
          <div className={styles.headerButton}>אד</div>
        </div>
        <div className={styles.headerCenter}>
          <div className={styles.headerNumber}>{presentTodayCount}</div>
          <div className={styles.headerSubtitle}>פונים נוכחים במתחם</div>
        </div>
        <div className={styles.headerSearchBar}>
          <button
            type="button"
            className={styles.searchIconButton}
            aria-label="חיפוש"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </button>
          <div className={styles.searchDivider}></div>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              placeholder="חיפוש פונה"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.headerSearchInput}
            />
          </div>
          <button
            type="button"
            onClick={() => router.push("/new-participant")}
            className={styles.addPersonButton}
            aria-label="הוסף פונה חדש"
          >
            <svg
              width="32"
              height="24"
              viewBox="0 0 32 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                fill="currentColor"
              />
              <path
                d="M20 4h2v2h2v2h-2v2h-2V8h-2V6h2V4z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filterDropdown}>
          <select
            value={filterLastAttendance}
            onChange={(e) => setFilterLastAttendance(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">נראה לאחרונה</option>
            <option value="today">היום</option>
            <option value="week">שבוע האחרון</option>
            <option value="month">חודש האחרון</option>
            <option value="never">לעולם לא</option>
          </select>
        </div>
        <div className={styles.filterDropdown}>
          <select
            value={filterCircle}
            onChange={(e) => setFilterCircle(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">מעגל</option>
            {uniqueCircles.map((circle) => (
              <option key={circle} value={circle}>
                {circle}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`${styles.filterTab} ${filterArchived === "archived" ? styles.active : ""}`}
          onClick={() => setFilterArchived(filterArchived === "archived" ? "all" : "archived")}
        >
          חיפוש בארכיון
        </button>
      </div>


      {/* Loading */}
      {loading && <div className={styles.loading}>טוען...</div>}

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <div>שגיאה: {error}</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && participants.length === 0 && (
        <div className={styles.empty}>לא נמצאו פונים</div>
      )}

      {/* Participants List */}
      {!loading && !error && participants.length > 0 && (
        <div className={styles.participantsList}>
          {/* List Header */}
          <div className={styles.listHeader}>
            <div className={styles.headerPhoneSpace}></div>
            <div className={styles.headerCell}>
              <div className={styles.headerName}>שם</div>
            </div>
            <div className={styles.headerCellLast}>
              <div className={styles.headerAttendance}>נוכחות</div>
            </div>
          </div>

          {participants.map((participant) => {
            const attendedToday = isToday(participant.last_attendance);
            const hasCall = hasRecentCall(participant);

            return (
              <div
                key={participant.id}
                className={`${styles.participantCard} ${participant.is_archived ? styles.archived : ""}`}
              >
                {/* Phone Icon */}
                <div className={styles.phoneIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={hasCall ? styles.phoneIconActive : styles.phoneIconInactive}
                  >
                    <path
                      d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Name, Bereavement Detail and Phone */}
                <div
                  className={styles.participantInfo}
                  onClick={() => router.push(`/participant-card?id=${participant.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.participantName}>{participant.full_name}</div>
                  {participant.bereavement_detail && (
                    <div className={styles.bereavementDetail}>{participant.bereavement_detail}</div>
                  )}
                  {participant.phone && (
                    <div className={styles.participantPhone}>{participant.phone}</div>
                  )}
                </div>

                {/* Attendance Checkbox */}
                <div className={styles.attendanceCheckbox}>
                  <input
                    type="checkbox"
                    checked={attendedToday}
                    onChange={(e) => {
                      // Prevent navigation when clicking checkbox if the parent had the click handler
                      // But here the click handler is on the sibling .participantInfo, so this might not be strictly necessary unless layout changes
                      // But if we moved the click to the whole card, we would need e.stopPropagation()
                      handleMarkAttendance(participant.id, participant.last_attendance);
                    }}
                    className={styles.checkbox}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

