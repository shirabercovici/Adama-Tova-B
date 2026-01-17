"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import SearchBarWithAdd from "@/lib/components/SearchBarWithAdd";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse, Task } from "./types";
import { logActivity } from "@/lib/activity-logger";

export default function ParticipantsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, will load from cache first
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isDoneTasksOpen, setIsDoneTasksOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string>('א');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStatusUpdatesOpen, setIsStatusUpdatesOpen] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<any[]>([]);
  const isFetchingStatusUpdatesRef = useRef(false);
  const isFetchingTasksRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedFromCacheRef = useRef(false);

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
      
      // Load participants from cache FIRST for instant display (most important feature)
      // This MUST be synchronous and happen immediately - no delays
      try {
        const cachedParticipants = localStorage.getItem('participants_cache');
        if (cachedParticipants) {
          const { participants: cachedParticipantsData, timestamp, filterType } = JSON.parse(cachedParticipants);
          // Use cache if it's less than 5 minutes old (increased for better UX)
          // Always use cache if available, even if slightly old - better than loading
          if (cachedParticipantsData && Array.isArray(cachedParticipantsData) && 
              Date.now() - timestamp < 5 * 60 * 1000 && 
              filterType === 'active') {
            // Set immediately - no async, no delays
            setParticipants(cachedParticipantsData);
            setLoading(false); // We have cached data, no loading needed
            hasLoadedFromCacheRef.current = true;
          } else if (cachedParticipantsData && Array.isArray(cachedParticipantsData) && 
                     filterType === 'active') {
            // Even if cache is old, use it for instant display - refresh in background
            setParticipants(cachedParticipantsData);
            setLoading(false);
            hasLoadedFromCacheRef.current = true;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      
      // Load tasks from cache for instant display
      try {
        const cachedTasks = localStorage.getItem('tasks_cache');
        if (cachedTasks) {
          const { tasks: cachedTasksData, timestamp } = JSON.parse(cachedTasks);
          // Use cache if it's less than 5 minutes old
          if (cachedTasksData && Date.now() - timestamp < 5 * 60 * 1000) {
            setTasks(cachedTasksData);
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
      
      // Start fetching participants immediately if we don't have cached data
      // This is the most important feature - load it ASAP
      if (!hasLoadedFromCacheRef.current) {
        // No cache - trigger fetch immediately (will be handled by useEffect)
        setDebouncedSearch("");
      }
      
      // Preload tasks immediately in the background (without waiting for other data)
      // This ensures tasks are ready when user clicks on them
      fetchTasks().catch(err => {
        // Silently handle errors - cache will be used if available
        console.error("Background tasks preload failed:", err);
      });
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


  // Track last fetch time for tasks
  const lastTasksFetchTimeRef = useRef<number>(0);
  const tasksFetchPromiseRef = useRef<Promise<void> | null>(null);
  const TASKS_FETCH_COOLDOWN = 1000; // Reduced to 1 second for better responsiveness

  const fetchTasks = useCallback(async (force = false) => {
    const now = Date.now();

    // If there's already a fetch in progress, return the existing promise
    if (tasksFetchPromiseRef.current && !force) {
      return tasksFetchPromiseRef.current;
    }

    // Prevent duplicate concurrent requests
    if (isFetchingTasksRef.current && !force) {
      return;
    }

    // Prevent too frequent calls (cooldown) - but allow force refresh
    if (!force && now - lastTasksFetchTimeRef.current < TASKS_FETCH_COOLDOWN) {
      return Promise.resolve();
    }

    isFetchingTasksRef.current = true;
    lastTasksFetchTimeRef.current = now;

    // Create a promise and store it to prevent concurrent calls
    tasksFetchPromiseRef.current = (async () => {
      try {
        const response = await fetch("/tasks/api", {
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.tasks) {
            setTasks(data.tasks);
            // Cache tasks in localStorage for instant display on next load
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('tasks_cache', JSON.stringify({
                  tasks: data.tasks,
                  timestamp: Date.now()
                }));
              } catch (e) {
                // localStorage might be full, ignore
              }
            }
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

  // Helper function to check if user is a manager
  const isManager = useCallback(() => {
    return userRole === "מנהל.ת" || userRole === "מנהל" || userRole === "מנהלת" || (userRole && userRole.includes("מנהל"));
  }, [userRole]);

  // Fetch status updates for managers
  const fetchStatusUpdates = useCallback(async () => {
    // Only fetch if user is a manager
    if (!isManager()) {
      return;
    }

    // Prevent duplicate concurrent requests
    if (isFetchingStatusUpdatesRef.current) {
      return;
    }

    isFetchingStatusUpdatesRef.current = true;

    try {
      const response = await fetch("/api/activities?activity_type=status_update&limit=50", {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.activities) {
          setStatusUpdates(data.activities);
        }
      }
    } catch (err) {
      console.error("Error fetching status updates:", err);
    } finally {
      isFetchingStatusUpdatesRef.current = false;
    }
  }, [isManager]);

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
      setUserInitials((currentInitials) => {
        if (initials !== 'א' && initials !== currentInitials) {
          // Save to localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('userInitials', initials);
          }
          return initials;
        }
        return currentInitials;
      });
    } else {
      // If no user, try to fetch it directly
      const fetchUserDirectly = async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const { data: dbUser } = await supabase
              .from('users')
              .select('first_name, last_name, email, role')
              .eq('email', authUser.email)
              .single();

            if (dbUser) {
              setUser(dbUser);
              if (dbUser.role) {
                setUserRole(dbUser.role);
              }
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

              // Use functional update to avoid dependency on userInitials
              setUserInitials((currentInitials) => {
                if (initials !== 'א' && initials !== currentInitials) {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('userInitials', initials);
                  }
                  return initials;
                }
                return currentInitials;
              });
            }
          }
        } catch (error) {
          // Silent fail
        }
      };

      fetchUserDirectly();
    }
  }, [user, supabase]); // userInitials is updated via functional setState, no need in deps

  // Use debounced search for fetching participants
  const fetchParticipantsDebounced = useCallback(async () => {

    // Cancel previous request if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
      searchAbortControllerRef.current = null;
    }

    // Reset fetching flag if it's stuck
    if (isFetchingParticipantsRef.current) {
      // If we've been fetching for too long, reset
      isFetchingParticipantsRef.current = false;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    isFetchingParticipantsRef.current = true;
    // Don't show loading if we have cached participants - instant experience
    // Only show loading if we don't have any participants yet
    setParticipants((currentParticipants) => {
      if (currentParticipants.length === 0 && !hasLoadedFromCacheRef.current) {
        setLoading(true);
      }
      return currentParticipants;
    });
    setError(null);
    try {
      const params = new URLSearchParams();
      // Show all participants (including archived)
      if (debouncedSearch && debouncedSearch.trim() !== "") {
        params.append("filterArchived", "all");
        params.append("search", debouncedSearch.trim());
      } else {
        params.append("filterArchived", "all");
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
      const fetchedParticipants = data.participants || [];
      setParticipants(fetchedParticipants);
      setError(null);
      
      // Save to cache for instant loading next time (most important feature)
      if (typeof window !== 'undefined') {
        try {
          const filterType = (debouncedSearch && debouncedSearch.trim() !== "") ? 'search' : 'active';
          localStorage.setItem('participants_cache', JSON.stringify({
            participants: fetchedParticipants,
            timestamp: Date.now(),
            filterType: filterType
          }));
        } catch (e) {
          // Ignore cache errors (e.g., quota exceeded)
        }
      }
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
  }, [debouncedSearch]);

  // Track last fetched values to prevent unnecessary refetches
  const lastFetchedSearchRef = useRef<string>("");
  const fetchParticipantsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending fetch
    if (fetchParticipantsTimeoutRef.current) {
      clearTimeout(fetchParticipantsTimeoutRef.current);
    }

    // Only fetch if search query changed
    if (debouncedSearch !== lastFetchedSearchRef.current) {
      lastFetchedSearchRef.current = debouncedSearch;
      // For initial load (empty search), fetch immediately without debounce
      // For search queries, use small debounce
      if (debouncedSearch === "" && participants.length === 0) {
        // Initial load - fetch immediately for fastest experience
        fetchParticipantsDebounced();
      } else {
        // Search query change - small debounce
        fetchParticipantsTimeoutRef.current = setTimeout(() => {
          fetchParticipantsDebounced();
        }, 10);
      }
    }

    return () => {
      if (fetchParticipantsTimeoutRef.current) {
        clearTimeout(fetchParticipantsTimeoutRef.current);
      }
    };
  }, [debouncedSearch, fetchParticipantsDebounced, participants.length]);


  // Fetch initial data only once on mount
  useEffect(() => {
    // Prevent multiple fetches even if effect runs multiple times (e.g., in Strict Mode)
    if (hasFetchedInitialDataRef.current) {
      return;
    }
    hasFetchedInitialDataRef.current = true;
    
    // If we already have participants from cache, don't show loading
    // Just refresh in background silently
    if (hasLoadedFromCacheRef.current && participants.length > 0) {
      // We have cached data, refresh silently in background
      // Don't set loading to true
    }

    let isMounted = true;
    let fetchPromise: Promise<void> | null = null;

    const fetchInitialData = async () => {
      // Prevent concurrent fetches
      if (fetchPromise) {
        return fetchPromise;
      }

      fetchPromise = (async () => {
        // If we have cached participants, refresh them silently in background
        // Don't block or show loading if we already have data
        if (hasLoadedFromCacheRef.current && participants.length > 0) {
          // Refresh in background - don't wait for it, don't block
          fetchParticipantsDebounced().catch(() => {
            // Silently fail - we have cached data
          });
          // Still fetch tasks and other data
          await fetchTasks();
        } else {
          // No cache - fetch participants FIRST (most important feature)
          const participantsPromise = fetchParticipantsDebounced();
          
          // Fetch tasks in parallel (not blocking participants)
          const tasksPromise = fetchTasks();
          
          // Wait for both but participants is priority
          await Promise.all([participantsPromise, tasksPromise]);
        }

        // Fetch status updates if user is a manager
        if (isMounted) {
          await fetchStatusUpdates();
        }

        // Fetch user data from users table
        if (isMounted) {
      const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser && isMounted) {
            // Fetch user data from users table
            const { data: dbUser, error: dbError } = await supabase
          .from('users')
              .select('first_name, last_name, email, role')
          .eq('email', authUser.email)
          .single();
        
            // Use dbUser if available, otherwise fallback to authUser
        const userData = dbUser || authUser;
        setUser(userData);
            // Set user role
            if (dbUser?.role) {
              setUserRole(dbUser.role);
            }

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
    // Check participants length via a ref to avoid dependency
    const currentParticipantsLength = participants.length;
    if (search.trim() === "" && currentParticipantsLength === 0) {
      setIsSearchActive(false);
    }
  };

  // Handle close search (X button)
  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearch("");
    // Update debouncedSearch immediately and reset ref to trigger refetch
    setDebouncedSearch("");
    lastFetchedSearchRef.current = "force-refetch"; // Set to different value to force change detection
    // The useEffect will detect the change and fetch the default list (active participants only)
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
              done_by_user: doneByUser,
              done_at: new Date().toISOString() // Set done_at for sorting
            };
          } else {
            return {
              ...t,
              status: newStatus,
              done_by: null,
              done_by_user: null,
              done_at: null
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

      // Don't refetch after successful toggle to avoid changing the order
      // The optimistic update already shows the correct state
      // Data will be refreshed on next manual refresh or when opening tasks next time
    } catch (err) {
      console.error("Error toggling task:", err);
      // Revert optimistic update by re-fetching (only if not already fetching)
      if (!isFetchingTasksRef.current) {
        fetchTasks(true); // Force refresh on error to revert changes
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
      <main className={styles.container}>
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
        <div className={styles.headerSearchBar}>
          <SearchBarWithAdd
              placeholder="חיפוש פונה"
            searchValue={search}
            onSearchChange={setSearch}
            onAddClick={() => router.push("/new-participant")}
            addButtonLabel="הוסף פונה חדש"
            searchBarLabel="חיפוש פונה"
            isSearchActive={isSearchActive}
            onSearchActiveChange={setIsSearchActive}
            onCloseSearch={handleCloseSearch}
            hasResults={participants.length > 0}
          />
        </div>
      </div>

      {/* Loading - show skeleton or minimal indicator */}
      {loading && participants.length === 0 && (
        <div className={styles.loading} style={{ opacity: 0.5 }}>טוען...</div>
      )}

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <div>שגיאה: {error}</div>
        </div>
      )}

      {/* Participants List - Always show */}
      {!loading && !error && (
        <div className={`${styles.participantsList} ${isSearchActive ? styles.searchActive : ''}`}>
          {/* List Header */}
          <div className={styles.listHeader}>
            <div className={styles.headerCell}>
              <div className={styles.headerName}>שם</div>
            </div>
            <div className={styles.headerCellLast}>
              <div className={styles.headerAttendance}>נוכחות</div>
            </div>
          </div>

          {participants.length > 0 ? (() => {
            // Sort participants by first name (first word in full_name)
            const sortedParticipants = [...participants].sort((a, b) => {
              const aFirstName = (a.full_name.split(' ')[0] || '').trim();
              const bFirstName = (b.full_name.split(' ')[0] || '').trim();
              return aFirstName.localeCompare(bFirstName, 'he');
            });

            // Group by first letter of first name
            const groupedParticipants = sortedParticipants.reduce((groups, participant) => {
              const firstName = (participant.full_name.split(' ')[0] || '').trim();
              const firstLetter = firstName.charAt(0) || 'א';
              if (!groups[firstLetter]) {
                groups[firstLetter] = [];
              }
              groups[firstLetter].push(participant);
              return groups;
            }, {} as Record<string, typeof sortedParticipants>);

            // Get sorted letters
            const sortedLetters = Object.keys(groupedParticipants).sort((a, b) => 
              a.localeCompare(b, 'he')
            );

            return sortedLetters.map((letter) => {
              const letterParticipants = groupedParticipants[letter];
              const lastIndex = letterParticipants.length - 1;
              
              return (
                <div key={letter} className={styles.letterGroup}>
                  {/* Letter Header */}
                  <div className={styles.letterHeader}>
                    {letter}
                  </div>
                  {/* Participants for this letter */}
                  {letterParticipants.map((participant, index) => {
                    const attendedToday = isToday(participant.last_attendance);
                    const isLast = index === lastIndex;
                    
                    return (
                      <div
                        key={participant.id}
                        className={`${styles.participantCard} ${participant.is_archived ? styles.archived : ""} ${isLast ? styles.lastParticipant : ""}`}
                      onClick={(e) => {
                        // Only navigate if click was not on checkbox
                        if (!(e.target as HTMLElement).closest(`.${styles.attendanceCheckboxContainer}`)) {
                          router.push(`/participant-card?id=${participant.id}`);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Attendance Checkbox Container */}
                      <div className={styles.attendanceCheckboxContainer}>
                        {participant.is_archived ? (
                          <div className={styles.archiveIcon}>
                            <Image
                              src="/icons/arcive.svg"
                              alt="ארכיון"
                              width={27}
                              height={27}
                            />
                          </div>
                        ) : (
                          <div className={styles.attendanceCheckbox}>
                            <input
                              type="checkbox"
                              checked={attendedToday}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMarkAttendance(participant.id, participant.last_attendance);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className={styles.checkbox}
                            />
                          </div>
                        )}
                      </div>

                      {/* Name, Bereavement Detail and Phone */}
                      <div
                        className={styles.participantInfo}
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
              );
            });
          })() : (
            <div className={styles.emptyContainer}>
              <Image
                src="/icons/noponim.png"
                alt="לא נמצאו פונים"
                width={200}
                height={200}
                className={styles.emptyImage}
              />
              <div className={styles.empty}>לא נמצאו פונים</div>
            </div>
          )}
        </div>
      )}

      {/* Status Updates Drawer - Show only for managers when NOT searching */}
      {!isSearchActive && isManager() && (
        <div className={`${styles.statusUpdatesDrawer} ${isStatusUpdatesOpen ? styles.open : styles.closed}`}>
          <div className={styles.tasksLine}>
            <svg width="100%" height="1" viewBox="0 0 440 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M440 0.5L-4.76837e-06 0.5" stroke="#4D58D8" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.tasksHandle} onClick={() => setIsStatusUpdatesOpen(!isStatusUpdatesOpen)}>
            <div className={styles.tasksTitle}>
              <div className={styles.tasksArrow}>
                {isStatusUpdatesOpen ? (
                  <svg width="21" height="17" viewBox="0 0 21 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.50024 1.50024L8.78526 13.6419C9.56207 14.9366 11.4384 14.9366 12.2152 13.6419L19.5002 1.50024" stroke="#4D58D8" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="21" height="17" viewBox="0 0 21 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.5002 14.6127L12.2152 2.47098C11.4384 1.1763 9.56206 1.1763 8.78526 2.47098L1.50024 14.6127" stroke="#4D58D8" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <span className={styles.tasksTitleText}>עדכוני סטטוס</span>
            </div>
          </div>

          <div className={styles.tasksContent}>
            <ul className={styles.taskList}>
              {statusUpdates.length > 0 ? (
                statusUpdates.map((update, index) => {
                  const colonIndex = update.description.indexOf(':');
                  const participantName = colonIndex !== -1 ? update.description.substring(0, colonIndex).replace('עדכון סטטוס ', '') : '';
                  const updateText = colonIndex !== -1 ? update.description.substring(colonIndex + 1).trim() : update.description;
                  const updateDate = new Date(update.created_at);
                  const formattedDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}`;
                  
                  return (
                    <li key={update.id || index} className={styles.statusUpdateItem}>
                      <div className={styles.statusUpdateContent}>
                        <div className={styles.statusUpdateHeader}>
                          <span className={styles.statusUpdateParticipant}>{participantName}</span>
                          <span className={styles.statusUpdateDate}>{formattedDate}</span>
                        </div>
                        <div className={styles.statusUpdateText}>{updateText}</div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className={styles.taskItem} style={{ borderBottom: 'none', justifyContent: 'center' }}>
                  <span className={styles.taskText} style={{ fontSize: '0.9rem', opacity: 0.5 }}>אין עדכוני סטטוס</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Tasks Drawer - Show only when NOT searching */}
      {!isSearchActive && (
        <div className={`${styles.tasksDrawer} ${isTasksOpen ? styles.open : styles.closed}`}>
          <div className={styles.tasksLine}>
            <svg width="100%" height="1" viewBox="0 0 440 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M440 0.5L-4.76837e-06 0.5" stroke="#4D58D8" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={`${styles.tasksHandle} ${isTasksOpen ? styles.open : ''}`} onClick={() => setIsTasksOpen(!isTasksOpen)}>
            <div className={styles.tasksTitle}>
              <div className={styles.tasksTopLine}></div>
              <span className={styles.tasksTitleText}>מטלות</span>
            </div>
          </div>
          {isTasksOpen && (
            <div className={styles.tasksDivider}></div>
          )}
          <div className={styles.tasksContent}>
            <ul className={styles.taskList}>
              {tasks.filter(t => t.status !== 'done').map(task => (
                <li key={task.id} className={styles.taskItem}>
                  <div className={styles.taskItemContent}>
                    <input
                      type="checkbox"
                      className={styles.taskCheckbox}
                      checked={task.status === 'done'}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleTaskToggle(task);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    />
                    <span className={styles.taskText}>
                      {(() => {
                        const title = task.title;
                        const prefix = "להתקשר ל";
                        if (title.startsWith(prefix)) {
                          const participantName = title.substring(prefix.length);
                          return (
                            <>
                              <span style={{ fontWeight: 400 }}>{prefix}</span>
                              <span style={{ 
                                color: 'var(--Blue-Adamami, #4D58D8)',
                                fontFamily: 'EditorSans_PRO, sans-serif',
                                fontSize: '1.5rem',
                                fontStyle: 'italic',
                                fontWeight: 600,
                                lineHeight: '98%'
                              }}>{participantName}</span>
                            </>
                          );
                        }
                        return title;
                      })()}
                    </span>
                  </div>
                  <div className={styles.taskItemAction}>
                    <div className={styles.phoneIconWrapper}>
                    {task.participant_id && (() => {
                      const phoneNumber = task.participant_phone;
                      const participantName = task.participant_name || 'פונה';
                      
                      const phoneIcon = (
                        <svg 
                          width="27" 
                          height="27" 
                          viewBox="0 0 27 27" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ 
                            width: '1.5rem', 
                            height: '1.5rem',
                            display: 'block'
                          }}
                        >
                          <path 
                            d="M10.4756 18.8141C16.1083 24.2491 19.3586 24.9427 21.5821 25.0403C22.7576 25.092 23.9128 24.5955 24.7297 23.7488C26.6493 21.7595 25.9475 18.4805 23.2645 17.8146C21.2482 17.3141 19.1218 17.0088 17.7467 17.4284C14.4358 18.4387 10.0979 15.1873 10.7305 10.6582C10.9661 8.97128 10.7029 7.06235 10.2799 5.33084C9.62796 2.66291 6.3765 2.09745 4.46945 4.0738C3.61644 4.9578 3.17604 6.19369 3.35087 7.40963C3.70209 9.85248 4.73946 13.2792 10.4756 18.8141Z" 
                            fill="#4D58D8"
                            stroke="#4D58D8" 
                            strokeWidth="2"
                          />
                        </svg>
                      );

                      if (phoneNumber) {
                        return (
                          <a 
                            href={`tel:${phoneNumber}`}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className={styles.phoneLink}
                            aria-label={`התקשר ל-${participantName}`}
                          >
                            {phoneIcon}
                          </a>
                        );
                      }
                      
                      // אם אין מספר טלפון, מציגים את האייקון אבל לא לחיץ
                      return (
                        <div className={styles.phoneLink} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                          {phoneIcon}
                        </div>
                      );
                    })()}
                    </div>
                  </div>
                  <div className={styles.taskItemHorizontalLine}>
                    <svg height="1" viewBox="0 0 380 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0" y1="0.5" x2="380" y2="0.5" stroke="#4D58D8" strokeWidth="1"/>
                    </svg>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Spacing */}
            <div className={styles.tasksSpacing}></div>
            
            {/* Done Section */}
            <div className={styles.doneSection}>
              {/* Done tasks list */}
              <ul className={`${styles.taskList} ${styles.doneTasksList}`}>
                {tasks.filter(t => t.status === 'done')
                  .sort((a, b) => {
                    // Sort by done_at descending (most recent first), fallback to due_date if done_at is null
                    const aTime = a.done_at ? new Date(a.done_at).getTime() : (a.due_date ? new Date(a.due_date).getTime() : 0);
                    const bTime = b.done_at ? new Date(b.done_at).getTime() : (b.due_date ? new Date(b.due_date).getTime() : 0);
                    return bTime - aTime; // Descending order (newest first)
                  })
                  .map(task => {
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
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTaskToggle(task);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                          <span className={styles.taskText} style={{ textDecoration: 'line-through' }}>
                            {(() => {
                              const title = task.title;
                              const prefix = "להתקשר ל";
                              if (title.startsWith(prefix)) {
                                const participantName = title.substring(prefix.length);
                                return (
                                  <>
                                    <span style={{ 
                                      color: '#949ADD',
                                      textAlign: 'right',
                                      fontFamily: 'EditorSans_PRO, sans-serif',
                                      fontSize: '1.5rem',
                                      fontStyle: 'italic',
                                      fontWeight: 400,
                                      lineHeight: '98%',
                                      textDecorationLine: 'line-through'
                                    }}>{prefix}</span>
                                    <span style={{ 
                                      color: '#949ADD',
                                      fontFamily: 'EditorSans_PRO, sans-serif',
                                      fontSize: '1.5rem',
                                      fontStyle: 'italic',
                                      fontWeight: 600,
                                      lineHeight: '98%',
                                      textDecorationLine: 'line-through'
                                    }}>{participantName}</span>
                                  </>
                                );
                              }
                              return title;
                            })()}
                          </span>
                          {doneByName && (
                            <div className={styles.taskDoneBy}>
                              <span>בוצע ע&quot;י {doneByName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.taskItemHorizontalLine}>
                        <svg height="1" viewBox="0 0 380 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="0" y1="0.5" x2="380" y2="0.5" stroke="#4D58D8" strokeWidth="1"/>
                        </svg>
                      </div>
                    </li>
                  );
                })}
                {tasks.filter(t => t.status === 'done').length === 0 && (
                  <li className={styles.taskItem} style={{ borderBottom: 'none', justifyContent: 'center' }}>
                    <span className={styles.taskText} style={{ fontSize: '0.9rem', opacity: 0.5 }}>אין משימות שבוצעו</span>
                  </li>
                )}
              </ul>
            </div>
            <div className={styles.tasksBottomLine}></div>
          </div>
        </div>
      )}

    </main>
  );
}
