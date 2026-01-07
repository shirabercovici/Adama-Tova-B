"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse, Task } from "./types";
import { motion } from "framer-motion";

export default function ParticipantsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [presentTodayCount, setPresentTodayCount] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isDoneTasksOpen, setIsDoneTasksOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userInitials, setUserInitials] = useState<string>("");
  const fetchCountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingTasksRef = useRef(false);
  const isFetchingCountRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);

  // Add class to body to hide navbar and make full width
  useEffect(() => {
    document.body.classList.add('participants-page');
    return () => {
      document.body.classList.remove('participants-page');
    };
  }, []);

  // Debounce search to avoid too many API calls
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const isFetchingParticipantsRef = useRef(false);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // Wait 300ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Track last fetch time to prevent too frequent calls
  const lastCountFetchTimeRef = useRef<number>(0);
  const lastCountFetchDateRef = useRef<string>("");
  const countFetchPromiseRef = useRef<Promise<void> | null>(null);
  const COUNT_FETCH_COOLDOWN = 3000; // Minimum 3 seconds between fetches

  // Fetch count of participants present today (independent of search)
  const fetchPresentTodayCount = useCallback(async () => {
    const now = Date.now();
    
    // If there's already a fetch in progress, return the existing promise
    if (countFetchPromiseRef.current) {
      return countFetchPromiseRef.current;
    }

    // Prevent duplicate concurrent requests
    if (isFetchingCountRef.current) {
      return;
    }

    // Calculate today's date string
    const nowDate = new Date();
    const today = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));
    const todayStr = today.toISOString().split("T")[0];

    // If we already fetched for today and it's within cooldown, skip
    if (
      lastCountFetchDateRef.current === todayStr &&
      now - lastCountFetchTimeRef.current < COUNT_FETCH_COOLDOWN
    ) {
      return Promise.resolve();
    }

    isFetchingCountRef.current = true;
    lastCountFetchTimeRef.current = now;
    lastCountFetchDateRef.current = todayStr;
    
    // Create a promise and store it to prevent concurrent calls
    countFetchPromiseRef.current = (async () => {
      try {
        const params = new URLSearchParams();
        params.append("filterLastAttendance", "today");
        params.append("filterArchived", "active");

        const url = `/participants/api?${params.toString()}`;
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
      } finally {
        isFetchingCountRef.current = false;
        countFetchPromiseRef.current = null;
      }
    })();

    return countFetchPromiseRef.current;
  }, []);

  // Track last fetch time for tasks
  const lastTasksFetchTimeRef = useRef<number>(0);
  const tasksFetchPromiseRef = useRef<Promise<void> | null>(null);
  const TASKS_FETCH_COOLDOWN = 3000; // Minimum 3 seconds between fetches

  const fetchTasks = useCallback(async () => {
    const now = Date.now();
    
    // If there's already a fetch in progress, return the existing promise
    if (tasksFetchPromiseRef.current) {
      return tasksFetchPromiseRef.current;
    }

    // Prevent duplicate concurrent requests
    if (isFetchingTasksRef.current) {
      return;
    }

    // Prevent too frequent calls (cooldown)
    if (now - lastTasksFetchTimeRef.current < TASKS_FETCH_COOLDOWN) {
      return Promise.resolve();
    }

    isFetchingTasksRef.current = true;
    lastTasksFetchTimeRef.current = now;
    
    // Create a promise and store it to prevent concurrent calls
    tasksFetchPromiseRef.current = (async () => {
      try {
        const response = await fetch("/tasks/api", {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.tasks) {
            setTasks(data.tasks);
          }
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        isFetchingTasksRef.current = false;
        tasksFetchPromiseRef.current = null;
      }
    })();

    return tasksFetchPromiseRef.current;
  }, []);

  // Use debounced search for fetching participants
  const fetchParticipantsDebounced = useCallback(async () => {
    // Only fetch if search is active
    if (!isSearchActive) {
      setParticipants([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Prevent duplicate concurrent requests
    if (isFetchingParticipantsRef.current) {
      return;
    }

    isFetchingParticipantsRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Only show active participants
      params.append("filterArchived", "active");
      
      // If there's a debounced search query, add it
      if (debouncedSearch && debouncedSearch.trim() !== "") {
        params.append("search", debouncedSearch.trim());
      }

      const response = await fetch(`/participants/api?${params.toString()}`, {
        cache: 'no-store'
      });
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
      isFetchingParticipantsRef.current = false;
    }
  }, [isSearchActive, debouncedSearch]);

  // Track last fetched values to prevent unnecessary refetches
  const lastFetchedSearchRef = useRef<string>("");
  const lastFetchedIsSearchActiveRef = useRef<boolean>(false);
  const fetchParticipantsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending fetch
    if (fetchParticipantsTimeoutRef.current) {
      clearTimeout(fetchParticipantsTimeoutRef.current);
    }

    // Only fetch if search state actually changed
    if (
      debouncedSearch === lastFetchedSearchRef.current &&
      isSearchActive === lastFetchedIsSearchActiveRef.current
    ) {
      return;
    }

    // Debounce the fetch call slightly to batch rapid changes
    fetchParticipantsTimeoutRef.current = setTimeout(() => {
      lastFetchedSearchRef.current = debouncedSearch;
      lastFetchedIsSearchActiveRef.current = isSearchActive;
      fetchParticipantsDebounced();
    }, 50);

    return () => {
      if (fetchParticipantsTimeoutRef.current) {
        clearTimeout(fetchParticipantsTimeoutRef.current);
      }
    };
  }, [fetchParticipantsDebounced, debouncedSearch, isSearchActive]);

  // Fetch initial data only once on mount
  useEffect(() => {
    // Prevent multiple fetches even if effect runs multiple times (e.g., in Strict Mode)
    if (hasFetchedInitialDataRef.current) {
      return;
    }
    hasFetchedInitialDataRef.current = true;
    
    let isMounted = true;
    let fetchPromise: Promise<void> | null = null;
    
    const fetchInitialData = async () => {
      // Prevent concurrent fetches
      if (fetchPromise) {
        return fetchPromise;
      }
      
      fetchPromise = (async () => {
        // Fetch count and tasks in parallel
        await Promise.all([
          fetchPresentTodayCount(),
          fetchTasks()
        ]);
        
        // Fetch user data
        if (isMounted) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && isMounted) {
            const { data: dbUser } = await supabase
              .from('users')
              .select('*')
              .eq('email', authUser.email)
              .single();
            
            if (isMounted) {
              const userData = dbUser || authUser;
              setUser(userData);
              
              // Extract initials from first_name and last_name
              const firstName = userData.first_name || '';
              const lastName = userData.last_name || '';
              const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'א';
              setUserInitials(initials);
            }
          }
        }
      })();
      
      return fetchPromise;
    };
    
    fetchInitialData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Handle search input focus/blur
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  const handleSearchBlur = () => {
    // Don't deactivate if there's text in the search or participants are shown
    if (search.trim() === "" && participants.length === 0) {
      setIsSearchActive(false);
    }
  };

  // Handle close search (X button)
  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearch("");
    setParticipants([]);
  };

  // Keep search active if there's text
  useEffect(() => {
    if (search.trim() !== "") {
      setIsSearchActive(true);
    }
  }, [search]);

  const handleTaskToggle = async (task: Task) => {
    // Prevent multiple simultaneous toggles
    if (isFetchingTasksRef.current) {
      return;
    }

    try {
      // Optimistic update
      const newStatus: "open" | "done" = task.status === 'done' ? 'open' : 'done';
      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      );
      setTasks(updatedTasks);

      const response = await fetch("/tasks/api", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
          participant_id: task.participant_id
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      // Only refetch if not already fetching
      if (!isFetchingTasksRef.current) {
        fetchTasks();
      }
    } catch (err) {
      console.error("Error toggling task:", err);
      // Revert optimistic update by re-fetching (only if not already fetching)
      if (!isFetchingTasksRef.current) {
        fetchTasks();
      }
    }
  };

  const handleMarkAttendance = async (participantId: string, currentAttendance: string | null) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const attendedToday = currentAttendance && currentAttendance === today;

      // If already attended today, remove attendance (set to null)
      // Otherwise, mark as attended today
      const newAttendance = attendedToday ? null : today;

      // Optimistic update - update UI immediately
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participantId
            ? { ...p, last_attendance: newAttendance }
            : p
        )
      );

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
        // Revert optimistic update on error
        setParticipants(prevParticipants =>
          prevParticipants.map(p =>
            p.id === participantId
              ? { ...p, last_attendance: currentAttendance }
              : p
          )
        );
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || `Failed to update attendance: ${response.status}`;
        console.error("API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      // Refresh count after a delay to ensure DB is updated
      // Use debounce to prevent multiple rapid calls
      if (fetchCountTimeoutRef.current) {
        clearTimeout(fetchCountTimeoutRef.current);
      }
      fetchCountTimeoutRef.current = setTimeout(async () => {
        await fetchPresentTodayCount();
      }, 500);

      // Refresh participants list if there's a search query to ensure consistency
      if (search && search.trim() !== "") {
        fetchParticipantsDebounced();
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
      <motion.main 
    className={styles.container}
    initial={{ opacity: 0, x: 50 }} // מתחיל קצת מהצד ובשקיפות
    animate={{ opacity: 1, x: 0 }}  // חוזר למרכז ונהיה גלוי
    transition={{ duration: 0.6, ease: "easeOut" }} // תנועה חלקה
      >
      {/* Navbar */}
      <div className={styles.navbarWrapper}>
        {/* <Navbar /> */}
      </div>
      {/* Purple Header */}
      <div className={styles.purpleHeader}>
        <div className={styles.headerTop}>
          <div 
            className={styles.headerButton}
            onClick={() => router.push('/profile')}
            style={{ cursor: 'pointer' }}
          >
            {userInitials || "א"}
          </div>
          <div 
            className={styles.logo}
            onClick={() => router.push('/participants')}
            style={{ cursor: 'pointer' }}
          >
            <Image
              src="/adami-logo.png"
              alt="אדממי"
              width={83}
              height={19}
              priority
              className={styles.logoImage}
            />
          </div>
        </div>
        <div className={`${styles.headerCenter} ${isSearchActive ? styles.hidden : ''}`}>
          {!isSearchActive && !isTasksOpen && (
            <>
              <div className={styles.headerNumber}>{presentTodayCount}</div>
              <div className={styles.headerSubtitle}>פונים נוכחים במתחם</div>
            </>
          )}
        </div>
        <div className={styles.headerSearchBar}>
          <button
            type="button"
            onClick={isSearchActive ? handleCloseSearch : undefined}
            className={styles.searchIconButton}
            style={isSearchActive ? { background: 'transparent', border: 'none', boxShadow: 'none' } : undefined}
            aria-label={isSearchActive ? "סגור חיפוש" : "חיפוש"}
          >
            {isSearchActive ? (
              <svg
                width="27.5"
                height="27.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="3" />
              </svg>
            ) : (
              <svg
                width="27.5"
                height="27.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" strokeWidth="3" />
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className={styles.searchDivider}></div>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              placeholder="חיפוש פונה"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={styles.headerSearchInput}
            />
          </div>
          <div className={styles.addPersonDivider}></div>
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
              <circle cx="9" cy="7" r="4" stroke="currentColor" fill="none" strokeWidth="3" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" fill="none" strokeWidth="3" />
              {/* Plus sign */}
              <path d="M18 9v6M15 12h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading - only show when search is active */}
      {loading && isSearchActive && <div className={styles.loading}>טוען...</div>}

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <div>שגיאה: {error}</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && isSearchActive && participants.length === 0 && (
        <div className={styles.empty}>לא נמצאו פונים</div>
      )}

      {/* Participants List - Show when search is active */}
      {!loading && !error && isSearchActive && participants.length > 0 && (
        <div className={styles.participantsList}>
          {/* List Header */}
          <div className={styles.listHeader}>
            <div className={styles.headerCell}>
              <div className={styles.headerName}>שם</div>
            </div>
            <div className={styles.headerCellLast}>
              <div className={styles.headerAttendance}>נוכחות</div>
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
                      {participant.bereavement_detail && (
                        <>
                          <span className={styles.bereavementDetail}>{participant.bereavement_detail}</span>
                          {participant.phone && <span className={styles.detailSeparator}> | </span>}
                        </>
                      )}
                      {participant.phone && (
                        <span className={styles.participantPhone}>{participant.phone}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks Drawer - Show only when NOT searching */}
      {!isSearchActive && (
        <div className={`${styles.tasksDrawer} ${isTasksOpen ? styles.open : styles.closed}`}>
          <div className={styles.tasksHandle} onClick={() => setIsTasksOpen(!isTasksOpen)}>
            <div className={styles.tasksTitle}>
              <span>יש לך זמן לדבר?</span>
              <svg
                className={`${styles.chevron} ${isTasksOpen ? styles.open : ''}`}
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                {isTasksOpen ? (
                  <polyline points="18 15 12 9 6 15"></polyline>
                ) : (
                  <polyline points="6 9 12 15 18 9"></polyline>
                )}
              </svg>
            </div>
          </div>

          <div className={styles.tasksContent}>
            <ul className={styles.taskList}>
              {tasks.filter(t => t.status !== 'done').map(task => (
                <li key={task.id} className={styles.taskItem}>
                  <div className={styles.taskItemContent}>
                    <input
                      type="checkbox"
                      className={styles.taskCheckbox}
                      checked={task.status === 'done'}
                      onChange={() => handleTaskToggle(task)}
                    />
                    <span className={styles.taskText}>{task.title}</span>
                  </div>
                  <div className={styles.taskItemAction}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </div>
                </li>
              ))}
            </ul>

            {/* Done Section Header */}
            <div className={styles.doneSection}>
              <div className={styles.doneHeader} onClick={() => setIsDoneTasksOpen(!isDoneTasksOpen)}>
                <span>בוצע</span>
                <svg
                  className={`${styles.chevron} ${isDoneTasksOpen ? styles.open : ''}`}
                  width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {/* Done tasks list */}
              {isDoneTasksOpen && (
                <ul className={styles.taskList}>
                  {tasks.filter(t => t.status === 'done').map(task => (
                    <li key={task.id} className={styles.taskItem} style={{ opacity: 0.7 }}>
                      <div className={styles.taskItemContent}>
                        <input
                          type="checkbox"
                          className={styles.taskCheckbox}
                          checked={task.status === 'done'}
                          onChange={() => handleTaskToggle(task)}
                        />
                        <span className={styles.taskText} style={{ textDecoration: 'line-through' }}>{task.title}</span>
                      </div>
                    </li>
                  ))}
                  {tasks.filter(t => t.status === 'done').length === 0 && (
                    <li className={styles.taskItem} style={{ borderBottom: 'none', justifyContent: 'center' }}>
                      <span className={styles.taskText} style={{ fontSize: '0.9rem', opacity: 0.5 }}>אין משימות שבוצעו</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}
