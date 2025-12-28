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

  // Basic params from URL as fallback/initial
  const id = searchParams.get('id');

  // State
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bereavement_detail: '',
    bereavement_circle: '',
    email: '',
    phone: '',
    general_notes: ''
  });

  // URL params fallbacks (for display while loading or if no ID)
  const urlName = searchParams.get('name') || 'פונה חדש';
  const urlFullName = searchParams.get('fullName') || '-';
  const urlCircle = searchParams.get('circle') || '-';
  const urlEmail = searchParams.get('email') || '-';
  const urlPhone = searchParams.get('phone') || '-';
  const urlDescription = searchParams.get('description') || '-';

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

        // Parse updates if it's a JSON string, otherwise init empty
        try {
          const parsedUpdates = data.updates ? JSON.parse(data.updates) : [];
          setActivities(Array.isArray(parsedUpdates) ? parsedUpdates : []);
        } catch (e) {
          setActivities([]);
          console.error("Failed to parse updates", e);
        }
      }
    } catch (err) {
      console.error('Error fetching participant:', err);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (id) {
      fetchParticipant();
    }
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
      // Save to DB
      try {
        const { error } = await supabase
          .from('participants')
          .update({ updates: JSON.stringify(updatedActivities) })
          .eq('id', id);

        if (error) console.error('Error saving update:', error);
      } catch (err) {
        console.error('Error saving update:', err);
      }
    }
  };

  const handleArchive = async () => {
    if (!id || !participant) return;

    const newValue = !participant.is_archived;
    // Optimistic update
    setParticipant({ ...participant, is_archived: newValue });

    try {
      const { error } = await supabase
        .from('participants')
        .update({ is_archived: newValue })
        .eq('id', id);

      if (error) {
        console.error('Error updating archive status:', error);
        // Revert on error
        setParticipant({ ...participant, is_archived: participant.is_archived });
      } else {
        // If archived, maybe go back to list? fallback to just showing status
        if (newValue) {
          router.push('/participants');
        }
      }
    } catch (err) {
      console.error('Error updating archive status:', err);
    }
  };

  const handleSaveChanges = async () => {
    if (!id || !participant) return;

    try {
      const { error } = await supabase
        .from('participants')
        .update({
          full_name: editForm.full_name,
          bereavement_detail: editForm.bereavement_detail,
          bereavement_circle: editForm.bereavement_circle,
          email: editForm.email,
          phone: editForm.phone,
          general_notes: editForm.general_notes
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setParticipant({
        ...participant,
        full_name: editForm.full_name,
        bereavement_detail: editForm.bereavement_detail,
        bereavement_circle: editForm.bereavement_circle,
        email: editForm.email,
        phone: editForm.phone,
        general_notes: editForm.general_notes
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving changes:', err);
      alert('שגיאה בשמירת השינויים');
    }
  };

  // Derived values: prefer DB data, fallback to URL
  const displayName = isEditing ? editForm.full_name : (participant ? participant.full_name : urlName);

  // Styles for editable inputs
  const editInputStyle = {
    width: '100%',
    padding: '8px',
    backgroundColor: 'white',
    color: 'black',
    border: '1px solid #ccc',
    borderRadius: '2px',
    textAlign: 'center' as const
  };

  return (
    <div>
      {/* כותרת הכרטיס עם כפתור החזור המשותף */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', marginTop: '10px' }}>
        <BackButton />
        {isEditing ? (
          <input
            type="text"
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            style={{ fontSize: '1.8rem', margin: 0, paddingBottom: '5px', flex: 1, textAlign: 'right', border: 'none', borderBottom: '2px solid #4D58D8', outline: 'none', background: 'transparent', color: '#4D58D8' }}
          />
        ) : (
          <h2 style={{ fontSize: '1.8rem', margin: 0, borderBottom: '2px solid #4D58D8', paddingBottom: '5px', flex: 1, textAlign: 'right', color: '#4D58D8' }}>
            {displayName}
          </h2>
        )}

        {/* כפתור כניסה למצב עריכה / שמירה */}
        {participant && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{ padding: '5px 15px', backgroundColor: 'transparent', border: '1px solid #4D58D8', color: '#4D58D8', cursor: 'pointer', borderRadius: '4px' }}
          >
            עריכה
          </button>
        )}
        {isEditing && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={handleSaveChanges}
              style={{ padding: '5px 15px', backgroundColor: '#4D58D8', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              שמור
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                // Reset form to current participant data
                if (participant) {
                  setEditForm({
                    full_name: participant.full_name,
                    bereavement_detail: participant.bereavement_detail,
                    bereavement_circle: participant.bereavement_circle,
                    email: participant.email,
                    phone: participant.phone,
                    general_notes: participant.general_notes
                  });
                }
              }}
              style={{ padding: '5px 15px', backgroundColor: '#ccc', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              ביטול
            </button>
          </div>
        )}
      </div>

      {loading && <div>טוען נתונים...</div>}

      {/* גריד נתונים בשחור-לבן (ממורכז) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>קשר</label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.bereavement_detail}
              onChange={(e) => setEditForm({ ...editForm, bereavement_detail: e.target.value })}
              style={editInputStyle}
            />
          ) : (
            <div style={{ backgroundColor: '#4D58D8', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>
              {participant?.bereavement_detail}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מעגל</label>
          {isEditing ? (
            <select
              value={editForm.bereavement_circle}
              onChange={(e) => setEditForm({ ...editForm, bereavement_circle: e.target.value })}
              style={{ ...editInputStyle, textAlign: 'right' }}
            >
              <option value="מעגל 1">מעגל 1</option>
              <option value="מעגל 2">מעגל 2</option>
              <option value="מעגל 3">מעגל 3</option>
              <option value="מעגל 4">מעגל 4</option>
            </select>
          ) : (
            <div style={{ backgroundColor: '#4D58D8', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>
              {participant?.bereavement_circle}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מייל</label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              style={editInputStyle}
            />
          ) : (
            <div style={{ backgroundColor: '#4D58D8', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', fontSize: '0.8rem', minHeight: '40px', wordBreak: 'break-all' }}>
              {participant?.email}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מספר פלאפון</label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              style={editInputStyle}
            />
          ) : (
            <div style={{ backgroundColor: '#4D58D8', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>
              {participant?.phone}
            </div>
          )}
        </div>
      </div>

      {/* תיאור פונה */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>תיאור</label>
        {isEditing ? (
          <textarea
            value={editForm.general_notes}
            onChange={(e) => setEditForm({ ...editForm, general_notes: e.target.value })}
            style={{ width: '100%', padding: '10px', minHeight: '80px', border: '1px solid #ccc' }}
          />
        ) : (
          <div style={{ border: '1px solid #ccc', padding: '15px', minHeight: '60px', backgroundColor: 'white', textAlign: 'right' }}>
            {participant?.general_notes}
          </div>
        )}
      </div>

      {/* פעילויות אחרונות */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#888', fontStyle: 'italic', marginBottom: '10px' }}>פעילויות אחרונות</h4>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'white', border: '1px solid #eee', color: '#999' }}>אין עדכונים חדשים</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #ccc' }}>
            <tbody>
              {activities.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '10px', borderLeft: '1px solid #ccc', textAlign: 'right' }}>{item.text}</td>
                  <td style={{ padding: '10px', textAlign: 'center', width: '60px' }}>{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* כפתורי פעולה */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #4D58D8', marginBottom: '20px' }}>
        <button onClick={() => setIsPopupOpen(true)} style={{ padding: '10px', backgroundColor: '#eef2e8', border: 'none', borderLeft: '1px solid #4D58D8', cursor: 'pointer', fontWeight: 'bold' }}>+ הוספת עדכון</button>
        <button
          onClick={handleArchive}
          style={{ padding: '10px', backgroundColor: participant?.is_archived ? '#ccc' : '#eef2e8', border: 'none', cursor: 'pointer' }}
        >
          {participant?.is_archived ? 'שחזר מארכיון' : 'העברה לארכיון'}
        </button>
      </div>

      {/* פופ-אפ עדכון */}
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
  );
}