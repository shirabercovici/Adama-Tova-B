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
        let errorMessage = `Failed to fetch participants: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        console.error("API error:", errorMessage);
        throw new Error(errorMessage);
      }

      const data: ParticipantsResponse = await response.json();
      if (!data) {
        throw new Error("Invalid response from API");
      }
      setParticipants(data.participants || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
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
        const errorText = await response.text();
        console.error("Failed to fetch present count:", response.status, errorText);
      }
    } catch (err) {
      console.error("Error fetching present today count:", err);
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

  const hasRecentCall = (participant: Participant) => {
    if (!participant.last_phone_call) return false;
    const callDate = new Date(participant.last_phone_call);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return callDate > thirtyDaysAgo;
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

