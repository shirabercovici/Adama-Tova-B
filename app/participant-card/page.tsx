"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import BackButton from '../../components/BackButton';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/app/participants/types';
import { logActivity } from '@/lib/activity-logger';

export default function ParticipantCardPage() {
  const [isSuccessMessageOpen, setIsSuccessMessageOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
const [updateTarget, setUpdateTarget] = useState('כולם');
  const id = searchParams.get('id');
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [loading, setLoading] = useState(false);

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

const triggerLog = useCallback(async (type: any, description: string) => {
  if (!id || !participant || !participant.full_name) return;
  
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // שליפת המשתמש בדיוק לפי השדות שראינו בקוד ששלחת: first_name ו-last_name
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('email', authUser.email)
      .single();

    if (userError) {
      console.error("Error fetching user name for log:", userError);
    }

    // חיבור השם המלא
    const firstName = dbUser?.first_name || '';
    const lastName = dbUser?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'חבר/ת צוות';

    // שליחת הלוג עם החתימה המדויקת
    await logActivity({
      user_id: authUser.id, // משתמשים ב-ID של ה-Auth ליתר ביטחון
      activity_type: type,
      participant_id: id,
      participant_name: participant.full_name,
      description: `${description} [DONE_BY:${fullName}]`,
    });
    
    console.log("Activity logged successfully by:", fullName);
  } catch (err) {
    console.error("Failed to trigger log:", err);
  }
}, [id, participant, supabase]);

  const fetchParticipant = useCallback(async () => {
    if (!id) return;
    setLoading(true);
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

        try {
          const parsedUpdates = data.updates ? JSON.parse(data.updates) : [];
          setActivities(Array.isArray(parsedUpdates) ? parsedUpdates : []);
        } catch (e) {
          setActivities([]);
        }
      }
    } catch (err) {
      console.error('Error fetching participant:', err);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (id) fetchParticipant();
  }, [id, fetchParticipant]);

const handleAddUpdate = async () => {
    if (newUpdateText.trim() === '') return;
    
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}`;
    const newEntry = { id: Date.now(), text: newUpdateText, date: formattedDate };
    const updatedActivities = [newEntry, ...activities];

    setActivities(updatedActivities);
    setNewUpdateText('');
    // הסרנו את ה-setIsPopupOpen(false) מכאן

    if (id && participant) {
      try {
        // עדכון בסיס הנתונים
        await supabase
          .from('participants')
          .update({ updates: JSON.stringify(updatedActivities) })
          .eq('id', id);

        // קריאה לפונקציית הלוג
        await triggerLog('status_update' as any, `עדכון סטטוס ${participant.full_name}: ${newUpdateText}`);

        // --- כאן הוספנו את הפקודה החדשה ---
        setIsSuccessMessageOpen(true); 
        // ----------------------------------

      } catch (err) {
        console.error("שגיאה בשמירת העדכון:", err);
      }
    }
};  

  const handleArchive = async () => {
    if (!id || !participant) return;
    const newValue = !participant.is_archived;
    setParticipant({ ...participant, is_archived: newValue });
    const { error } = await supabase.from('participants').update({ is_archived: newValue }).eq('id', id);
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
    setParticipant({ ...participant, last_attendance: newAttendance });

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
  if (!participant?.last_attendance) return "טרם נרשמה נוכחות";
  
  const lastDate = new Date(participant.last_attendance);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - lastDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return `לפני ${Math.floor(diffDays / 7)} שבועות`;
};

const allEvents = useMemo(() => {
  const events = [];
  
  // הוספת עדכונים
  activities.forEach(act => {
    const parts = act.date.split('/');
    events.push({ 
      type: 'status', 
      text: act.text, 
      date: act.date, 
      originalDate: new Date(2024, Number(parts[1]) - 1, Number(parts[0])) 
    });
  });

  // הוספת נוכחות
  if (participant?.last_attendance) {
    const d = new Date(participant.last_attendance);
    events.push({ type: 'attendance', text: 'נוכחות', date: `${d.getDate()}/${d.getMonth() + 1}`, originalDate: d });
  }

  // הוספת שיחת טלפון
  if (participant?.last_phone_call) {
    const d = new Date(participant.last_phone_call);
    events.push({ type: 'phone', text: 'שיחת טלפון', date: `${d.getDate()}/${d.getMonth() + 1}`, originalDate: d });
  }

  return events.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
}, [activities, participant?.last_attendance, participant?.last_phone_call]);

const displayName = isEditing ? editForm.full_name : (participant?.full_name || 'טוען...');  const InfoRow = ({ label, value }: { label: string, value: any }) => (
    <div style={{ padding: '10px 0' }}>
      <div style={{ color: '#4D58D8', fontFamily: "'EditorSans_PRO', sans-serif", fontSize: '1.5rem', fontStyle: 'normal', marginBottom: '5px' }}>{label}</div>
      <div style={{ color: '#4D58D8', fontFamily: "'EditorSans_PRO', sans-serif", fontSize: '1.25rem', fontStyle: 'normal' }}>{value || '---'}</div>
      <div style={{ borderBottom: '1px solid rgba(77, 88, 216, 0.3)', marginTop: '10px' }}></div>
    </div>
  );
  return (
    <div style={{
      direction: 'rtl',
      position: 'fixed', // עוקף את הגבלות ה-Layout
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50, // מבטיח שזה מעל הכל
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#FEFCE8'
    }}>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* --- Header ثابت --- */}
      <div style={{ flexShrink: 0, zIndex: 10, width: '100%' }}>
        <div style={{
          backgroundColor: participant?.is_archived ? '#949ADD' : '#4D58D8',
          padding: '1.25rem 1.875rem',
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
  <h2 style={{ fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontStyle: 'normal', fontWeight: 'normal', margin: 0, color: 'white' }}>
    {displayName}
  </h2>
  
  {/* אם הפונה בארכיון - הצג הודעת ארכיון */}
  {participant?.is_archived ? (
    <div style={{ fontSize: '1rem', fontFamily: "'EditorSans_PRO', sans-serif", color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
      נמצא.ת בארכיון
    </div>
  ) : (
    /* אם הפונה לא בארכיון - הצג נוכחות אחרונה */
    <div style={{ fontSize: '1rem', fontFamily: "'EditorSans_PRO', sans-serif", color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px' }}>
      נוכחות אחרונה: {getLastAttendanceText()}
    </div>
  )}
</div>
            )}

            {!isEditing && !participant?.is_archived && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <input
                  type="checkbox"
                  checked={attendedToday}
                  onChange={handleMarkAttendance}
                  style={{ width: '25px', height: '25px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'white' }}></span>
              </div>
            )}

            {!isEditing && participant?.is_archived && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <img
                  src="/Group 281.png"
                  alt="ארכיון"
                  style={{ width: '25px', height: '25px', objectFit: 'contain' }}
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
            height: '4.375rem',
            alignItems: 'center',
          }}>
            {['תיק פונה', 'עדכון חדש', 'היסטוריה'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  height: '100%',
                  border: 'none',
                  borderLeft: tab !== 'היסטוריה' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  backgroundColor: activeTab === tab ? '#FEFCE8' : 'transparent',
                  color: activeTab === tab ? '#4D58D8' : 'white',
                  fontFamily: "'EditorSans_PRO', sans-serif",
                  fontSize: '1rem',
                  cursor: 'pointer',
                  borderRadius: '0',
                  outline: 'none',
                  padding: 0
                }}
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
      <InfoRow label="שם מלא" value={participant?.full_name} />
      
      <div style={{ position: 'relative' }}>
        <InfoRow label="מס' טלפון" value={participant?.phone} />
        {participant?.phone && (
          <a href={`tel:${participant.phone}`} style={{ position: 'absolute', left: '20px', top: '25px', color: '#4D58D8', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </a>
        )}
      </div>

      <InfoRow label="מעגל" value={participant?.bereavement_circle} />
      <InfoRow label="מייל" value={participant?.email} />
      <InfoRow label="קשר" value={participant?.bereavement_detail} />
      <InfoRow label="תיאור" value={participant?.general_notes} />
    </div>

    {/* הכפתורים הסטטיים - נשארים בתוך התנאי של הטאב */}
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
            border: 'none',
            borderBottom: '1px solid rgba(77, 88, 216, 0.2)',
            backgroundColor: 'transparent',
            color: '#4D58D8',
            fontSize: '1.875rem',
            fontFamily: "'EditorSans_PRO', sans-serif",
            fontStyle: 'normal',
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
            border: 'none',
            backgroundColor: 'transparent',
            color: '#4D58D8',
            fontSize: '1.875rem',
            fontFamily: "'EditorSans_PRO', sans-serif",
            fontStyle: 'normal',
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
        value={newUpdateText}
        onChange={(e) => setNewUpdateText(e.target.value)}
        placeholder='למשל: "התחילה ללכת לקבוצת אריגה", "יש לו היום יום הולדת", או "אובחנה כפוסט טראומטית".'
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
          fontSize: '1.875rem', // גודל פונט תואם לעיצוב שלך
          fontFamily: "'EditorSans_PRO', sans-serif",
          cursor: 'pointer'
        }}
      >
        שליחה
      </button>
    </div>
  </>
)}
{activeTab === 'היסטוריה' && (
  <div style={{ width: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', backgroundColor: '#FEFCE8', minHeight: '100vh' }}>
    {loading ? (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#4D58D8' }}>טוען...</div>
    ) : allEvents.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#949ADD' }}>אין פעילויות עדיין</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {allEvents.map((activity, index) => (
          <div key={index} style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderBottom: '0.0625rem solid rgba(77, 88, 216, 0.1)', position: 'relative', direction: 'rtl' }}>
            
            {/* קו אנכי עיצובי */}
            <div style={{ position: 'absolute', right: '3.75rem', top: 0, bottom: 0, width: '0.0625rem', background: 'rgba(77, 88, 216, 0.2)' }}></div>

            {/* תאריך */}
            <div style={{ fontSize: '1.25rem', color: '#4D58D8', width: '3.75rem', textAlign: 'right', flexShrink: 0, fontWeight: '400', order: 1 }}>
              {activity.date}
            </div>

            {/* אייקון */}
            <div style={{ color: '#4D58D8', width: '1.25rem', order: 2, display: 'flex', justifyContent: 'center', zIndex: 1, backgroundColor: '#FEFCE8', padding: '2px 0' }}>
               {/* כאן האייקון שלך מופיע */}
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>

            {/* --- זה החלק שאת מחליפה - תיקון התצוגה לבדיקה --- */}
            <div style={{ flex: 1, textAlign: 'right', order: 3, fontFamily: 'EditorSans_PRO' }}>
              {(() => {
                const fullText = activity.text || "";
                const signatureTag = "[DONE_BY:";
                const sigIndex = fullText.indexOf(signatureTag);
                
                let doneByName = "לא נמצאה חתימה"; 
                let cleanDisplayDescription = fullText;

                if (sigIndex !== -1) {
                  const endTagIndex = fullText.lastIndexOf(']');
                  doneByName = fullText.substring(sigIndex + signatureTag.length, endTagIndex).trim();
                  cleanDisplayDescription = fullText.substring(0, sigIndex).trim();
                }

                return (
                  <div style={{ border: '1px dashed #4D58D8', padding: '5px', borderRadius: '5px', backgroundColor: 'rgba(77, 88, 216, 0.05)' }}>
                    <div style={{ fontSize: '1.3rem', color: '#4D58D8', fontWeight: 'bold' }}>
                      {cleanDisplayDescription}
                    </div>
                    
                    <div style={{ fontSize: '1rem', color: 'red', fontWeight: 'bold', marginTop: '5px' }}>
                       מבצע שזוהה: {doneByName}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px', direction: 'ltr', textAlign: 'left' }}>
                      Raw: {fullText}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* --- סוף החלק להחלפה --- */}

          </div>
        ))}
      </div>
    )}
  </div>
)}{/* פופ-אפ אישור שליחה - מעוצב בדיוק כמו הארכיון */}
{/* פופ-אפ אישור שליחה - מעוצב בדיוק כמו הארכיון עם התמונה המבוקשת */}
{isSuccessMessageOpen && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '21.6875rem',
      maxWidth: '90vw',
      height: '28.75rem',
      maxHeight: '80vh',
      paddingTop: '0.625rem',
      backgroundColor: '#FEFCE8',
      borderRadius: '15px',
      overflow: 'hidden',
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      {/* כותרת הפופ-אפ */}
      <div style={{ padding: '25px 20px 10px 20px', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: 0, color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontStyle: 'normal', fontWeight: 'normal' }}>
          העדכון נשלח בהצלחה!
        </h3>
      </div>

      {/* התמונה מהתיקייה הציבורית */}
      <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
        <img
          src="/archive-image.svg"
          alt="אישור שליחה"
          style={{ width: '120px', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* אזור הכפתור בתחתית */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFF2A8', width: '100%' }}>
        <button
          onClick={() => {
            setIsSuccessMessageOpen(false);
            setActiveTab('היסטוריה');
          }}
          style={{
            width: '100%',
            height: '4.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#4D58D8',
            fontSize: '1.875rem',
            fontFamily: "'EditorSans_PRO', sans-serif",
            fontStyle: 'normal',
            cursor: 'pointer'
          }}
        >
          סגירה
        </button>
      </div>
    </div>
  </div>
)}








        {isPopupOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
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
      {
        isArchiveConfirmOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '21.6875rem',
              maxWidth: '90vw', // למקרה של מסכים צרים מאוד
              height: '28.75rem',
              maxHeight: '80vh', // מונע יציאה מהמסך בטלפונים קטנים
              paddingTop: '0.625rem',
              backgroundColor: '#FEFCE8',
              borderRadius: '15px',
              overflow: 'hidden',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {participant?.is_archived ? (
                <>
                  {/* פופ-אפ שחזור מארכיון */}
                  <div style={{ padding: '25px 20px 10px 20px', width: '100%', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontStyle: 'normal', fontWeight: 'normal' }}>להוציא מהארכיון?</h3>
                  </div>

                  <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
                    <img
                      src="/popup archive.png"
                      alt="שחזור מארכיון"
                      style={{ width: '120px', height: 'auto', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFF2A8', width: '100%' }}>
                    <button
                      onClick={() => {
                        handleArchive(); // מבצע את השחזור
                        setIsArchiveConfirmOpen(false); // סוגר את הפופ-אפ
                      }}
                      style={{
                        width: '100%',
                        height: '4.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        borderBottom: '1px solid rgba(77, 88, 216, 0.2)',
                        backgroundColor: 'transparent',
                        color: '#4D58D8',
                        fontSize: '1.875rem',
                        fontFamily: "'EditorSans_PRO', sans-serif",
                        fontStyle: 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      כן
                    </button>
                    <button
                      onClick={() => setIsArchiveConfirmOpen(false)}
                      style={{
                        width: '100%',
                        height: '4.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#4D58D8',
                        fontSize: '1.875rem',
                        fontFamily: "'EditorSans_PRO', sans-serif",
                        fontStyle: 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* פופ-אפ העברה לארכיון (הקיים) */}
                  <div style={{ padding: '25px 20px 10px 20px', width: '100%', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, color: '#4D58D8', fontSize: '1.875rem', fontFamily: "'EditorSans_PRO', sans-serif", fontStyle: 'normal', fontWeight: 'normal' }}>להעביר לארכיון?</h3>
                  </div>

                  <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
                    <img
                      src="/archive-image.SVG"
                      alt="ארכיון"
                      style={{ width: '120px', height: 'auto', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFF2A8', width: '100%' }}>
                    <button
                      onClick={() => {
                        handleArchive(); // מבצע את הארכוב
                        setIsArchiveConfirmOpen(false); // סוגר את הפופ-אפ
                      }}
                      style={{
                        width: '100%',
                        height: '4.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        borderBottom: '1px solid rgba(77, 88, 216, 0.2)',
                        backgroundColor: 'transparent',
                        color: '#4D58D8',
                        fontSize: '1.875rem',
                        fontFamily: "'EditorSans_PRO', sans-serif",
                        fontStyle: 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      כן
                    </button>
                    <button
                      onClick={() => setIsArchiveConfirmOpen(false)}
                      style={{
                        width: '100%',
                        height: '4.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#4D58D8',
                        fontSize: '1.875rem',
                        fontFamily: "'EditorSans_PRO', sans-serif",
                        fontStyle: 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }

    </div > // זה ה-div שסוגר את הכל
  );
}