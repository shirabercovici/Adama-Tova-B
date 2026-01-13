"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import BackButton from '../../components/BackButton';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/app/participants/types';
import { logActivity } from '@/lib/activity-logger';

export default function ParticipantCardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const id = searchParams.get('id');

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
      
      // Log activity
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
            activity_type: 'status_update',
            participant_id: id,
            participant_name: participant.full_name,
            description: `עדכון סטטוס ${participant.full_name}: ${newUpdateText}`,
          });
        }
      }
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

  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', marginTop: '10px' }}>
        <BackButton />
        {isEditing ? (
          <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} style={{ fontSize: '1.8rem', flex: 1, textAlign: 'right', border: 'none', borderBottom: '2px solid #4D58D8', outline: 'none', color: '#4D58D8', background: 'transparent' }} />
        ) : (
          <h2 style={{ fontSize: '1.8rem', margin: 0, borderBottom: '2px solid #4D58D8', paddingBottom: '5px', flex: 1, textAlign: 'right', color: '#4D58D8' }}>{displayName}</h2>
        )}
        {!isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <input type="checkbox" checked={attendedToday} onChange={handleMarkAttendance} style={{ width: '25px', height: '25px', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.7rem', color: '#4D58D8' }}>נוכחות</span>
          </div>
        )}
        {isEditing && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={handleSaveChanges} style={{ padding: '5px 15px', backgroundColor: '#4D58D8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>שמור</button>
            <button onClick={() => setIsEditing(false)} style={{ padding: '5px 15px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>ביטול</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[ {label: 'קשר', field: 'bereavement_detail'}, {label: 'מעגל', field: 'bereavement_circle', isSelect: true}, {label: 'מייל', field: 'email'}, {label: 'פלאפון', field: 'phone'} ].map((f) => (
          <div key={f.field}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>{f.label}</label>
            {isEditing ? (
              f.isSelect ? (
                <select value={(editForm as any)[f.field]} onChange={(e) => setEditForm({ ...editForm, [f.field]: e.target.value })} style={{ width: '100%', padding: '8px', textAlign: 'right' }}>
                  <option value="מעגל 1">מעגל 1</option><option value="מעגל 2">מעגל 2</option><option value="מעגל 3">מעגל 3</option><option value="מעגל 4">מעגל 4</option>
                </select>
              ) : (
                <input type="text" value={(editForm as any)[f.field]} onChange={(e) => setEditForm({ ...editForm, [f.field]: e.target.value })} style={{ width: '100%', padding: '8px', textAlign: 'center' }} />
              )
            ) : (
              <div style={{ backgroundColor: '#4D58D8', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>{(participant as any)?.[f.field]}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>תיאור</label>
        {isEditing ? (
          <textarea value={editForm.general_notes} onChange={(e) => setEditForm({ ...editForm, general_notes: e.target.value })} style={{ width: '100%', padding: '10px', minHeight: '80px' }} />
        ) : (
          <div style={{ border: '1px solid #ccc', padding: '15px', minHeight: '60px', backgroundColor: 'white', textAlign: 'right' }}>{participant?.general_notes}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #4D58D8', marginBottom: '20px' }}>
        <button onClick={() => setIsPopupOpen(true)} style={{ padding: '10px', backgroundColor: '#eef2e8', border: 'none', borderLeft: '1px solid #4D58D8', cursor: 'pointer', fontWeight: 'bold' }}>+ הוספת עדכון</button>
        <button onClick={handleArchive} style={{ padding: '10px', backgroundColor: participant?.is_archived ? '#ccc' : '#eef2e8', border: 'none', cursor: 'pointer' }}>{participant?.is_archived ? 'שחזר מארכיון' : 'העברה לארכיון'}</button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#888', fontStyle: 'italic', marginBottom: '10px' }}>פעילויות אחרונות</h4>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>שיחת טלפון אחרונה: <span style={{ fontWeight: 'normal', marginRight: '5px', color: '#4D58D8' }}>{getLastPhoneCallText()}</span></div>
          {participant?.phone && (
            <a 
              href={`tel:${participant.phone}`} 
              onClick={async () => {
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
              }}
              style={{ backgroundColor: '#4D58D8', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
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
      {participant && !isEditing && (
        <div style={{ marginTop: '30px', marginBottom: '20px' }}>
          <button onClick={() => setIsEditing(true)} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', border: '1px solid #4D58D8', color: '#4D58D8', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>עריכת פרטי פונה</button>
        </div>
      )}
    </div>
  );
}