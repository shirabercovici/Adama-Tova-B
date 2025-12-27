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
  const [presentTodayCount, setPresentTodayCount] = useState<number>(0);

  const fetchParticipants = useCallback(async () => {
    // Only fetch if there's a search query
    if (!search || search.trim() === "") {
      setParticipants([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("search", search.trim());
      // Only show active participants in search
      params.append("filterArchived", "active");

      const response = await fetch(`/participants/api?${params.toString()}`);
      if (!response.ok) {
        let errorMessage = `Failed to fetch: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        console.error("API error:", errorMessage, response.status);
        throw new Error(errorMessage);
      }

      const data: ParticipantsResponse = await response.json();
      if (!data) {
        throw new Error("Invalid response from API");
      }
      setParticipants(data.participants || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "שגיאה";
      setError(errorMessage);
      console.error("Error fetching participants:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch count of participants present today (independent of search)
  const fetchPresentTodayCount = async () => {
    try {
      // Use same date calculation as API to avoid timezone issues
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const todayStr = today.toISOString().split("T")[0];
      
      const params = new URLSearchParams();
      params.append("filterLastAttendance", "today");
      params.append("filterArchived", "active");
      
      // Add cache busting to ensure fresh data
      const url = `/participants/api?${params.toString()}&_t=${Date.now()}`;
      const response = await fetch(url, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data: ParticipantsResponse = await response.json();
        const count = (data.participants || []).length;
        setPresentTodayCount(count);
      } else {
        // Silently ignore 404 errors for count fetch
        // The API route might not be loaded yet
      }
    } catch (err) {
      // Silently ignore errors for count fetch
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    fetchPresentTodayCount();
  }, []);

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

      // Refresh count after a delay to ensure DB is updated
      setTimeout(async () => {
        await fetchPresentTodayCount();
      }, 300);
      
      // Refresh participants list if there's a search query
      if (search && search.trim() !== "") {
        fetchParticipants();
      }
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




  return (
    <main className={styles.container}>
      {/* Purple Header */}
      <div className={styles.purpleHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>אדממי</div>
          <div className={styles.headerButton}>אד</div>
        </div>
        <div className={styles.headerCenter}>
          {!search && (
            <>
              <div className={styles.headerNumber}>{presentTodayCount}</div>
              <div className={styles.headerSubtitle}>פונים נוכחים במתחם</div>
            </>
          )}
        </div>
        <div className={styles.headerSearchBar}>
          <button
            type="button"
            className={styles.searchIconButton}
            aria-label="חיפוש"
          >
            <svg
              width="27.5"
              height="27.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" strokeWidth="3"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
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
              width="35.5"
              height="29.2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Person silhouette */}
              <circle cx="9" cy="7" r="4" stroke="currentColor" fill="none" strokeWidth="3"/>
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" fill="none" strokeWidth="3"/>
              {/* Plus sign */}
              <path d="M18 9v6M15 12h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
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
      {!loading && !error && search && participants.length === 0 && (
        <div className={styles.empty}>לא נמצאו פונים</div>
      )}

      {/* Participants List - Show only when there's a search */}
      {!loading && !error && search && participants.length > 0 && (
        <div className={styles.participantsList}>
          {/* List Header */}
          <div className={styles.listHeader}>
            <div className={styles.headerCellLast}>
              <div className={styles.headerAttendance}>נוכחות</div>
            </div>
            <div className={styles.headerDivider}></div>
            <div className={styles.headerCell}>
              <div className={styles.headerName}>שם</div>
            </div>
          </div>

          {participants.map((participant) => {
            const attendedToday = isToday(participant.last_attendance);

            return (
              <div
                key={participant.id}
                className={`${styles.participantCard} ${participant.is_archived ? styles.archived : ""}`}
              >
                {/* Attendance Checkbox Container */}
                <div className={styles.attendanceCheckboxContainer}>
                  <div className={styles.attendanceCheckbox}>
                    <input
                      type="checkbox"
                      checked={attendedToday}
                      onChange={(e) => {
                        handleMarkAttendance(participant.id, participant.last_attendance);
                      }}
                      className={styles.checkbox}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className={styles.checkboxDivider}></div>

                {/* Name, Bereavement Detail and Phone */}
                <div
                  className={styles.participantInfo}
                  onClick={() => router.push(`/participant-card?id=${participant.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.participantName}>{participant.full_name}</div>
                  {(participant.phone || participant.bereavement_detail) && (
                    <div className={styles.participantDetails}>
                      {participant.phone && (
                        <>
                          <span className={styles.participantPhone}>{participant.phone}</span>
                          {participant.bereavement_detail && <span className={styles.detailSeparator}> | </span>}
                        </>
                      )}
                      {participant.bereavement_detail && (
                        <span className={styles.bereavementDetail}>{participant.bereavement_detail}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

