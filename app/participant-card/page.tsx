"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import BackButton from '../../components/BackButton';
import { createClient } from '@/lib/supabase/client';
import Image from "next/image";
import { Participant } from '@/app/participants/types';
import { logActivity } from '@/lib/activity-logger';
import { useThemeColor } from '@/lib/hooks/useThemeColor';


const InfoRow = ({ label, value, children, isArchived }: { label: string, value: any, children?: React.ReactNode, isArchived?: boolean }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingTop: '1rem',
    position: 'relative'
  }}>

    <div style={{
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: '0.5rem',
      paddingBottom: '1rem'
    }}>

      {/* כותרת השדה */}
      <div style={{
        color: isArchived ? '#949ADD' : 'var(--Blue-Adamami, #4D58D8)',
        textAlign: 'right',
        fontFamily: "'EditorSans_PRO', sans-serif",
        fontSize: '1.5rem',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '98%',
        width: '100%'
      }}>
        {label}
      </div>

      {/* ערך השדה */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        direction: 'rtl'
      }}>
        <div style={{
          color: isArchived ? '#949ADD' : 'var(--Blue-Adamami, #4D58D8)', // שינוי צבע בארכיון
          textAlign: 'right',
          fontFamily: "'EditorSans_PRO', sans-serif",
          fontSize: '1.25rem',
          fontStyle: 'normal',
          fontWeight: 300,
          lineHeight: '98%'
        }}>
          {value || '---'}
        </div>

        {children && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {children}
          </div>
        )}
      </div>
    </div>

    <div style={{
      width: '100%',
      borderBottom: '1px solid rgba(77, 88, 216, 0.3)'
    }}></div>
  </div>
);
const ArchiveConfirmPopup = ({ isArchived, onConfirm, onCancel }: { isArchived: boolean, onConfirm: () => void, onCancel: () => void }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(77, 88, 216, 0.50)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center',
      width: '21.6875rem', maxWidth: '90vw', height: '28.75rem', maxHeight: '80vh',
      paddingTop: '0.625rem', backgroundColor: '#FFFCE5', borderRadius: '0', overflow: 'hidden', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{ padding: '25px 20px 10px 20px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: 0, color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontWeight: 'normal' }}>
          {isArchived ? 'להוציא מהארכיון?' : 'להעביר לארכיון?'}
        </h3>
      </div>
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
        <img src={isArchived ? "/archive-image1.svg" : "/archive-image.svg"} alt="ארכיון" style={isArchived ? { width: '13.375rem', height: '10.6875rem', objectFit: 'contain' } : { width: '120px', height: 'auto', objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFF2A8', width: '100%' }}>
        <button onClick={onConfirm} style={{ width: '100%', height: '4.375rem', border: 'none', borderBottom: '1px solid rgba(77, 88, 216, 0.2)', backgroundColor: 'transparent', color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", cursor: 'pointer' }}>כן</button>
        <button onClick={onCancel} style={{ width: '100%', height: '4.375rem', border: 'none', backgroundColor: 'transparent', color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", cursor: 'pointer' }}>ביטול</button>
      </div>
    </div>
  </div>
);

const ParticipantInfoTab = ({ participant }: { participant: any }) => (
  <div style={{
    width: '100%',
    maxWidth: '27.5rem',
    margin: '0 auto',
    padding: '0.625rem 1.25rem',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right'
  }}>
    <InfoRow label="מס' טלפון" value={participant?.phone}>
      {participant?.phone && (
        <a href={`tel:${participant.phone}`} style={{
          color: '#4D58D8',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '15px' // דוחף את הכפתור פנימה מהקצה הימני
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </a>
      )}
    </InfoRow>

    <InfoRow label="מעגל" value={participant?.bereavement_circle} />
    <InfoRow label="מייל" value={participant?.email} />
    <InfoRow label="קשר" value={participant?.bereavement_detail} />
    <InfoRow label="תיאור" value={participant?.general_notes} />
  </div>
);

const containerStyle: React.CSSProperties = {
  direction: 'rtl',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: '#FFFCE5'
};

const getTabStyle = (isActive: boolean, isLast: boolean): React.CSSProperties => ({
  flex: 1,
  height: '100%',
  border: 'none',
  borderLeft: !isLast ? '1px solid rgba(255,255,255,0.2)' : 'none',
  backgroundColor: isActive ? '#FFFCE5' : 'transparent',
  color: isActive ? 'var(--Blue-Adamami, #4D58D8)' : 'var(--Off-White-Adamami, #FFFCE5)',
  fontFamily: "'EditorSans_PRO', sans-serif",
  fontSize: '1.25rem',
  fontWeight: 400,
  lineHeight: '98%',
  textAlign: 'center',
  cursor: 'pointer',
  borderRadius: '0',
  outline: 'none',
  padding: 0
});

// Filter out attendance pairs (marked + removed for same participant on same day)
const filterAttendancePairs = (activities: any[]) => {
  // Group attendance activities by participant and date
  const attendanceGroups = new Map<string, any[]>();

  // First pass: collect all attendance activities by participant and date
  activities.forEach((activity) => {
    if (activity.activity_type === 'attendance_marked' || activity.activity_type === 'attendance_removed') {
      const pId = activity.participant_id || 'unknown';
      const dateStr = activity.created_at ? new Date(activity.created_at).toISOString().split('T')[0] : (activity.date || 'unknown');
      const key = `${pId}_${dateStr}`;

      if (!attendanceGroups.has(key)) {
        attendanceGroups.set(key, []);
      }

      attendanceGroups.get(key)!.push(activity);
    }
  });

  // For each group, match pairs (marked + removed) and exclude them
  const excludeIds = new Set<string>();

  attendanceGroups.forEach((groupActivities) => {
    // Sort by created_at/date
    groupActivities.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    // Match pairs: mark each marked/removed pair for exclusion
    const markedStack: any[] = [];
    const removedStack: any[] = [];

    groupActivities.forEach((activity) => {
      if (activity.activity_type === 'attendance_marked') {
        markedStack.push(activity);
      } else {
        removedStack.push(activity);
      }
    });

    // Pair up marked and removed activities (match them)
    while (markedStack.length > 0 && removedStack.length > 0) {
      const marked = markedStack.shift()!;
      const removed = removedStack.shift()!;
      if (marked.id) excludeIds.add(marked.id);
      if (removed.id) excludeIds.add(removed.id);
    }
  });

  // Filter out activities that are part of a pair AND exclude 'attendance_removed' events entirely from display
  // (We only want to show 'attendance_marked' that wasn't cancelled, or other events)
  return activities.filter((activity) => {
    if (excludeIds.has(activity.id)) return false;
    if (activity.activity_type === 'attendance_removed') return false; // Don't show "removed" events alone
    return true;
  });
};

export default function ParticipantCardPage() {
  const [isSuccessMessageOpen, setIsSuccessMessageOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const id = searchParams.get('id');
  const urlName = searchParams.get('name') || ''; // הוספת השורה הזו
  const [updateTarget, setUpdateTarget] = useState('כולם');

  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Auto-close success popup after 2.5 seconds
  useEffect(() => {
    if (isSuccessMessageOpen) {
      const timer = setTimeout(() => {
        setIsSuccessMessageOpen(false);
        setActiveTab('היסטוריה');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccessMessageOpen]);

  // Try to load from cache first for instant display
  const getCachedParticipant = (): Participant | null => {
    if (!id || typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(`participant_${id}`);
      if (cached) {
        const { participant: cachedData, timestamp } = JSON.parse(cached);
        // Use cache if less than 5 minutes old
        if (cachedData && Date.now() - timestamp < 5 * 60 * 1000) {
          return cachedData;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  };

  const cachedParticipant = getCachedParticipant();
  const [participant, setParticipant] = useState<Participant | null>(cachedParticipant);
  const [activities, setActivities] = useState<any[]>(() => {
    if (cachedParticipant) {
      try {
        const parsedUpdates = cachedParticipant.updates ? JSON.parse(cachedParticipant.updates) : [];
        return Array.isArray(parsedUpdates) ? parsedUpdates : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [loading, setLoading] = useState(!cachedParticipant);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bereavement_detail: '',
    bereavement_circle: '',
    email: '',
    phone: '',
    general_notes: ''
  });
  const [activeTab, setActiveTab] = useState('תיק פונה');
  const [isFocused, setIsFocused] = useState(false);


  const fetchActivities = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/activities?participant_id=${id}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  }, [id]);

  const triggerLog = useCallback(async (type: any, description: string, updateContent?: string) => {
    if (!id || !participant || !participant.full_name) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // שליפת המשתמש בדיוק לפי השדות שראינו בקוד ששלחת: first_name ו-last_name
      // שליפת המשתמש בדיוק לפי השדות שראינו בקוד ששלחת: first_name ו-last_name
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('email', authUser.email)
        .single();

      if (userError) {
        console.error("Error fetching user name for log:", userError);
      }

      // חיבור השם המלא
      const firstName = dbUser?.first_name || '';
      const lastName = dbUser?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'חבר/ת צוות';

      if (dbUser) {
        // שליחת הלוג עם החתימה המדויקת
        await logActivity({
          user_id: dbUser.id, // שימוש ב-ID של המשתמש מהדאטה בייס
          activity_type: type,
          participant_id: id,
          participant_name: participant.full_name,
          description: description,
          update_content: updateContent,
          is_public: true,
        });

        console.log("Activity logged successfully by:", fullName);

        // Refresh activities after logging
        fetchActivities();
      }
    } catch (err) {
      console.error("Failed to trigger log:", err);
    }
  }, [id, participant, supabase, fetchActivities]);



  const fetchParticipant = useCallback(async () => {
    if (!id) return;
    // Only show loading if we don't have cached data
    if (!cachedParticipant) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setParticipant(data);
        setEditForm({
          full_name: data.full_name || '',
          bereavement_detail: data.bereavement_detail || '',
          bereavement_circle: data.bereavement_circle || '',
          email: data.email || '',
          phone: data.phone || '',
          general_notes: data.general_notes || ''
        });

        // Fetch activities from the new table
        fetchActivities();

        // Cache participant data for next time
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`participant_${id}`, JSON.stringify({
              participant: data,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Ignore cache errors
          }
        }
      }
    } catch (err) {
      console.error('Error fetching participant:', err);
    } finally {
      setLoading(false);
    }
  }, [id, supabase, cachedParticipant, fetchActivities]);

  useEffect(() => {
    if (id) fetchParticipant();
  }, [id, fetchParticipant]);

  // Dynamically update the theme-color meta tag for mobile browsers
  useThemeColor(participant?.is_archived ? "#949ADD" : "#4D58D8");

  const handleAddUpdate = async () => {
    if (newUpdateText.trim() === '') return;

    // סגירת פופ-אפ הכתיבה מיד
    setIsPopupOpen(false); // Close input popup immediately so success popup shows cleanly

    const today = new Date();


    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}`;
    const newEntry = { id: Date.now(), text: newUpdateText, date: formattedDate };
    const updatedActivities = [newEntry, ...activities];

    setNewUpdateText('');
    // הסרנו את ה-setIsPopupOpen(false) מכאן

    if (id && participant) {
      try {
        // עדכון בסיס הנתונים - ביטלנו את השמירה לטבלה הישנה
        // await supabase
        //   .from('participants')
        //   .update({ updates: JSON.stringify(updatedActivities) })
        //   .eq('id', id);

        // --- כאן הוספנו את הפקודה החדשה כדי שיופיע מיד ---
        setIsSuccessMessageOpen(true);
        // ----------------------------------

        // קריאה לפונקציית הלוג שהיא המקום המרכזי עכשיו
        await triggerLog('status_update' as any, `עדכון סטטוס`, newUpdateText);

        // Cache update is less relevant for activities now that we fetch live,
        // but we keep participant cache for basic info

      } catch (err) {
        console.error("שגיאה בשמירת העדכון:", err);
      }
    }
  };

  const handleArchive = async () => {
    if (!id || !participant) return;
    const newValue = !participant.is_archived;
    const updatedParticipant = { ...participant, is_archived: newValue };
    setParticipant(updatedParticipant);
    const { error } = await supabase.from('participants').update({ is_archived: newValue }).eq('id', id);

    // Update cache with new data
    if (typeof window !== 'undefined' && !error) {
      try {
        localStorage.setItem(`participant_${id}`, JSON.stringify({
          participant: updatedParticipant,
          timestamp: Date.now()
        }));
        // Also invalidate participants list cache so other users see the update
        const cachedParticipants = localStorage.getItem('participants_cache');
        if (cachedParticipants) {
          const cacheData = JSON.parse(cachedParticipants);
          // Mark cache as very old so it refreshes
          cacheData.timestamp = 0;
          localStorage.setItem('participants_cache', JSON.stringify(cacheData));
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    // if (!error && newValue) router.push('/participants');
  };


  const handleMarkAttendance = async () => {
    if (!id || !participant) return;
    const today = new Date().toISOString().split("T")[0];
    const newAttendance = participant.last_attendance === today ? null : today;
    await fetch("/participants/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, last_attendance: newAttendance }),
    });
    const updatedParticipant = { ...participant, last_attendance: newAttendance };
    setParticipant(updatedParticipant);

    // Update cache with new data
    if (typeof window !== 'undefined' && id) {
      try {
        localStorage.setItem(`participant_${id}`, JSON.stringify({
          participant: updatedParticipant,
          timestamp: Date.now()
        }));
        // Also invalidate participants list cache so other users see the update
        const cachedParticipants = localStorage.getItem('participants_cache');
        if (cachedParticipants) {
          const cacheData = JSON.parse(cachedParticipants);
          // Mark cache as very old so it refreshes
          cacheData.timestamp = 0;
          localStorage.setItem('participants_cache', JSON.stringify(cacheData));
        }
      } catch (e) {
        // Ignore cache errors
      }
    }

    // Log activity
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
          participant_id: id,
          participant_name: participant.full_name,
          description: newAttendance
            ? `נוכחות ${participant.full_name}`
            : `הוסרה נוכחות ${participant.full_name}`,
        });
      }
    }
  };

  const attendedToday = participant?.last_attendance === new Date().toISOString().split("T")[0];

  const getLastPhoneCallText = () => {
    if (!participant?.last_phone_call) return "לא נעשו שיחות טלפון בזמן האחרון";
    const lastCallDate = new Date(participant.last_phone_call);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastCallDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  };
  const getLastAttendanceText = () => {
    if (!participant?.last_attendance) return "לא נמצאה";

    const lastDate = new Date(participant.last_attendance);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;

    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "לפני שבוע" : `לפני ${weeks} שבועות`;
  };

  const allEvents = useMemo(() => {
    const events: any[] = [];

    // 1. הוספת עדכוני סטטוס מטבלת המשתתף
    // 1. הוספת עדכוני סטטוס מטבלת user_activities החדשה
    activities.forEach(act => {
      // נתמוך גם בפורמט הישן וגם בחדש
      let dateObj = new Date();
      let text = '';

      // פורמט חדש מהשרת
      if (act.created_at) {
        dateObj = new Date(act.created_at);
        text = act.update_content || act.description || '';
      }
      // תמיכה לאחור בפורמט הישן (אם יש עדיין באובייקט)
      else if (act.date) {
        const parts = (act.date || "").split('/');
        dateObj = parts.length === 2 ? new Date(new Date().getFullYear(), Number(parts[1]) - 1, Number(parts[0])) : new Date();
        text = act.text || '';
      }

      // נציג רק אם יש תוכן רלוונטי
      if (text && (act.activity_type === 'status_update' || act.type === 'status' || !act.activity_type)) {
        events.push({
          type: 'status',
          text: text,
          date: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
          originalDate: dateObj,
          author: act.user_name || act.user_display_name || '' // אופציה להציג מי כתב
        });
      }
    });

    // 2. הוספת אירוע נוכחות
    if (participant?.last_attendance) {
      const d = new Date(participant.last_attendance);
      events.push({
        type: 'attendance',
        text: 'נוכחות',
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        originalDate: d
      });
    }

    // 3. הוספת אירוע שיחת טלפון
    if (participant?.last_phone_call) {
      const d = new Date(participant.last_phone_call);
      events.push({
        type: 'phone',
        text: 'שיחת טלפון',
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        originalDate: d
      });
    }

    // מיון מהחדש לישן
    return events.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
  }, [activities, participant?.last_attendance, participant?.last_phone_call]);
  const displayName = isEditing ? editForm.full_name : (participant ? participant.full_name : urlName);

  return (
    <div style={containerStyle}>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-textarea::placeholder {
          color: var(--Light-blue-Adamami, #949ADD);
          text-align: right;
          font-family: 'EditorSans_PRO', sans-serif;
          font-size: 1.5rem;
          font-style: italic;
          font-weight: 400;
          line-height: 98%;
        }
      `}</style>
      {/* --- Header ثابت --- */}
      <div style={{ flexShrink: 0, zIndex: 10, width: '100%' }}>
        <div style={{
          backgroundColor: participant?.is_archived ? '#949ADD' : '#4D58D8',
          padding: '1.25rem 1.875rem',
          paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
          width: '100%',
          color: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '23.75rem',
            paddingTop: '1.25rem',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '15px',
            margin: '0 auto'
          }}>

            <div style={{ color: 'white' }}>
              <BackButton />
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                style={{ fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontStyle: 'normal', flex: 1, textAlign: 'right', border: 'none', outline: 'none', color: 'white', background: 'transparent' }}
              />
            ) : (
              <div style={{ flex: 1, textAlign: 'right' }}>
                <h2 style={{
                  fontSize: '1.875rem',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '98%',
                  textAlign: 'right',
                  margin: 0,
                  color: 'var(--Off-White-Adamami, #FFFCE5)'
                }}>
                  {displayName}
                </h2>
                <div style={{
                  fontSize: '1.25rem',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontStyle: 'italic',
                  fontWeight: 300,
                  lineHeight: '98%',
                  textAlign: 'right',
                  marginTop: '4px',
                  color: 'var(--Off-White-Adamami, #FFFCE5)',
                  whiteSpace: 'nowrap'
                }}>
                  {participant?.is_archived
                    ? 'נמצא.ת בארכיון'
                    : `נוכחות אחרונה: ${getLastAttendanceText()}`
                  }
                </div>
              </div>
            )}

            {!isEditing && !participant?.is_archived && (
              <div
                onClick={handleMarkAttendance}
                style={{
                  display: 'flex',
                  height: '1.6875rem',
                  padding: '0 1.25rem 0 0.625rem',
                  alignItems: 'center',
                  gap: '0.625rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '6px',
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: attendedToday ? 'white' : 'transparent'
                }}>
                  {attendedToday && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4D58D8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              </div>
            )}

            {!isEditing && participant?.is_archived && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <img
                  src="/archive.svg"
                  alt="ארכיון"
                  style={{
                    display: 'flex',
                    width: '1.6875rem',
                    height: '1.6875rem',
                    padding: '0.0625rem',
                    justifyContent: 'center',
                    alignItems: 'center',
                    objectFit: 'contain'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'white' }}></span>
              </div>
            )}
          </div>
        </div>

        {/* --- טאבים --- */}
        <div style={{
          width: '100%',
          backgroundColor: participant?.is_archived ? '#949ADD' : '#4D58D8',
          display: 'flex',
          justifyContent: 'center',
          direction: 'rtl'
        }}>
          <div style={{
            display: 'flex',
            width: '100%',
            maxWidth: '27.5rem',
            height: '4rem',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            {['תיק פונה', 'עדכון חדש', 'היסטוריה'].map((tab, index, array) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={getTabStyle(activeTab === tab, index === array.length - 1)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: '220px', width: '100%' }}>
        {activeTab === 'תיק פונה' && (
          <>
            <div style={{
              width: '100%',
              maxWidth: '27.5rem',
              margin: '0 auto',
              padding: '0.625rem 1.25rem',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'right',
              paddingBottom: '160px' // מרווח גדול למטה כדי שהתוכן לא יתחבא מאחורי הכפתורים הסטטיים
            }}>

              {/* נתוני פונה */}
              <InfoRow label="שם מלא" value={participant?.full_name} isArchived={participant?.is_archived} />

              <div style={{ position: 'relative' }}>
                <InfoRow label="מס' טלפון" value={participant?.phone} isArchived={participant?.is_archived} />
                {!participant?.is_archived && participant?.phone && (
                  <a href={`tel:${participant.phone}`} style={{ position: 'absolute', left: '20px', top: '25px', width: '1.6875rem', height: '1.6875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/TELL.svg" alt="Call" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </a>
                )}
              </div>

              <InfoRow label="מעגל" value={participant?.bereavement_circle} isArchived={participant?.is_archived} />
              <InfoRow label="מייל" value={participant?.email} isArchived={participant?.is_archived} />
              <InfoRow label="קשר" value={participant?.bereavement_detail} isArchived={participant?.is_archived} />
              <InfoRow label="תיאור" value={participant?.general_notes} isArchived={participant?.is_archived} />
            </div>

            {/* הכפתורים הסטטיים - נשארים בתוך התנאי של הטאב */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              backgroundColor: '#FFF2A8',
              display: 'flex',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '27.5rem',
                alignItems: 'center',
                flexShrink: 0
              }}>
                {/* כפתור ארכיון */}
                <button
                  onClick={() => setIsArchiveConfirmOpen(true)}
                  style={{
                    width: '100%',
                    height: '4.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',

                    backgroundColor: 'transparent',
                    color: '#4D58D8',
                    border: '1px solid #4D58D8', // הוספת קו גבול מסביב
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderRadius: '0',
                    textAlign: 'center',
                    fontFamily: "'EditorSans_PRO', sans-serif",
                    fontSize: '1.875rem',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '98%',
                    cursor: 'pointer'

                  }}
                >
                  {participant?.is_archived ? 'הוצאה מהארכיון' : 'העברה לארכיון'}
                </button>

                {/* כפתור עריכה */}
                <button
                  onClick={() => router.push(`/edit-participant?id=${id}`)}
                  style={{
                    width: '100%',
                    height: '4.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #4D58D8', // הוספת קו גבול מסביב
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '0',
                    color: '#4D58D8',
                    textAlign: 'center',
                    fontFamily: "'EditorSans_PRO', sans-serif",
                    fontSize: '1.875rem',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '98%',
                    cursor: 'pointer'
                  }}
                >
                  עריכה
                </button>
              </div>
            </div>
          </>
        )}
        {activeTab === 'עדכון חדש' && (
          <>
            <div style={{
              width: '100%',
              maxWidth: '27.5rem',
              margin: '0 auto',
              padding: '1.25rem',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'right',
              paddingBottom: '100px' // ריווח כדי שהתוכן לא יוסתר על ידי כפתור השליחה
            }}>
              {/* כותרת הטאב */}
              <h3 style={{
                color: '#4D58D8',
                fontFamily: "'EditorSans_PRO', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 'normal',
                margin: '0 0 10px 0'
              }}>עדכון חדש</h3>

              {/* קו עליון */}
              <div style={{ borderBottom: '1px solid rgba(77, 88, 216, 0.3)', marginBottom: '15px' }}></div>

              {/* תיבת הטקסט */}
              <textarea
                className="custom-textarea"
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isFocused ? '' : 'למשל: "התחילה ללכת לקבוצת אריגה", "יש לו היום יום הולדת", או "אובחנה כפוסט טראומטית".'}
                style={{
                  width: '100%',
                  minHeight: '150px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontSize: '1.25rem',
                  color: '#4D58D8',
                  resize: 'none',
                  textAlign: 'right',
                  padding: '5px 0'
                }}
              />

              {/* קו תחתון של תיבת הטקסט */}
              <div style={{ borderBottom: '1px solid rgba(77, 88, 216, 0.3)', marginTop: '15px' }}></div>

              {/* בחירת קהל יעד לעדכון */}
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{
                  color: '#4D58D8',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 'normal',
                  margin: 0
                }}>את מי לעדכן?</h4>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '20px',
                  direction: 'rtl'
                }}>
                  {/* אופציה: כולם */}
                  <div
                    onClick={() => setUpdateTarget('כולם')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '1.5px solid #4D58D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {updateTarget === 'כולם' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />}
                    </div>
                    <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.1rem', color: '#4D58D8' }}>כולם</span>
                  </div>

                  <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(77, 88, 216, 0.3)' }}></div>

                  {/* אופציה: מנהלות.ים */}
                  <div
                    onClick={() => setUpdateTarget('מנהלות.ים')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '1.5px solid #4D58D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {updateTarget === 'מנהלות.ים' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />}
                    </div>
                    <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.1rem', color: '#4D58D8' }}>מנהלות.ים</span>
                  </div>
                </div>
              </div>
            </div>

            {/* כפתור שליחה סטטי בתחתית */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              backgroundColor: '#FFF2A8',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <button
                onClick={handleAddUpdate}
                style={{
                  width: '100%',
                  maxWidth: '27.5rem',
                  height: '4.375rem', // גובה לפי פיגמה כמו בכפתורי העריכה
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#4D58D8',
                  textAlign: 'center',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontSize: '1.875rem',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '98%',
                  cursor: 'pointer'
                }}
              >
                שליחה
              </button>
            </div>
          </>
        )}
        {activeTab === 'היסטוריה' && (
          <div style={{ width: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFCE5', minHeight: '100vh', paddingBottom: '8rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#4D58D8' }}>טוען...</div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#949ADD' }}>אין פעילויות עדיין</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filterAttendancePairs(activities).map((activity, index) => {
                  // Parsing Date
                  let dateObj = new Date();
                  let formattedDate = "";
                  if (activity.created_at) {
                    dateObj = new Date(activity.created_at);
                  } else if (activity.date) {
                    // Fallback for old updates format DD/MM
                    const parts = activity.date.split('/');
                    if (parts.length === 2) {
                      const now = new Date();
                      dateObj = new Date(now.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    }
                  }
                  const day = dateObj.getDate();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  formattedDate = `${day}/${month}`;

                  // Determining Type and Content
                  const activityType = activity.activity_type || 'status_update'; // Default to status update if missing
                  const authorName = activity.user_name || 'חבר/ת צוות';
                  const authorRole = activity.user_role || '';
                  const performerString = `ע"י ${authorName} ${authorRole}`.trim();

                  let actionName = "";
                  let details = "";
                  let iconSrc = "";
                  let useFilter = true;

                  switch (activityType) {
                    case 'attendance_marked':
                      actionName = "נוכחות";
                      iconSrc = "/icons/checkbox-checked.svg";
                      useFilter = false;
                      break;
                    case 'phone_call':
                      actionName = "שיחת טלפון";
                      iconSrc = "/icons/phone_call.svg";
                      break;
                    case 'status_update':
                    default:
                      actionName = "עדכון סטטוס";
                      iconSrc = "/icons/status_update.svg";
                      // Logic for details
                      if (activity.update_content) {
                        details = activity.update_content;
                      } else if (activity.description) {
                        // Clean defaults like "Update Status..."
                        const desc = activity.description;
                        if (desc.includes(':')) {
                          details = desc.split(':')[1].trim();
                        } else {
                          details = desc;
                        }
                      } else if (activity.text) { // Old format
                        details = activity.text;
                      }
                      break;
                  }

                  return (
                    <div key={activity.id || index} style={{
                      padding: '0.75rem 0',
                      display: 'flex',
                      flexDirection: 'row', // RTL default direction
                      alignItems: 'stretch', // Stretch to make vertical line full height
                      gap: '0',
                      borderBottom: '1px solid #4D58D8',
                      position: 'relative',
                      direction: 'rtl',
                      width: '100%'
                    }}>

                      {/* Date Column (Right) */}
                      <div style={{
                        width: '3.75rem',
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: '0.2rem', // Align with text baseline
                        flexShrink: 0
                      }}>
                        <span style={{
                          fontSize: '1.25rem',
                          color: '#4D58D8',
                          fontFamily: 'EditorSans_PRO',
                          fontWeight: '400',

                        }}>
                          {formattedDate}
                        </span>
                      </div>

                      {/* Vertical Blue Line */}
                      <div style={{
                        position: 'absolute',
                        right: '4.25rem',
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: '#4D58D8'
                      }}></div>

                      {/* Content Column (Left of line) */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        paddingRight: '1rem', // Push content away from the absolute line
                        minWidth: 0 // Allow text truncation/wrapping
                      }}>

                        {/* Header Row: Text + Icon */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center', // Align center for safety
                          width: '100%',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {/* Icon (Rightmost in RTL) */}
                          <div style={{
                            position: 'relative',
                            width: '1rem',
                            height: '1rem',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center' // Center icon vertically relative to line
                          }}>
                            <Image
                              src={iconSrc}
                              alt={activityType}
                              fill
                              style={{
                                objectFit: 'contain',
                                // Filter to convert black to #4D58D8 only if needed
                                filter: useFilter ? 'brightness(0) saturate(100%) invert(32%) sepia(50%) saturate(3007%) hue-rotate(224deg) brightness(90%) contrast(92%)' : 'none'
                              }}
                            />
                          </div>

                          {/* Title Text (Left of Icon) */}
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.3rem',
                            alignItems: 'baseline'
                          }}>
                            <span style={{
                              color: '#4D58D8',
                              fontFamily: 'EditorSans_PRO',
                              fontSize: '1.5rem',
                              fontStyle: 'italic',
                              fontWeight: 400,
                              lineHeight: '98%',
                            }}>{actionName}</span>

                            <span style={{
                              color: '#949ADD',
                              fontFamily: 'EditorSans_PRO',
                              fontSize: '1.25rem',
                              fontStyle: 'italic',
                              fontWeight: 300,
                              lineHeight: '98%',
                            }}>- {performerString}</span>
                          </div>
                        </div>

                        {/* Details Row */}
                        {details && (
                          <div style={{
                            color: '#4D58D8',
                            textAlign: 'right',
                            fontFamily: 'EditorSans_PRO',
                            fontSize: '1.25rem',
                            fontStyle: 'italic',
                            fontWeight: 300,
                            lineHeight: '98%',
                            marginTop: '0.5rem',
                            paddingRight: '0.5rem', // Check padding
                            marginRight: '0.45rem', // Push slightly to align visually with text start
                            borderRight: '1px solid #4D58D8', // "Add a line before"
                            paddingLeft: '0.5rem',
                            wordBreak: 'break-word',
                            width: 'fit-content'
                          }}>
                            {details}
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}{/* פופ-אפ אישור שליחה - מעוצב בדיוק כמו הארכיון */}
        {/* פופ-אפ אישור שליחה - מעוצב בדיוק כמו הארכיון עם התמונה המבוקשת */}
        {isSuccessMessageOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(77, 88, 216, 0.50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#FFFCE5',
              border: 'none',
              borderRadius: '0', // Matching New Participant style
              display: 'flex',
              width: '21.6875rem',
              height: '21.8125rem', // Matching successModalContent height
              padding: '0.625rem 0 1.875rem 0', // Matching padding
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '1rem', // Gap between elements
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              animation: 'modalSlideIn 0.15s ease-out'
            }}>
              <style>{`
                @keyframes modalSlideIn {
                  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                  to { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}</style>

              {/* Title */}
              <h3 style={{
                fontSize: '1.875rem',
                fontWeight: '400',
                color: '#4D58D8',
                margin: 0,
                textAlign: 'center',
                padding: '0.5rem 2rem 0 2rem',
                lineHeight: '1.5',
                fontFamily: "'EditorSans_PRO', sans-serif"
              }}>
                העדכון נשלח בהצלחה!
              </h3>

              {/* Illustration */}
              <div style={{
                width: '10.1875rem',
                height: '12.9375rem',
                padding: 0,
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src="/UPDATE.svg"
                  alt="אישור שליחה"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>

              {/* No footer/buttons needed as it auto-closes */}
            </div>
          </div>
        )}








        {isPopupOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(77, 88, 216, 0.50)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '85%', maxWidth: '350px' }}>
              <h3 style={{ marginTop: 0 }}>הוספת עדכון חדש</h3>
              <textarea value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} placeholder="כתבי כאן..." style={{ width: '100%', height: '100px', marginBottom: '15px', padding: '10px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleAddUpdate} style={{ flex: 1, padding: '10px', backgroundColor: '#4D58D8', color: 'white', border: 'none', borderRadius: '4px' }}>סיים</button>
                <button onClick={() => setIsPopupOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#eee', border: 'none', borderRadius: '4px' }}>ביטול</button>
              </div>
            </div>
          </div>
        )}











      </div>

      {/* הוספת רווח בתחתית הדף כדי שהכפתורים לא יסתירו את התוכן האחרון */}
      {/* ... כל הקוד הקיים של הכפתורים הסטטיים ... */}

      {isArchiveConfirmOpen && (
        <ArchiveConfirmPopup
          isArchived={!!participant?.is_archived}
          onConfirm={() => { handleArchive(); setIsArchiveConfirmOpen(false); }}
          onCancel={() => setIsArchiveConfirmOpen(false)}
        />
      )}

    </div > // זה ה-div שסוגר את הכל
  );
}