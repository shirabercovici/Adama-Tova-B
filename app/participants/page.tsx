"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import SearchBarWithAdd from "@/lib/components/SearchBarWithAdd";
import styles from "./page.module.css";
import type { Participant, ParticipantsResponse, Task } from "./types";
import { logActivity } from "@/lib/activity-logger";
import { useThemeColor } from '@/lib/hooks/useThemeColor';

export default function ParticipantsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true); // Start with true, will be set to false if cache is found
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isDoneTasksOpen, setIsDoneTasksOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  // Initialize userRole from cache immediately (like profile page)
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedRoleData = localStorage.getItem('userRoleData');
        if (cachedRoleData) {
          const { role: cachedRole, email: cachedEmail } = JSON.parse(cachedRoleData);
          // Verify email matches current user (will be verified async, but use for now)
          if (cachedRole) {
            return cachedRole;
          }
        }
      } catch (e) {
        // Invalid cache, use null
      }
    }
    return null;
  });
  // Initialize isLoadingRole - if we have cached role, mark as not loading
  const [isLoadingRole, setIsLoadingRole] = useState(() => {
    // If we have cached role, we're not loading
    if (typeof window !== 'undefined') {
      try {
        const cachedRoleData = localStorage.getItem('userRoleData');
        if (cachedRoleData) {
          const { role: cachedRole } = JSON.parse(cachedRoleData);
          if (cachedRole) {
            return false; // We have cached role, not loading
          }
        }
      } catch (e) {
        // Invalid cache, use true
      }
    }
    return true; // Track role loading state
  });
  const [userInitials, setUserInitials] = useState<string>('א');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStatusUpdatesOpen, setIsStatusUpdatesOpen] = useState(false);
  // Initialize statusUpdates - start empty, will be loaded after role is determined
  // CRITICAL: Don't load from cache here - wait until we know if user is manager or volunteer
  const [statusUpdates, setStatusUpdates] = useState<any[]>([]);
  // Initialize statusUpdatesReady - start as false, will be set after role is determined
  const [statusUpdatesReady, setStatusUpdatesReady] = useState(false);
  const [isTasksReady, setIsTasksReady] = useState(false); // Track if tasks have been loaded
  const isFetchingStatusUpdatesRef = useRef(false);
  const hasPreloadedStatusUpdatesRef = useRef(false); // Track if we already preloaded from initial useEffect
  const isFetchingTasksRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedFromCacheRef = useRef(false);
  // Track if this is first login (no cached data) - if yes, wait for status updates before showing home screen
  const isFirstLoginRef = useRef<boolean>(true); // Default to true, will be updated in useEffect
  // Track if determineUserRole is currently running - prevent other useEffects from interfering
  const isDeterminingRoleRef = useRef(false);
  // Track if initial data is fully loaded (for first login only) - participants, role, status updates, tasks
  const [isInitialDataReady, setIsInitialDataReady] = useState(false);
  // Track if we've already set isInitialDataReady to true - prevent double updates
  const hasSetInitialDataReadyRef = useRef(false);
  // Track pending checkbox states for immediate visual feedback before sorting
  const [pendingTaskStates, setPendingTaskStates] = useState<Record<string, "open" | "done">>({});
  const [pendingStatusUpdateStates, setPendingStatusUpdateStates] = useState<Record<string, boolean>>({});
  // Track swipe gestures for drawers
  const tasksDrawerTouchStartY = useRef<number | null>(null);
  const statusUpdatesDrawerTouchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // Minimum distance in pixels to trigger swipe

  // Add class to body to hide navbar and make full width
  // Add class to body to hide navbar and make full width
  useEffect(() => {
    document.body.classList.add('participants-page');
    return () => {
      document.body.classList.remove('participants-page');
    };
  }, []);

  // Update theme-color for iOS compatibility (iOS doesn't always respect viewport exports)
  useThemeColor('#4D58D8');

  // Mark as hydrated and load initials from localStorage
  useEffect(() => {
    // This runs only on client after hydration
    setIsHydrated(true);
    
    // Helper function to check if a role string is a manager
    const isManagerRole = (role: string | null) => {
      return role === "מנהל.ת" || role === "מנהל" || role === "מנהלת" || (role && role.includes("מנהל"));
    };

    // CRITICAL: First check if user changed BEFORE determining first login status
    // This must be done synchronously to avoid race conditions
    let cachedRole: string | null = null;
    let cachedEmail: string | null = null;
    let currentUserEmail: string | null = null;
    let userChanged = false;
    
    if (typeof window !== 'undefined') {
      try {
        // First, try to get current user email from profile cache (faster than async call)
        const userProfileData = localStorage.getItem('userProfileData');
        if (userProfileData) {
          try {
            const profileData = JSON.parse(userProfileData);
            currentUserEmail = profileData.email;
          } catch (e) {
            // Invalid profile cache, continue
          }
        }
        
        // Then get cached role
        const cachedRoleData = localStorage.getItem('userRoleData');
        if (cachedRoleData) {
          try {
            const parsed = JSON.parse(cachedRoleData);
            cachedRole = parsed.role;
            cachedEmail = parsed.email;
            
            // Verify cached email matches current user email (from profile cache)
            if (currentUserEmail && cachedEmail !== currentUserEmail) {
              // User changed - clear all cache immediately (like profile page does)
              localStorage.removeItem('userRoleData');
              localStorage.removeItem('statusUpdates_cache');
              localStorage.removeItem('participants_cache');
              localStorage.removeItem('tasks_cache');
              cachedRole = null;
              cachedEmail = null;
              userChanged = true;
            }
          } catch (e) {
            // Invalid cache, treat as no cache
            cachedRole = null;
            cachedEmail = null;
          }
        }
        
      } catch (e) {
        // Invalid cache, continue
      }
    }
    
    // CRITICAL: Check if we need to verify user before determining first login status
    // This prevents double loading when switching between users
    let needsUserVerification = false;
    if (typeof window !== 'undefined' && !userChanged && !currentUserEmail) {
      // We have cached data but no userProfileData - need to verify user match
      const hasCachedData = !!localStorage.getItem('participants_cache') || 
                           !!localStorage.getItem('statusUpdates_cache') || 
                           !!localStorage.getItem('userRoleData');
      if (hasCachedData) {
        needsUserVerification = true;
      }
    }
    
    // Determine first login status immediately if we don't need user verification
    // Otherwise, wait for async verification to complete
    if (typeof window !== 'undefined') {
      if (userChanged) {
        // User changed - treat as first login - reset everything
        isFirstLoginRef.current = true;
        setIsInitialDataReady(false);
        hasSetInitialDataReadyRef.current = false; // Reset the flag when user changes
        // Clear state to ensure clean start
        setStatusUpdates([]);
        setParticipants([]);
        setTasks([]);
        setUserRole(null);
        setIsLoadingRole(true);
        setStatusUpdatesReady(false);
        setIsTasksReady(false);
        setLoading(true);
      } else if (!needsUserVerification) {
        // No need to verify user - determine first login status immediately
        const hasCachedParticipants = !!localStorage.getItem('participants_cache');
        const hasCachedStatusUpdates = !!localStorage.getItem('statusUpdates_cache');
        const hasCachedRole = !!localStorage.getItem('userRoleData');
        // If we have any cached data, it's not first login
        isFirstLoginRef.current = !(hasCachedParticipants || hasCachedStatusUpdates || hasCachedRole);
        
        // If not first login, mark initial data as ready immediately (we have cache)
        if (!isFirstLoginRef.current) {
          setIsInitialDataReady(true);
        }
      } else {
        // Need to verify user first - stay in loading state until verification completes
        // This prevents double loading when switching between users
        isFirstLoginRef.current = true;
        setIsInitialDataReady(false);
        setIsLoadingRole(true);
        setStatusUpdatesReady(false);
        setIsTasksReady(false);
        setLoading(true);
      }
    }
    
    // Also verify async (in case profile cache is not available)
    // This is a backup check for cases where profile cache doesn't exist yet
    // CRITICAL: Only run this if we need user verification or user changed
    // This prevents unnecessary async calls and double loading
    if (needsUserVerification || userChanged) {
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          let asyncUserChanged = false;
          
          // Check if we still have cached role data (might not have been cleared above)
          const remainingCachedRoleData = localStorage.getItem('userRoleData');
          if (remainingCachedRoleData) {
            try {
              const parsed = JSON.parse(remainingCachedRoleData);
              const remainingCachedEmail = parsed.email;
              
              // Check if cached email doesn't match current user
              if (remainingCachedEmail && remainingCachedEmail !== authUser.email) {
                // User changed - clear all cache (like profile page does)
                localStorage.removeItem('userRoleData');
                localStorage.removeItem('statusUpdates_cache');
                localStorage.removeItem('participants_cache');
                localStorage.removeItem('tasks_cache');
                setStatusUpdates([]);
                setParticipants([]);
                setTasks([]);
                setUserRole(null);
                asyncUserChanged = true;
              }
            } catch (e) {
              // Invalid cache, ignore
            }
          }
          
          // Also check if we have cached data but no userProfileData (user might have changed)
          if (!currentUserEmail && !asyncUserChanged && (localStorage.getItem('participants_cache') || 
              localStorage.getItem('statusUpdates_cache') || 
              localStorage.getItem('userRoleData'))) {
            // We have cached data but no userProfileData - might be user change
            // Verify by checking if cached role email matches current user
            const checkCachedRoleData = localStorage.getItem('userRoleData');
            if (checkCachedRoleData) {
              try {
                const parsed = JSON.parse(checkCachedRoleData);
                const checkCachedEmail = parsed.email;
                if (checkCachedEmail && checkCachedEmail !== authUser.email) {
                  // User changed - clear all cache
                  localStorage.removeItem('userRoleData');
                  localStorage.removeItem('statusUpdates_cache');
                  localStorage.removeItem('participants_cache');
                  localStorage.removeItem('tasks_cache');
                  setStatusUpdates([]);
                  setParticipants([]);
                  setTasks([]);
                  setUserRole(null);
                  asyncUserChanged = true;
                }
              } catch (e) {
                // Invalid cache, ignore
              }
            }
          }
          
          // If user changed during async check, reset everything
          if (asyncUserChanged) {
            isFirstLoginRef.current = true;
            setIsInitialDataReady(false);
            hasSetInitialDataReadyRef.current = false; // Reset the flag when user changes
            setIsLoadingRole(true);
            setStatusUpdatesReady(false);
            setIsTasksReady(false);
            setLoading(true);
          } else if (needsUserVerification) {
            // User matches - now we can determine first login status
            const hasCachedParticipants = !!localStorage.getItem('participants_cache');
            const hasCachedStatusUpdates = !!localStorage.getItem('statusUpdates_cache');
            const hasCachedRole = !!localStorage.getItem('userRoleData');
            isFirstLoginRef.current = !(hasCachedParticipants || hasCachedStatusUpdates || hasCachedRole);
            
            if (!isFirstLoginRef.current) {
              setIsInitialDataReady(true);
            }
          }
        }
      });
    }

    // CRITICAL: Fetch user role from server ONLY if not cached or user changed
    // This ensures we know if user is manager or volunteer before loading any data
    const determineUserRole = async (useCache: boolean = true): Promise<string | null> => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setIsLoadingRole(false);
          return null;
        }

        // Check cache first if enabled
        if (useCache && typeof window !== 'undefined') {
          const cachedRoleData = localStorage.getItem('userRoleData');
          if (cachedRoleData) {
            try {
              const { role: cachedRole, email: cachedEmail } = JSON.parse(cachedRoleData);
              // If cached email matches current user email, use cached role
              if (cachedEmail === authUser.email && cachedRole) {
                setUserRole(cachedRole);
                setIsLoadingRole(false);
                return cachedRole;
              } else if (cachedEmail !== authUser.email) {
                // User changed - clear all cache (like profile page does)
                localStorage.removeItem('userRoleData');
                localStorage.removeItem('statusUpdates_cache');
                localStorage.removeItem('participants_cache');
                localStorage.removeItem('tasks_cache');
                setStatusUpdates([]);
                setParticipants([]);
                setTasks([]);
              }
            } catch (e) {
              // Invalid cache, continue to fetch from server
            }
          }
        }

        // Cache miss or user changed - fetch from server
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('email', authUser.email)
          .single();
        
        if (dbUser?.role) {
          setUserRole(dbUser.role);
          // Cache user role with email for next time
          if (typeof window !== 'undefined') {
            localStorage.setItem('userRoleData', JSON.stringify({
              role: dbUser.role,
              email: authUser.email
            }));
          }
          setIsLoadingRole(false); // Role is now known
          return dbUser.role;
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
      setIsLoadingRole(false); // Even on error, mark as done loading
      return null;
    };
    
    if (typeof window !== 'undefined') {
      const savedInitials = localStorage.getItem('userInitials');
      if (savedInitials && savedInitials !== 'א') {
        setUserInitials(savedInitials);
      }

      // CRITICAL: Use cached role immediately if available (like profile page)
      // This allows status updates to load immediately for managers
      if (cachedRole && cachedEmail) {
        // Verify cached email matches current user (will be verified async)
        // But use cached role immediately for instant display
        setUserRole(cachedRole);
        setIsLoadingRole(false);
        
        // CRITICAL: If cached role is manager, load status updates from cache IMMEDIATELY
        // This ensures messages appear instantly when navigating back to home screen
        if (isManagerRole(cachedRole)) {
          try {
            const cachedStatusUpdates = localStorage.getItem('statusUpdates_cache');
            if (cachedStatusUpdates) {
              const { statusUpdates: cachedData } = JSON.parse(cachedStatusUpdates);
              if (cachedData && Array.isArray(cachedData)) {
                // Load status updates from cache immediately for instant display
                setStatusUpdates(cachedData);
                setStatusUpdatesReady(true);
              } else {
                // No cached status updates - will be loaded from server in determineUserRole
                // But if not first login, mark as ready immediately (will load in background)
                if (!isFirstLoginRef.current) {
                  setStatusUpdatesReady(true);
                }
              }
            } else {
              // No cached status updates - will be loaded from server in determineUserRole
              // But if not first login, mark as ready immediately (will load in background)
              if (!isFirstLoginRef.current) {
                setStatusUpdatesReady(true);
              }
            }
          } catch (e) {
            // Ignore cache errors
            // If not first login, mark as ready anyway
            if (!isFirstLoginRef.current) {
              setStatusUpdatesReady(true);
            }
          }
        } else {
          // Volunteer - clear status updates immediately
          // But only if this is NOT first login (we have cached role)
          // If first login, wait for determineUserRole to complete
          if (!isFirstLoginRef.current) {
            setStatusUpdates([]);
            setStatusUpdatesReady(true);
          }
        }
      }

      // CRITICAL: Load status updates from cache BEFORE clearing (if user is manager)
      // This allows instant display like tasks
      // Don't set statusUpdatesReady here - will be set when we load from cache below
      
      // CRITICAL: Determine user role FIRST, then handle status updates based on role
      // This ensures we don't show messages for volunteers even for a second
      isDeterminingRoleRef.current = true;
      determineUserRole(true).then((role) => {
        // After role is determined, handle status updates
        const isManagerRole = (r: string | null) => {
          return r === "מנהל.ת" || r === "מנהל" || r === "מנהלת" || (r && r.includes("מנהל"));
        };
        
        if (!role || !isManagerRole(role)) {
          // Volunteer - clear cache and status updates immediately
          // CRITICAL: Do this BEFORE showing home screen
          // Always clear for volunteers, even if statusUpdatesReady is already true (from cached role)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('statusUpdates_cache');
          }
          // Clear status updates from state (they don't need them)
          setStatusUpdates([]);
          // Mark as ready immediately for volunteers (they don't need status updates)
          setStatusUpdatesReady(true);
          // Make sure tasks are ready too for volunteers
          setIsTasksReady(true);
          // Initial data ready will be checked by useEffect above
        } else {
          // Manager - check if status updates were already loaded from cache synchronously above
          // If statusUpdatesReady is already true, it means we loaded from cache synchronously
          // Don't reload or fetch from server - use what we already have
          if (statusUpdatesReady) {
            // Already loaded from cache synchronously above - don't reload
            setIsTasksReady(true);
            // Initial data ready will be checked by useEffect above
            return;
          }
          
          // Status updates not loaded from cache yet - check cache now
          // Always check cache first - if exists, use it and don't fetch from server
          let hasCachedStatusUpdates = false;
          try {
            const cachedStatusUpdates = localStorage.getItem('statusUpdates_cache');
            if (cachedStatusUpdates) {
              const { statusUpdates: cachedData } = JSON.parse(cachedStatusUpdates);
              if (cachedData && Array.isArray(cachedData)) {
                // Use cached data - don't reload from server
                setStatusUpdates(cachedData);
                hasCachedStatusUpdates = true;
                // Mark as ready immediately since we have cached data
                setStatusUpdatesReady(true);
              }
            }
          } catch (e) {
            // Ignore cache errors
          }

          if (hasCachedStatusUpdates) {
            // We have cached status updates, mark as ready immediately
            // Tasks should already be ready if cached
            setIsTasksReady(true);
              // Don't fetch from server - use cached data
            // This ensures we remember the messages and don't reload every time
            // Initial data ready will be checked by useEffect above
            return;
          }

          // No cached status updates - need to fetch from server (first time load only)
          
          // No cache or expired - fetch from server
          // Fetch both tasks and status updates together
          Promise.all([
            fetch("/api/activities?activity_type=status_update&limit=50", { cache: 'no-store' }),
            fetch("/tasks/api", { cache: 'no-store' })
          ]).then(async ([statusResponse, tasksResponse]) => {
            // Handle status updates
            if (statusResponse.ok) {
              const data = await statusResponse.json();
              if (data.activities && Array.isArray(data.activities)) {
                setStatusUpdates(data.activities);
                try {
                  localStorage.setItem('statusUpdates_cache', JSON.stringify({
                    statusUpdates: data.activities,
                    timestamp: Date.now()
                  }));
                } catch (e) {
                  // Ignore cache errors
                }
              } else {
                setStatusUpdates([]);
              }
            } else {
              setStatusUpdates([]);
            }
            // Handle tasks
            if (tasksResponse.ok) {
              const tasksData = await tasksResponse.json();
              if (tasksData.tasks) {
                setTasks(tasksData.tasks);
                try {
                  localStorage.setItem('tasks_cache', JSON.stringify({
                    tasks: tasksData.tasks,
                    timestamp: Date.now()
                  }));
                } catch (e) {
                  // Ignore cache errors
                }
              }
            }
            // Mark both as ready together - CRITICAL: This allows the home screen to display
            setIsTasksReady(true);
            setStatusUpdatesReady(true);
            // Initial data ready will be checked by useEffect above
          }).catch((err) => {
            console.error("Background tasks/status updates preload failed:", err);
            // Even on error, mark as ready so the home screen can display
            setStatusUpdates([]);
            setIsTasksReady(true);
            setStatusUpdatesReady(true);
            // Initial data ready will be checked by useEffect above
          });
        }
        // Mark that role determination is complete
        isDeterminingRoleRef.current = false;
      }).catch((err) => {
        console.error("Error determining user role:", err);
        // Mark that role determination is complete even on error
        isDeterminingRoleRef.current = false;
        // Set statusUpdatesReady to true to prevent infinite loading
        setStatusUpdatesReady(true);
      });

      // Load participants from cache FIRST for instant display (most important feature)
      // This MUST be synchronous and happen immediately - no delays
      // Always use cache if available - don't reload every time
      let hasCachedParticipants = false;
      try {
        const cachedParticipants = localStorage.getItem('participants_cache');
        if (cachedParticipants) {
          const { participants: cachedParticipantsData, filterType } = JSON.parse(cachedParticipants);
          // Always use cache if available - better than loading every time
          if (cachedParticipantsData && Array.isArray(cachedParticipantsData) &&
            filterType === 'active') {
            // Set immediately - no async, no delays
            setParticipants(cachedParticipantsData);
            setLoading(false); // We have cached data, no loading needed
            hasLoadedFromCacheRef.current = true;
            hasCachedParticipants = true;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      // Load tasks from cache for instant display
      // Always use cache if available - don't reload every time
      let hasCachedTasks = false;
      try {
        const cachedTasks = localStorage.getItem('tasks_cache');
        if (cachedTasks) {
          const { tasks: cachedTasksData } = JSON.parse(cachedTasks);
          // Always use cache if available
          if (cachedTasksData) {
            setTasks(cachedTasksData);
            setIsTasksReady(true); // Mark tasks as ready if loaded from cache
            hasCachedTasks = true;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      // CRITICAL: Don't load status updates from cache here
      // Wait until determineUserRole() completes to know if user is manager or volunteer
      // This prevents showing messages for a second before deleting them for volunteers
      
      // If we have cached participants, it's not first login
      if (hasCachedParticipants) {
        isFirstLoginRef.current = false;
        setIsInitialDataReady(true); // Mark as ready since we have cached data
      }

      // If we have cached participants, mark tasks as ready immediately
      // This prevents the loading screen from showing when navigating back
      if (hasCachedParticipants) {
        // If we have cached tasks, they're already marked as ready above
        // If not, mark as ready anyway since we have participants to show
        if (!hasCachedTasks) {
          setIsTasksReady(true);
        }
        // statusUpdatesReady is already marked above if we have cached status updates
        // If user is volunteer, it will be cleared and reset in determineUserRole().then()
      }

      // Status updates handling is now done inside determineUserRole().then() above
      // This ensures we know the role from server before loading status updates

      // Start fetching participants immediately if we don't have cached data
      // This is the most important feature - load it ASAP
      if (!hasLoadedFromCacheRef.current) {
        // No cache - set loading to true and trigger fetch immediately
        setLoading(true);
        setDebouncedSearch("");
        
        // On first login, wait for participants to load before marking initial data as ready
        // This will be done in the fetchParticipantsDebounced callback
      }

      // Preload tasks immediately in the background (without waiting for other data)
      // This ensures tasks are ready when user clicks on them
      fetchTasks().catch(err => {
        // Silently handle errors - cache will be used if available
        console.error("Background tasks preload failed:", err);
      });

      // Status updates are handled inside determineUserRole().then() above
      // No need for duplicate handling here
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

        if (data.activities && Array.isArray(data.activities)) {
          setStatusUpdates(data.activities);
          // Save to cache for instant loading next time (only for managers)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('statusUpdates_cache', JSON.stringify({
                statusUpdates: data.activities,
                timestamp: Date.now()
              }));
            } catch (e) {
              // Ignore cache errors
            }
          }
        } else {
          setStatusUpdates([]);
        }
      } else {
        setStatusUpdates([]);
      }
    } catch (err) {
      console.error("Error fetching status updates:", err);
    } finally {
      isFetchingStatusUpdatesRef.current = false;
    }
  }, [isManager]);

  // Update read status for a status update
  const updateStatusUpdateReadStatus = useCallback(async (updateId: string, isRead: boolean) => {
    if (!updateId) {
      console.error("Missing update ID");
      return;
    }

    // Update pending state immediately for visual feedback
    setPendingStatusUpdateStates((prev) => ({
      ...prev,
      [updateId]: isRead
    }));

    // Delay the actual state update that causes sorting/movement
    // This allows the checkbox to fill first, then the item moves down
    setTimeout(() => {
      // Optimistic update
      setStatusUpdates((prev) =>
        prev.map((update) =>
          update.id === updateId
            ? { ...update, is_read: isRead }
            : update
        )
      );
      
      // Clear pending state after update
      setPendingStatusUpdateStates((prev) => {
        const newPending = { ...prev };
        delete newPending[updateId];
        return newPending;
      });
    }, 300); // 300ms delay to allow checkbox to fill first

    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity_id: updateId,
          is_read: isRead,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error updating read status:", errorData);
        // Revert pending state on error
        setPendingStatusUpdateStates((prev) => {
          const newPending = { ...prev };
          delete newPending[updateId];
          return newPending;
        });
        // Revert optimistic update on error
        setStatusUpdates((prev) =>
          prev.map((update) =>
            update.id === updateId
              ? { ...update, is_read: !isRead }
              : update
          )
        );
      }
    } catch (err) {
      console.error("Error updating read status:", err);
      // Revert pending state on error
      setPendingStatusUpdateStates((prev) => {
        const newPending = { ...prev };
        delete newPending[updateId];
        return newPending;
      });
      // Revert optimistic update on error
      setStatusUpdates((prev) =>
        prev.map((update) =>
          update.id === updateId
            ? { ...update, is_read: !isRead }
            : update
        )
      );
    }
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
                // Cache user role for instant display on next visit
                if (typeof window !== 'undefined') {
                  localStorage.setItem('userRole', dbUser.role);
                }
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
      
      // Don't update isInitialDataReady here - let the useEffect handle it
      // This prevents double updates that cause double loading
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

  // Refresh data when page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to the page - refresh data to see latest changes
        // Only refresh if cache is older than 30 seconds to avoid too many requests
        if (typeof window !== 'undefined') {
          try {
            const cachedParticipants = localStorage.getItem('participants_cache');
            if (cachedParticipants) {
              const { timestamp } = JSON.parse(cachedParticipants);
              // If cache is older than 30 seconds, refresh
              if (Date.now() - timestamp > 30 * 1000) {
                fetchParticipantsDebounced();
              }
            } else {
              // No cache, fetch immediately
              fetchParticipantsDebounced();
            }
          } catch (e) {
            // Ignore cache errors, just refresh
            fetchParticipantsDebounced();
          }
        }
      }
    };

    const handleFocus = () => {
      // Also refresh when window gains focus
      handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchParticipantsDebounced]);

  // Fetch status updates when userRole is loaded and user is a manager
  // This is a fallback for cases where userRole wasn't in cache or loaded later
  // If we already preloaded in the initial useEffect, skip this to avoid duplicate requests
  // CRITICAL: Don't run if determineUserRole is still running - wait for it to complete
  useEffect(() => {
    // Don't run if determineUserRole is still running - it will handle status updates
    if (isDeterminingRoleRef.current) {
      return;
    }
    if (userRole && isManager() && !isFetchingStatusUpdatesRef.current && !hasPreloadedStatusUpdatesRef.current) {
      // Only fetch if we haven't already preloaded in the initial useEffect
      // Fetch tasks and status updates together
      Promise.all([fetchTasks(), fetchStatusUpdates()]).then(() => {
        setIsTasksReady(true);
        setStatusUpdatesReady(true);
      }).catch(err => {
        console.error('Error fetching tasks/status updates:', err);
        setIsTasksReady(true);
        setStatusUpdatesReady(true); // Mark as ready even on error
      });
    } else if (userRole && !isManager()) {
      // Explicitly clear status updates for non-managers to prevent any flash
      // Only clear if we haven't already loaded from cache (statusUpdatesReady means we already handled it)
      // CRITICAL: Don't run if determineUserRole is still running - it will handle this
      if (!isDeterminingRoleRef.current && !statusUpdatesReady) {
        setStatusUpdates([]);
        setStatusUpdatesReady(true); // Mark as ready since we've cleared them
      }
      // Make sure tasks are ready too
      if (!isTasksReady) {
        fetchTasks().then(() => setIsTasksReady(true)).catch(() => setIsTasksReady(true));
      }
    } else if (userRole === null && !statusUpdatesReady) {
      // If userRole is still null after some time, ensure statusUpdates is cleared
      // This prevents showing cached messages when role hasn't loaded yet
      // Only clear if we haven't already loaded from cache
      setStatusUpdates([]);
    }
  }, [userRole, isManager, fetchStatusUpdates, isTasksReady, fetchTasks]);

  // On first login, mark initial data as ready when ALL data is loaded: participants, role, status updates, tasks
  // CRITICAL: This useEffect is the ONLY place that sets isInitialDataReady to true on first login
  // This prevents double loading by ensuring we only update once when all data is ready
  useEffect(() => {
    if (isFirstLoginRef.current && !isInitialDataReady && !hasSetInitialDataReadyRef.current) {
      // Check if all required data is ready:
      // 1. Role is determined (not null and not loading)
      // 2. Status updates are ready
      // 3. Tasks are ready
      // 4. Participants are loaded (loading is false, meaning fetch completed - success or error)
      // Note: Even if there's an error or no participants, we still show the screen (empty state)
      if (userRole !== null && !isLoadingRole && statusUpdatesReady && isTasksReady && !loading) {
        hasSetInitialDataReadyRef.current = true;
        setIsInitialDataReady(true);
      }
    }
  }, [isInitialDataReady, userRole, isLoadingRole, statusUpdatesReady, isTasksReady, loading]);

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
        // Fetch tasks and status updates in parallel - they must load together
        // This ensures they appear at the same time
        if (isMounted) {
          const tasksPromise = fetchTasks();
          const statusUpdatesPromise = fetchStatusUpdates();
          // Wait for both to complete together
          await Promise.all([tasksPromise, statusUpdatesPromise]);
          setIsTasksReady(true);
          setStatusUpdatesReady(true); // Mark both as ready together
        }

        // If we have cached participants, refresh them silently in background
        // Don't block or show loading if we already have data
        if (hasLoadedFromCacheRef.current && participants.length > 0) {
          // Refresh in background - don't wait for it, don't block
          fetchParticipantsDebounced().catch(() => {
            // Silently fail - we have cached data
          });
        } else {
          // No cache - fetch participants
          await fetchParticipantsDebounced();
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
            // Set user role - CRITICAL: This updates the role from server
            if (dbUser?.role) {
              setUserRole(dbUser.role);
              // Cache user role with email for instant display on next visit
              if (typeof window !== 'undefined') {
                localStorage.setItem('userRoleData', JSON.stringify({
                  role: dbUser.role,
                  email: authUser.email
                }));
              }
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

  // Handle swipe gestures for tasks drawer
  const handleTasksDrawerTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const drawerElement = target.closest(`.${styles.tasksDrawer}`);
    if (drawerElement) {
      const isHandle = target.closest(`.${styles.tasksHandle}`) !== null;
      const isContent = target.closest(`.${styles.tasksContent}`) !== null;
      
      // Track swipe if:
      // 1. Starting from handle (always)
      // 2. Starting from top area when drawer is closed (to open it)
      // 3. Starting from top area when drawer is open (to close it)
      if (isHandle) {
        tasksDrawerTouchStartY.current = e.touches[0].clientY;
      } else if (isContent && !isTasksOpen) {
        // Drawer is closed - allow swipe from anywhere to open
        tasksDrawerTouchStartY.current = e.touches[0].clientY;
      } else if (isContent && isTasksOpen) {
        // Drawer is open - only allow swipe from top area to close
        const rect = drawerElement.getBoundingClientRect();
        const touchY = e.touches[0].clientY;
        const relativeY = touchY - rect.top;
        if (relativeY < 150) {
          tasksDrawerTouchStartY.current = e.touches[0].clientY;
        }
      }
    }
  };

  const handleTasksDrawerTouchMove = (e: React.TouchEvent) => {
    if (tasksDrawerTouchStartY.current === null) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = tasksDrawerTouchStartY.current - currentY;
    
    // Prevent default scrolling only if swiping vertically in handle/top area
    if (Math.abs(deltaY) > 10) {
      const target = e.target as HTMLElement;
      const drawerElement = target.closest(`.${styles.tasksDrawer}`);
      if (drawerElement) {
        const isHandle = target.closest(`.${styles.tasksHandle}`) !== null;
        if (isHandle) {
          e.preventDefault();
        } else if (isTasksOpen) {
          // When drawer is open, only prevent default in top area
          const rect = drawerElement.getBoundingClientRect();
          const touchY = e.touches[0].clientY;
          const relativeY = touchY - rect.top;
          if (relativeY < 150) {
            e.preventDefault();
          }
        } else {
          // When drawer is closed, prevent default to allow swipe up
          e.preventDefault();
        }
      }
    }
  };

  const handleTasksDrawerTouchEnd = (e: React.TouchEvent) => {
    if (tasksDrawerTouchStartY.current === null) return;
    
    const endY = e.changedTouches[0].clientY;
    const deltaY = tasksDrawerTouchStartY.current - endY;
    
    // Swipe up (negative deltaY) = open drawer
    // Swipe down (positive deltaY) = close drawer
    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
      if (deltaY > 0) {
        // Swipe down - close drawer
        setIsTasksOpen(false);
      } else {
        // Swipe up - open drawer
        setIsTasksOpen(true);
      }
    }
    
    tasksDrawerTouchStartY.current = null;
  };

  // Handle swipe gestures for status updates drawer
  const handleStatusUpdatesDrawerTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const drawerElement = target.closest(`.${styles.statusUpdatesDrawer}`);
    if (drawerElement) {
      const isHandle = target.closest(`.${styles.tasksHandle}`) !== null;
      const isContent = target.closest(`.${styles.tasksContent}`) !== null;
      
      // Track swipe if:
      // 1. Starting from handle (always)
      // 2. Starting from top area when drawer is closed (to open it)
      // 3. Starting from top area when drawer is open (to close it)
      if (isHandle) {
        statusUpdatesDrawerTouchStartY.current = e.touches[0].clientY;
      } else if (isContent && !isStatusUpdatesOpen) {
        // Drawer is closed - allow swipe from anywhere to open
        statusUpdatesDrawerTouchStartY.current = e.touches[0].clientY;
      } else if (isContent && isStatusUpdatesOpen) {
        // Drawer is open - only allow swipe from top area to close
        const rect = drawerElement.getBoundingClientRect();
        const touchY = e.touches[0].clientY;
        const relativeY = touchY - rect.top;
        if (relativeY < 150) {
          statusUpdatesDrawerTouchStartY.current = e.touches[0].clientY;
        }
      }
    }
  };

  const handleStatusUpdatesDrawerTouchMove = (e: React.TouchEvent) => {
    if (statusUpdatesDrawerTouchStartY.current === null) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = statusUpdatesDrawerTouchStartY.current - currentY;
    
    // Prevent default scrolling only if swiping vertically in handle/top area
    if (Math.abs(deltaY) > 10) {
      const target = e.target as HTMLElement;
      const drawerElement = target.closest(`.${styles.statusUpdatesDrawer}`);
      if (drawerElement) {
        const isHandle = target.closest(`.${styles.tasksHandle}`) !== null;
        if (isHandle) {
          e.preventDefault();
        } else if (isStatusUpdatesOpen) {
          // When drawer is open, only prevent default in top area
          const rect = drawerElement.getBoundingClientRect();
          const touchY = e.touches[0].clientY;
          const relativeY = touchY - rect.top;
          if (relativeY < 150) {
            e.preventDefault();
          }
        } else {
          // When drawer is closed, prevent default to allow swipe up
          e.preventDefault();
        }
      }
    }
  };

  const handleStatusUpdatesDrawerTouchEnd = (e: React.TouchEvent) => {
    if (statusUpdatesDrawerTouchStartY.current === null) return;
    
    const endY = e.changedTouches[0].clientY;
    const deltaY = statusUpdatesDrawerTouchStartY.current - endY;
    
    // Swipe up (negative deltaY) = open drawer
    // Swipe down (positive deltaY) = close drawer
    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
      if (deltaY > 0) {
        // Swipe down - close drawer
        setIsStatusUpdatesOpen(false);
      } else {
        // Swipe up - open drawer
        setIsStatusUpdatesOpen(true);
      }
    }
    
    statusUpdatesDrawerTouchStartY.current = null;
  };

  const handleTaskToggle = async (task: Task) => {
    // Prevent multiple simultaneous toggles
    if (isFetchingTasksRef.current) {
      return;
    }

    try {
      // Optimistic update
      const newStatus: "open" | "done" = task.status === 'done' ? 'open' : 'done';

      // Update pending state immediately for visual feedback
      setPendingTaskStates((prev) => ({
        ...prev,
        [task.id]: newStatus
      }));

      // Get current user info for optimistic update
      let userId: string | null = null;
      let doneByUser: { id: string; first_name: string; last_name: string; role: string } | null = null;

      if (newStatus === 'done') {
        // Get user ID and name
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, first_name, last_name, role')
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
                last_name: lastName,
                role: dbUser.role || ''
              };
            }
          }
        }
      }

      // Delay the actual state update that causes sorting/movement
      // This allows the checkbox to fill first, then the item moves down
      setTimeout(() => {
        // Optimistic update with done_by_user info - use functional update to get latest state
        setTasks((currentTasks) => {
          return currentTasks.map((t) => {
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
        });
        
        // Clear pending state after update
        setPendingTaskStates((prev) => {
          const newPending = { ...prev };
          delete newPending[task.id];
          return newPending;
        });
      }, 300); // 300ms delay to allow checkbox to fill first

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
      // Revert pending state on error
      setPendingTaskStates((prev) => {
        const newPending = { ...prev };
        delete newPending[task.id];
        return newPending;
      });
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

      // Update cache with new data
      if (typeof window !== 'undefined') {
        try {
          const updatedParticipants = participants.map(p =>
            p.id === participantId
              ? { ...p, last_attendance: newAttendance }
              : p
          );
          const filterType = (search && search.trim() !== "") ? 'search' : 'active';
          localStorage.setItem('participants_cache', JSON.stringify({
            participants: updatedParticipants,
            timestamp: Date.now(),
            filterType: filterType
          }));
        } catch (e) {
          // Ignore cache errors
        }
      }

      // Refresh participants list if there's a search query to ensure consistency
      if (search && search.trim() !== "") {
        fetchParticipantsDebounced();
      } else {
        // Even without search, refresh to ensure all users see the update
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
      {/* Blue status bar area for mobile */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: `max(44px, calc(env(safe-area-inset-top, 0px) + 44px))`,
          backgroundColor: "#4D58D8",
          zIndex: 0,
        }}
      />
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

      {/* Loading - show loading screen ONLY on first login (no cached data) */}
      {/* After first login, show content immediately from cache */}
      {/* CRITICAL: On first login, stay on loading screen until ALL data is ready: participants, role, status updates, tasks */}
      {isFirstLoginRef.current && !isInitialDataReady ? (
        <div className={styles.loadingContainer}>
          <div style={{
            position: 'relative',
            width: '20.375rem',
            height: '17.375rem',
            flexShrink: 0,
            aspectRatio: '163/139'
          }}>
            <Image
              src="/icons/loading.png"
              alt="טוען..."
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div className={styles.loadingText}>רק רגע...</div>
        </div>
      ) : null}

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <div>שגיאה: {error}</div>
        </div>
      )}

      {/* Participants List - Show immediately if not first login, or after ALL data is loaded on first login */}
      {!error && participants.length > 0 && (!isFirstLoginRef.current || isInitialDataReady) && (
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
              // Sort participants in this letter group: non-archived first, archived last
              const letterParticipants = [...groupedParticipants[letter]].sort((a, b) => {
                // If one is archived and the other isn't, archived goes to the end
                if (a.is_archived && !b.is_archived) return 1;
                if (!a.is_archived && b.is_archived) return -1;
                // If both have same archive status, keep original order (already sorted by name)
                return 0;
              });
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
          })() : null}
        </div>
      )}

      {/* Empty state - show when no participants, but only after ALL data is loaded on first login */}
      {!error && participants.length === 0 && (!isFirstLoginRef.current || isInitialDataReady) && (
        <div className={`${styles.participantsList} ${isSearchActive ? styles.searchActive : ''}`}>
          {/* List Header - show even when empty */}
          <div className={styles.listHeader}>
            <div className={styles.headerCell}>
              <div className={styles.headerName}>שם</div>
            </div>
            <div className={styles.headerCellLast}>
              <div className={styles.headerAttendance}>נוכחות</div>
            </div>
          </div>
          
          {/* Empty state message */}
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
        </div>
      )}

      {/* Status Updates Drawer - Only render if user is manager and not first login or ALL data is ready */}
      {/* CRITICAL: Never render this component until we know the role - no hiding, no CSS tricks */}
      {!isSearchActive && isManager() && statusUpdatesReady && (!isFirstLoginRef.current || isInitialDataReady) && (
        <div 
          className={`${styles.statusUpdatesDrawer} ${isStatusUpdatesOpen ? styles.open : styles.closed} ${isTasksOpen ? styles.hidden : ''}`}
          onTouchStart={handleStatusUpdatesDrawerTouchStart}
          onTouchMove={handleStatusUpdatesDrawerTouchMove}
          onTouchEnd={handleStatusUpdatesDrawerTouchEnd}
        >
          <div className={styles.tasksLine}>
            <svg width="100%" height="1" viewBox="0 0 440 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M440 0.5L-4.76837e-06 0.5" stroke="#4D58D8" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div className={`${styles.tasksHandle} ${isStatusUpdatesOpen ? styles.open : ''}`} onClick={() => setIsStatusUpdatesOpen(!isStatusUpdatesOpen)}>
            <div className={styles.tasksTitle}>
              <div className={styles.tasksTopLine}></div>
              <span className={styles.tasksTitleText}>הודעות</span>
            </div>
          </div>

          <div className={styles.tasksContent}>
            <ul className={styles.taskList}>
              {statusUpdates && statusUpdates.length > 0 ? (
                <>
                  {/* Active (unread) status updates */}
                  {(() => {
                    const unreadUpdates = statusUpdates.filter(update => {
                      // Filter uses actual state only - item stays in list until real state changes
                      return !(update.is_read || false);
                    });
                    return unreadUpdates.map((update, index) => {
                      const participantName = update.participant_name || '';
                      const updateText = update.update_content || '';
                      const updateDate = new Date(update.created_at);
                      const formattedDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}`;
                      const userDisplayName = update.user_display_name || update.user_name || '';
                      const isPublic = update.is_public === true;
                      const updateId = update.id;
                      // Checkbox uses pending state for immediate visual feedback
                      const pendingIsRead = pendingStatusUpdateStates[updateId];
                      const checkboxChecked = pendingIsRead !== undefined 
                        ? pendingIsRead 
                        : (update.is_read || false);
                      const isLastUnread = index === unreadUpdates.length - 1;

                      if (!updateId) return null; // Skip if no ID

                      return (
                        <li key={updateId} className={`${styles.statusUpdateItem} ${isLastUnread ? styles.lastUnreadItem : ''}`}>
                          <div className={styles.statusUpdateContent}>
                            <div className={styles.statusUpdateHeader}>
                              <span className={styles.statusUpdateParticipant}>{participantName} {formattedDate}</span>
                              {userDisplayName && (
                                <>
                                  <span className={styles.statusUpdateSeparator}>-</span>
                                  <span className={styles.statusUpdateUser}>ע&quot;י {userDisplayName}</span>
                                </>
                              )}
                            </div>
                            <div className={styles.statusUpdateTextContainer}>
                              <div className={styles.statusUpdateCheckboxContainer}>
                                <input
                                  type="checkbox"
                                  className={styles.taskCheckbox}
                                  checked={checkboxChecked}
                                  onChange={(e) => {
                                    if (updateId) {
                                      updateStatusUpdateReadStatus(updateId, e.target.checked);
                                    }
                                  }}
                                />
                              </div>
                              <div className={styles.statusUpdateVerticalLine}></div>
                              <div className={styles.statusUpdateText}>{updateText}</div>
                            </div>
                            {!isPublic && (
                              <div className={styles.statusUpdateNotPublic}>לא ציבורי</div>
                            )}
                          </div>
                        </li>
                      );
                    });
                  })()}

                  {/* Full width line before done section */}
                  {statusUpdates.filter(update => {
                    // Filter uses actual state only
                    return update.is_read || false;
                  }).length > 0 && (
                    <li className={styles.statusUpdateItem} style={{ borderBottom: 'none', padding: 0 }}>
                      <div className={styles.tasksFullWidthLine}>
                        <svg width="100%" height="1" viewBox="0 0 440 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                          <path d="M440 0.5L-4.76837e-06 0.5" stroke="#4D58D8" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </div>
                    </li>
                  )}

                  {/* Done (read) status updates */}
                  <div className={styles.doneSection}>
                    <ul className={`${styles.taskList} ${styles.doneTasksList}`}>
                      {statusUpdates
                        .filter(update => {
                          // Filter uses actual state only - item appears in read list only when real state changes
                          return update.is_read || false;
                        })
                        .sort((a, b) => {
                          const aTime = new Date(a.created_at).getTime();
                          const bTime = new Date(b.created_at).getTime();
                          return bTime - aTime; // Descending order (newest first)
                        })
                        .map((update, index) => {
                          const participantName = update.participant_name || '';
                          const updateText = update.update_content || '';
                          const updateDate = new Date(update.created_at);
                          const formattedDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}`;
                          const userDisplayName = update.user_display_name || update.user_name || '';
                          const isPublic = update.is_public === true;
                          const updateId = update.id;
                          // Checkbox uses pending state for immediate visual feedback
                          const pendingIsRead = pendingStatusUpdateStates[updateId];
                          const checkboxChecked = pendingIsRead !== undefined 
                            ? pendingIsRead 
                            : (update.is_read || false);

                          if (!updateId) return null; // Skip if no ID

                          return (
                            <li key={updateId} className={`${styles.statusUpdateItem} ${styles.readStatusUpdateItem}`}>
                              <div className={styles.statusUpdateContent}>
                                <div className={styles.statusUpdateHeader}>
                                  <span className={styles.statusUpdateParticipant}>{participantName} {formattedDate}</span>
                                  {userDisplayName && (
                                    <>
                                      <span className={styles.statusUpdateSeparator}>-</span>
                                      <span className={styles.statusUpdateUser}>ע&quot;י {userDisplayName}</span>
                                    </>
                                  )}
                                </div>
                                <div className={styles.statusUpdateTextContainer}>
                                  <div className={styles.statusUpdateCheckboxContainer}>
                                    <input
                                      type="checkbox"
                                      className={styles.taskCheckbox}
                                      checked={checkboxChecked}
                                      onChange={(e) => {
                                        if (updateId) {
                                          updateStatusUpdateReadStatus(updateId, e.target.checked);
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className={styles.statusUpdateVerticalLine}></div>
                                  <div className={styles.statusUpdateText}>{updateText}</div>
                                </div>
                                {!isPublic && (
                                  <div className={styles.statusUpdateNotPublic}>לא ציבורי</div>
                                )}
                              </div>
                              <div className={styles.taskItemHorizontalLine}>
                                <svg height="1" viewBox="0 0 380 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <line x1="0" y1="0.5" x2="380" y2="0.5" stroke="#949ADD" strokeWidth="1" />
                                </svg>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>

                  {statusUpdates.filter(update => {
                    // Filter uses actual state only
                    return !(update.is_read || false);
                  }).length === 0 &&
                    statusUpdates.filter(update => {
                      // Filter uses actual state only
                      return update.is_read || false;
                    }).length === 0 && (
                      <li className={styles.taskItem} style={{ borderBottom: 'none', justifyContent: 'center' }}>
                        <span className={styles.taskText} style={{ fontSize: '0.9rem', opacity: 0.5 }}>אין עדכוני סטטוס</span>
                      </li>
                    )}
                </>
              ) : (
                <li className={styles.taskItem} style={{ borderBottom: 'none', justifyContent: 'center' }}>
                  <span className={styles.taskText} style={{ fontSize: '0.9rem', opacity: 0.5 }}>אין עדכוני סטטוס</span>
                </li>
              )}
            </ul>
            <div className={styles.tasksBottomLine}></div>
          </div>
        </div>
      )}

      {/* Tasks Drawer - Show only when NOT searching, and after ALL data is loaded on first login */}
      {/* For volunteers, show tasks immediately after statusUpdatesReady (which happens after role is determined) */}
      {/* For managers, show tasks after statusUpdatesReady (which happens after status updates are loaded) */}
      {!isSearchActive && (!isFirstLoginRef.current || isInitialDataReady) && isTasksReady && (
        <div 
          className={`${styles.tasksDrawer} ${isTasksOpen ? styles.open : styles.closed} ${isStatusUpdatesOpen ? styles.hidden : ''}`}
          onTouchStart={handleTasksDrawerTouchStart}
          onTouchMove={handleTasksDrawerTouchMove}
          onTouchEnd={handleTasksDrawerTouchEnd}
        >
          <div className={styles.tasksLine}>
            <svg width="100%" height="1" viewBox="0 0 440 1" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M440 0.5L-4.76837e-06 0.5" stroke="#4D58D8" strokeWidth="1" strokeLinecap="round" />
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
              {tasks.filter(t => {
                // Filter uses actual state only - item stays in list until real state changes
                return t.status !== 'done';
              }).map(task => {
                // Checkbox uses pending state for immediate visual feedback
                const pendingStatus = pendingTaskStates[task.id];
                const checkboxChecked = pendingStatus !== undefined 
                  ? pendingStatus === 'done' 
                  : task.status === 'done';
                return (
                <li key={task.id} className={styles.taskItem}>
                  <div className={styles.taskItemContent}>
                    <input
                      type="checkbox"
                      className={styles.taskCheckbox}
                      checked={checkboxChecked}
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
                      <line x1="0" y1="0.5" x2="380" y2="0.5" stroke="#4D58D8" strokeWidth="1" />
                    </svg>
                  </div>
                </li>
                );
              })}
            </ul>

            {/* Spacing */}
            <div className={styles.tasksSpacing}></div>

            {/* Done Section */}
            <div className={styles.doneSection}>
              {/* Done tasks list */}
              <ul className={`${styles.taskList} ${styles.doneTasksList}`}>
                {tasks.filter(t => {
                  // Filter uses actual state only - item appears in done list only when real state changes
                  return t.status === 'done';
                })
                  .sort((a, b) => {
                    // Sort by done_at descending (most recent first), fallback to due_date if done_at is null
                    const aTime = a.done_at ? new Date(a.done_at).getTime() : (a.due_date ? new Date(a.due_date).getTime() : 0);
                    const bTime = b.done_at ? new Date(b.done_at).getTime() : (b.due_date ? new Date(b.due_date).getTime() : 0);
                    return bTime - aTime; // Descending order (newest first)
                  })
                  .map(task => {
                    // Checkbox uses pending state for immediate visual feedback
                    const pendingStatus = pendingTaskStates[task.id];
                    const checkboxChecked = pendingStatus !== undefined 
                      ? pendingStatus === 'done' 
                      : task.status === 'done';
                    let doneByName = null;
                    let doneByRole = null;
                    if (task.done_by_user) {
                      const name = (task.done_by_user.first_name || '').trim();
                      const role = task.done_by_user.role || '';
                      if (name) {
                        doneByName = name;
                        doneByRole = role;
                      }
                    }
                    return (
                      <li key={task.id} className={styles.taskItem} style={{ opacity: 0.7 }}>
                        <div className={styles.taskItemContent}>
                          <input
                            type="checkbox"
                            className={styles.taskCheckbox}
                            checked={checkboxChecked}
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
                                <span>בוצע ע&quot;י {doneByName}{doneByRole ? ` ${doneByRole}` : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.taskItemHorizontalLine}>
                          <svg height="1" viewBox="0 0 380 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="0.5" x2="380" y2="0.5" stroke="#4D58D8" strokeWidth="1" />
                          </svg>
                        </div>
                      </li>
                    );
                  })}
                {tasks.filter(t => {
                  // Filter uses actual state only
                  return t.status === 'done';
                }).length === 0 && (
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
