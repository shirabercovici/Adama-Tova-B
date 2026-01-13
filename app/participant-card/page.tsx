"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import BackButton from '../../components/BackButton';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/app/participants/types';

export default function ParticipantCardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

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
  const urlName = searchParams.get('name') || 'פונה חדש';

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
    setIsPopupOpen(false);

    if (id) {
      await supabase.from('participants').update({ updates: JSON.stringify(updatedActivities) }).eq('id', id);
    }
  };

  const handleArchive = async () => {
    if (!id || !participant) return;
    const newValue = !participant.is_archived;
    setParticipant({ ...participant, is_archived: newValue });
    const { error } = await supabase.from('participants').update({ is_archived: newValue }).eq('id', id);
    if (!error && newValue) router.push('/participants');
  };

  const handleSaveChanges = async () => {
    if (!id || !participant) return;
    try {
      await supabase.from('participants').update(editForm).eq('id', id);
      setParticipant({ ...participant, ...editForm });
      setIsEditing(false);
    } catch (err) {
      alert('שגיאה בשמירה');
    }
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
  };

  const attendedToday = participant?.last_attendance === new Date().toISOString().split("T")[0];

  const getLastPhoneCallText = () => {
    if (!participant?.last_phone_call) return "לא נעשו שיחות טלפון בזמן האחרון";
    const lastCallDate = new Date(participant.last_phone_call);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastCallDate.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  };

  const getAllEvents = () => {
    const events = [];
    activities.forEach(act => {
      const parts = act.date.split('/');
      events.push({ type: 'status', text: act.text, date: act.date, originalDate: new Date(2024, parts[1]-1, parts[0]) });
    });
    if (participant?.last_attendance) {
      const d = new Date(participant.last_attendance);
      events.push({ type: 'attendance', text: 'נוכחות', date: `${d.getDate()}/${d.getMonth() + 1}`, originalDate: d });
    }
    if (participant?.last_phone_call) {
      const d = new Date(participant.last_phone_call);
      events.push({ type: 'phone', text: 'שיחת טלפון', date: `${d.getDate()}/${d.getMonth() + 1}`, originalDate: d });
    }
    return events.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
  };

  const allEvents = getAllEvents();
  const displayName = isEditing ? editForm.full_name : (participant ? participant.full_name : urlName);
const InfoRow = ({ label, value }: { label: string, value: any }) => (
  <div style={{ padding: '10px 0' }}>
    <div style={{ color: '#4D58D8', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{label}</div>
    <div style={{ color: '#4D58D8', fontSize: '1rem' }}>{value || '---'}</div>
    <div style={{ borderBottom: '1px solid rgba(77, 88, 216, 0.3)', marginTop: '10px' }}></div>
  </div>
);
  return (
    <div style={{ direction: 'rtl' }}>
{/* --- ה-Header המושלם: נצמד למעלה ולצדדים --- */}
<div style={{ 
  backgroundColor: '#4D58D8', 
  padding: '40px 20px 20px 20px', // הוספתי יותר פדינג למעלה (40px) כדי שהטקסט לא יהיה צמוד מדי לתקרה
  margin: '-20px -50vw 30px -50vw', // מושך את המלבן למעלה ולצדדים
  width: '100vw',
  position: 'relative',
  left: '50%',
  right: '50%',
  marginLeft: '-50vw',
  marginRight: '-50vw',
  color: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
    
    <div style={{ color: 'white' }}>
      <BackButton />
    </div>
    
    {isEditing ? (
      <input 
        type="text" 
        value={editForm.full_name} 
        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} 
        style={{ fontSize: '1.8rem', flex: 1, textAlign: 'right', border: 'none', outline: 'none', color: 'white', background: 'transparent' }} 
      />
    ) : (
      <h2 style={{ fontSize: '1.8rem', margin: 0, flex: 1, textAlign: 'right', color: 'white' }}>
        {displayName}
      </h2>
    )}

    {!isEditing && (
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

    {isEditing && (
      <div style={{ display: 'flex', gap: '5px' }}>
        <button onClick={handleSaveChanges} style={{ padding: '5px 15px', backgroundColor: 'white', color: '#4D58D8', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>שמור</button>
        <button onClick={() => setIsEditing(false)} style={{ padding: '5px 15px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>ביטול</button>
      </div>
    )}
  </div>
</div>
{/* שורת הכרטיסיות - תיקון סדר מימין לשמאל */}
<div style={{ 
  display: 'flex', 
  width: '100vw', 
  margin: '-30px -20px 0 -20px', 
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  backgroundColor: '#4D58D8',
  direction: 'rtl' // מבטיח שהכל יזרום מימין לשמאל באופן טבעי
}}>
  {['תיק פונה', 'עדכון חדש', 'היסטוריה'].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        flex: 1,
        padding: '15px 0',
        border: 'none',
        // קו מפריד משמאל לכל לשונית חוץ מהאחרונה
        borderLeft: tab !== 'היסטוריה' ? '1px solid rgba(255,255,255,0.2)' : 'none', 
        backgroundColor: activeTab === tab ? '#FEFCE8' : '#4D58D8',
        color: activeTab === tab ? '#4D58D8' : 'white', 
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        borderRadius: '0',
        outline: 'none'
      }}
    >
      {tab}
    </button>
  ))}
</div>
{activeTab === 'תיק פונה' && (
  <div style={{ padding: '20px', backgroundColor: '#FEFCE8', minHeight: '60vh', margin: '0 -20px', textAlign: 'right' }}>
    
    {/* הצגת הנתונים לפי הסדר החדש שביקשת */}
    <InfoRow label="מס' טלפון" value={participant?.phone} />
    <InfoRow label="מעגל" value={participant?.bereavement_circle} />
    <InfoRow label="מייל" value={participant?.email} />
    <InfoRow label="קשר" value={participant?.bereavement_detail} />
    <InfoRow label="תיאור" value={participant?.general_notes} />
  </div>
)}
      <div>
        {activeTab === 'היסטוריה' && (
  <div style={{ padding: '20px', backgroundColor: '#FEFCE8', minHeight: '60vh', margin: '0 -20px' }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>שיחת טלפון אחרונה: <span style={{ fontWeight: 'normal', marginRight: '5px', color: '#4D58D8' }}>{getLastPhoneCallText()}</span></div>
          {participant?.phone && (
            <a href={`tel:${participant.phone}`} style={{ backgroundColor: '#4D58D8', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </a>
          )}
        </div>

        {/* ציר הזמן המעודכן עם קו חוצץ רציף */}
        <div style={{ padding: '10px' }}>
          {allEvents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999' }}>אין עדכונים חדשים</div>
          ) : (
            allEvents.map((event, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ width: '50px', color: '#4D58D8', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'left', paddingLeft: '10px', paddingTop: '5px' }}>{event.date}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                  <div style={{ color: '#4D58D8', backgroundColor: 'white', padding: '5px 0', zIndex: 1 }}>
                    {event.type === 'phone' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>}
                    {event.type === 'attendance' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    {event.type === 'status' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
                  </div>
                  {index !== allEvents.length - 1 && <div style={{ flex: 1, width: '2px', backgroundColor: '#4D58D8', opacity: 0.3 }}></div>}
                </div>
                <div style={{ flex: 1, textAlign: 'right', color: '#4D58D8', paddingRight: '15px', paddingBottom: '25px', paddingTop: '2px' }}>
                   <div style={{ fontWeight: event.type !== 'status' ? 'bold' : 'normal' }}>{event.text}</div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
)}
      </div>











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















    
      {/* כפתורי פעולה קבועים בתחתית */}
<div style={{ 
  position: 'fixed', 
  bottom: 0, 
  left: 0, 
  width: '100vw', 
  backgroundColor: '#FFF2A8', 
  boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000 // מוודא שהם תמיד יהיו מעל שאר התוכן
}}>
  {/* כפתור ארכיון */}
  <button 
    onClick={() => setIsArchiveConfirmOpen(true)}
    style={{ 
      width: '100%', 
      padding: '20px', 
      border: 'none', 
      borderBottom: '1px solid rgba(77, 88, 216, 0.2)', 
      backgroundColor: 'transparent', 
      color: '#4D58D8', 
      fontSize: '1.2rem', 
      fontWeight: 'bold', 
      cursor: 'pointer' 
    }}
  >
    {participant?.is_archived ? 'שחזר מארכיון' : 'העברה לארכיון'}
  </button>

  {/* כפתור עריכה */}
  <button 
    onClick={() => setIsEditing(true)} 
    style={{ 
      width: '100%', 
      padding: '20px', 
      border: 'none', 
      backgroundColor: 'transparent', 
      color: '#4D58D8', 
      fontSize: '1.2rem', 
      fontWeight: 'bold', 
      cursor: 'pointer' 
    }}
  >
    עריכה
  </button>
</div>

{/* הוספת רווח בתחתית הדף כדי שהכפתורים לא יסתירו את התוכן האחרון */}
{/* ... כל הקוד הקיים של הכפתורים הסטטיים ... */}
 {isArchiveConfirmOpen && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
    <div style={{ backgroundColor: '#FEFCE8', width: '85%', maxWidth: '350px', borderRadius: '15px', overflow: 'hidden', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      
      {/* כותרת הפופ-אפ */}
      <div style={{ padding: '25px 20px 10px 20px' }}>
        <h3 style={{ margin: 0, color: '#4D58D8', fontSize: '1.4rem' }}>להעביר לארכיון?</h3>
      </div>

{/* אזור התמונה - שימי לב שהשם archive-image.png צריך להיות זהה לשם הקובץ ששמרת */}
<div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
  <img 
    src="/archive-image.png" 
    alt="ארכיון" 
    style={{ width: '120px', height: 'auto', objectFit: 'contain' }} 
  />
</div>
      {/* כפתורי הפעולה בעיצוב צהוב סטטי */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFF2A8' }}>
        <button 
          onClick={() => {
            handleArchive(); // מבצע את הארכוב
            setIsArchiveConfirmOpen(false); // סוגר את הפופ-אפ
          }}
          style={{ width: '100%', padding: '15px', border: 'none', borderTop: '1px solid rgba(77, 88, 216, 0.2)', backgroundColor: 'transparent', color: '#4D58D8', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
        >
          כן
        </button>
        <button 
          onClick={() => setIsArchiveConfirmOpen(false)}
          style={{ width: '100%', padding: '15px', border: 'none', borderTop: '1px solid rgba(77, 88, 216, 0.2)', backgroundColor: 'transparent', color: '#4D58D8', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
        >
          ביטול
        </button>
      </div>
    </div>
  </div>
)}

    </div> // זה ה-div שסוגר את הכל
  );
}