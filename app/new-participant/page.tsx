"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '../../components/BackButton';
import { createClient } from '@/lib/supabase/client';

export default function NewParticipantPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [circle, setCircle] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const supabase = createClient();

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Basic validation
      if (!name || !circle) {
        throw new Error('שם ומעגל הם שדות חובה');
      }

      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([
          {
            full_name: name,
            bereavement_detail: fullName, // Mapping 'Nickname' field to bereavement_detail based on usage
            bereavement_circle: circle,
            email: email,
            phone: phone,
            general_notes: description,
            is_archived: false,
            updates: JSON.stringify([]),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setCreatedId(data.id);
        setShowPopup(true);
      }
    } catch (err: any) {
      console.error('Error saving participant:', err);
      setError(err.message || 'אירעה שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToProfile = () => {
    if (createdId) {
      router.push(`/participant-card?id=${createdId}`);
    } else {
      // Fallback
      const params = new URLSearchParams({ name, fullName, circle: circle || '', email, phone, description });
      router.push(`/participant-card?${params.toString()}`);
    }
  };

  // משתני עזר לעיצוב כדי שהקוד למטה יהיה נקי
  const labelStyle = { display: 'block', fontWeight: 'bold' as const, marginBottom: '5px' };
  const inputStyle = {
    width: '100%',
    padding: '8px 0',
    border: 'none',
    borderBottom: '1px solid #ccc',
    backgroundColor: 'transparent',
    outline: 'none',
    marginBottom: '20px'
  };

  return (
    <div style={{ textAlign: 'right' }}>
      {/* כותרת הכרטיס עם כפתור החזור המשותף */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '20px',
        marginTop: '10px',
        borderBottom: '1.5px solid #4D58D8',
        paddingBottom: '10px',
        color: '#4D58D8'
      }}>
        <BackButton />
        <h2 style={{ fontSize: '1.8rem', margin: 0 }}>הוספת פונה חדש</h2>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {/* גוף הטופס - שם ופרטי הקשר */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>שם מלא</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>קשר</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* בחירת מעגל */}
      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>מעגל</label>
        <div style={{ display: 'flex', border: '1px solid #ccc', borderRadius: '2px', overflow: 'hidden' }}>
          {['מעגל 1', 'מעגל 2', 'מעגל 3', 'מעגל 4'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCircle(c)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderLeft: c !== 'מעגל 4' ? '1px solid #ccc' : 'none',
                backgroundColor: circle === c ? '#e0e0e0' : 'transparent',
                cursor: 'pointer'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label style={labelStyle}>מייל</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>מספר פלאפון</label>
      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>הערות</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, height: '80px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', padding: '10px' }}
      />

      {/* כפתור שמירה */}
      <button
        onClick={handleSave}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: isSubmitting ? '#ccc' : 'transparent',
          border: '1.5px solid #4D58D8',
          color: '#4D58D8',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginTop: '10px'
        }}
      >
        {isSubmitting ? 'שומר...' : 'שמירה'}
      </button>

      {/* פופ-אפ אישור */}
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center', width: '80%', maxWidth: '350px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '20px', color: '#4D58D8' }}>כרטיסיית פונה חדשה נוצרה בהצלחה!</p>
            <button onClick={goToProfile} style={{ padding: '10px 20px', backgroundColor: '#4D58D8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>צפייה בתיק הפונה</button>
          </div>
        </div>
      )}
    </div>
  );
}