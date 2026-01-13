"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse, Task } from "./types";
import { motion } from "framer-motion";
import { logActivity } from "@/lib/activity-logger";

export default function ParticipantsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  // Use useMemo to get initial count from localStorage
  const initialCount = useMemo(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('presentTodayCount');
      if (saved) {
        const count = parseInt(saved, 10);
        if (!isNaN(count) && count >= 0) {
          return count;
        }
      }
    }
    return 0;
  }, []); // Only calculate once on mount

  const [presentTodayCount, setPresentTodayCount] = useState<number>(initialCount);
  
  // Use ref to track if we've loaded from localStorage to prevent resetting to 0
  const hasLoadedFromStorageRef = useRef(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isDoneTasksOpen, setIsDoneTasksOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userInitials, setUserInitials] = useState<string>('א');
  const [isHydrated, setIsHydrated] = useState(false);
  const fetchCountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingTasksRef = useRef(false);
  const isFetchingCountRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Add class to body to hide navbar and make full width
  useEffect(() => {
    document.body.classList.add('participants-page');
    return () => {
      document.body.classList.remove('participants-page');
    };
  }, []);

  // Mark as hydrated and load initials from localStorage
  useEffect(() => {
    // This runs only on client after hydration
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const savedInitials = localStorage.getItem('userInitials');
      if (savedInitials && savedInitials !== 'א') {
        setUserInitials(savedInitials);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount (after hydration)

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
    }, 150); // Reduced from 300ms to 150ms for faster response

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
        params.append("countOnly", "true"); // Request only count, not all records

        const url = `/participants/api?${params.toString()}`;
        const response = await fetch(url, {
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          // If countOnly is used, response will have 'count' property instead of 'participants'
          const count = data.count !== undefined ? data.count : (data.participants || []).length;
          // Only update if count is valid and different from current (to prevent unnecessary updates)
          if (count >= 0 && count !== presentTodayCount) {
            setPresentTodayCount(count);
            // Save to localStorage for persistence across page navigations
            if (typeof window !== 'undefined') {
              localStorage.setItem('presentTodayCount', count.toString());
              hasLoadedFromStorageRef.current = true;
            }
          }
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

  // Update initials when user data changes (in case data loads later)
  useEffect(() => {
    if (user) {
      // Extract initials from first_name and last_name from users table
      const firstName = (user.first_name || '').trim();
      const lastName = (user.last_name || '').trim();
      
      let initials = 'א'; // Default fallback
      
      if (firstName && lastName) {
        // Both names exist - take first letter of each
        initials = firstName.charAt(0) + lastName.charAt(0);
      } else if (firstName) {
        // Only first name exists
        initials = firstName.charAt(0);
      } else if (lastName) {
        // Only last name exists
        initials = lastName.charAt(0);
      } else if (user.email) {
        // Fallback to first letter of email
        initials = user.email.charAt(0).toUpperCase();
      }
      
      // Only update if we have valid initials (not default 'א') and it's different from current
      if (initials !== 'א' && initials !== userInitials) {
        setUserInitials(initials);
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('userInitials', initials);
        }
      }
    } else {
      // If no user, try to fetch it directly
      const fetchUserDirectly = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const { data: dbUser } = await supabase
              .from('users')
              .select('first_name, last_name, email')
              .eq('email', authUser.email)
              .single();
            
            if (dbUser) {
              setUser(dbUser);
              const firstName = (dbUser.first_name || '').trim();
              const lastName = (dbUser.last_name || '').trim();
              
              let initials = 'א';
              if (firstName && lastName) {
                initials = firstName.charAt(0) + lastName.charAt(0);
              } else if (firstName) {
                initials = firstName.charAt(0);
              } else if (lastName) {
                initials = lastName.charAt(0);
              }
              
              if (initials !== 'א' && initials !== userInitials) {
                setUserInitials(initials);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('userInitials', initials);
                }
              }
            }
          }
        } catch (error) {
          // Silent fail
        }
      };
      
      fetchUserDirectly();
    }
  }, [user, supabase]);

  // Use debounced search for fetching participants
  const fetchParticipantsDebounced = useCallback(async () => {
    // Only fetch if search is active
    if (!isSearchActive) {
      setParticipants([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel previous request if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    // Prevent duplicate concurrent requests
    if (isFetchingParticipantsRef.current) {
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    isFetchingParticipantsRef.current = true;
    // Don't show loading immediately - keep previous results visible for better UX
    // Only show loading if we don't have any participants yet
    if (participants.length === 0) {
      setLoading(true);
    }
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
        cache: 'no-store',
        signal: abortController.signal
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
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "שגיאה";
      setError(errorMessage);
      console.error("Error fetching participants:", err);
    } finally {
      setLoading(false);
      isFetchingParticipantsRef.current = false;
      // Clear abort controller if this was the current request
      if (searchAbortControllerRef.current === abortController) {
        searchAbortControllerRef.current = null;
      }
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

    // Reduced debounce for faster response
    fetchParticipantsTimeoutRef.current = setTimeout(() => {
      lastFetchedSearchRef.current = debouncedSearch;
      lastFetchedIsSearchActiveRef.current = isSearchActive;
      fetchParticipantsDebounced();
    }, 10); // Reduced from 50ms to 10ms

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
        
        // Fetch user data from users table
        if (isMounted) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (authUser && isMounted) {
            // Fetch user data from users table
            const { data: dbUser, error: dbError } = await supabase
              .from('users')
              .select('first_name, last_name, email')
              .eq('email', authUser.email)
              .single();
            
            // Use dbUser if available, otherwise fallback to authUser
            const userData = dbUser || authUser;
            setUser(userData);
            
            // Extract initials from first_name and last_name from users table
            // Priority: dbUser (from users table) > userData
            const firstName = (dbUser?.first_name || '').trim();
            const lastName = (dbUser?.last_name || '').trim();
            
            let initials = 'א'; // Default fallback
            
            if (firstName && lastName) {
              // Both names exist - take first letter of each
              initials = firstName.charAt(0) + lastName.charAt(0);
            } else if (firstName) {
              // Only first name exists
              initials = firstName.charAt(0);
            } else if (lastName) {
              // Only last name exists
              initials = lastName.charAt(0);
            } else if (userData?.email) {
              // Fallback to first letter of email
              initials = userData.email.charAt(0).toUpperCase();
            }
            
            // Only update if we have valid initials (not default 'א') and it's different from current
            if (initials !== 'א' && initials !== userInitials) {
              setUserInitials(initials);
              // Save to localStorage for persistence across page navigations
              if (typeof window !== 'undefined') {
                localStorage.setItem('userInitials', initials);
              }
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
      
      // Get current user info for optimistic update
      let userId: string | null = null;
      let doneByUser: { id: string; first_name: string; last_name: string } | null = null;
      
      if (newStatus === 'done') {
        // Get user ID and name
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('email', authUser.email)
            .single();
          if (dbUser) {
            userId = dbUser.id;
            // Create done_by_user object for optimistic update
            const firstName = (dbUser.first_name || '').trim();
            const lastName = (dbUser.last_name || '').trim();
            if (firstName || lastName) {
              doneByUser = {
                id: dbUser.id,
                first_name: firstName,
                last_name: lastName
              };
            }
          }
        }
      }
      
      // Optimistic update with done_by_user info
      const updatedTasks = tasks.map((t) => {
        if (t.id === task.id) {
          if (newStatus === 'done') {
            return {
              ...t,
              status: newStatus,
              done_by: userId,
              done_by_user: doneByUser
            };
          } else {
            return {
              ...t,
              status: newStatus,
              done_by: null,
              done_by_user: null
            };
          }
        }
        return t;
      });
      setTasks(updatedTasks);

      const response = await fetch("/tasks/api", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
          participant_id: task.participant_id,
          done_by: newStatus === 'done' ? userId : null
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      // Only refetch if not already fetching to get the latest data from server
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

      // Log activity
      const participant = participants.find(p => p.id === participantId);
      if (participant) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', authUser.email)
            .single();
          
          if (dbUser) {
            await logActivity({
              user_id: dbUser.id,
              activity_type: newAttendance ? 'attendance_marked' : 'attendance_removed',
              participant_id: participantId,
              participant_name: participant.full_name,
              description: newAttendance 
                ? `נוכחות ${participant.full_name}`
                : `הוסרה נוכחות ${participant.full_name}`,
            });
          }
        }
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
            suppressHydrationWarning
          >
            {isHydrated ? userInitials : 'א'}
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

      {/* Loading - show skeleton or minimal indicator */}
      {loading && isSearchActive && participants.length === 0 && (
        <div className={styles.loading} style={{ opacity: 0.5 }}>טוען...</div>
      )}

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
                    {task.participant_id && (() => {
                      const participant = participants.find(p => p.id === task.participant_id);
                      const phoneNumber = participant?.phone;
                      if (phoneNumber) {
                        // Remove any non-digit characters except + for international numbers
                        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
                        return (
                          <a 
                            href={`tel:${cleanPhone}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Log phone call activity
                              const { data: { user: authUser } } = await supabase.auth.getUser();
                              if (authUser) {
                                const { data: dbUser } = await supabase
                                  .from('users')
                                  .select('id')
                                  .eq('email', authUser.email)
                                  .single();
                                
                                if (dbUser && participant) {
                                  await logActivity({
                                    user_id: dbUser.id,
                                    activity_type: 'phone_call',
                                    participant_id: participant.id,
                                    participant_name: participant.full_name,
                                    description: `שיחת טלפון ${participant.full_name}`,
                                  });
                                }
                              }
                              // On desktop, try to open phone app or show number
                              if (typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                                // Desktop - could show a prompt or copy to clipboard
                                // For now, just let the tel: link work (some systems have phone apps)
                              }
                            }}
                            className={styles.phoneLink}
                            aria-label={`התקשר ל-${participant?.full_name || 'פונה'}`}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                          </a>
                        );
                      }
                      return (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4D58D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      );
                    })()}
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
                  {tasks.filter(t => t.status === 'done').map(task => {
                    const doneByName = task.done_by_user 
                      ? `${task.done_by_user.first_name || ''} ${task.done_by_user.last_name || ''}`.trim()
                      : null;
                    return (
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
                        {doneByName && (
                          <div className={styles.taskDoneBy}>
                            <span>בוצע ע&quot;י {doneByName}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
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
