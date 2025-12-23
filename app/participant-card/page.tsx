"use client";
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import BackButton from '../../components/BackButton';

export default function ParticipantCardPage() {
  const searchParams = useSearchParams();

  // נתונים שמגיעים מה-URL
  const name = searchParams.get('name') || 'פונה חדש';
  const fullName = searchParams.get('fullName') || '-';
  const circle = searchParams.get('circle') || '-';
  const email = searchParams.get('email') || '-';
  const phone = searchParams.get('phone') || '-';
  const description = searchParams.get('description') || '-';

  // ניהול פעילויות ועדכונים
  const [activities, setActivities] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [newUpdateText, setNewUpdateText] = useState('');

  const handleAddUpdate = () => {
    if (newUpdateText.trim() === '') return;
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}`;
    const newEntry = { id: Date.now(), text: newUpdateText, date: formattedDate };
    setActivities([newEntry, ...activities]);
    setNewUpdateText('');
    setIsPopupOpen(false);
  };

  return (
    <div>
      {/* כותרת הכרטיס עם כפתור החזור המשותף */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', marginTop: '10px' }}>
        <BackButton />
        <h2 style={{ fontSize: '1.8rem', margin: 0, borderBottom: '2px solid #333', paddingBottom: '5px', flex: 1, textAlign: 'right' }}>
           {name}
        </h2>
      </div>

      {/* גריד נתונים בשחור-לבן (ממורכז) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>כינוי</label>
          <div style={{ backgroundColor: 'black', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>{fullName}</div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מעגל</label>
          <div style={{ backgroundColor: 'black', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>{circle}</div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מייל</label>
          <div style={{ backgroundColor: 'black', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', fontSize: '0.8rem', minHeight: '40px', wordBreak: 'break-all' }}>{email}</div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>מספר פלאפון</label>
          <div style={{ backgroundColor: 'black', color: 'white', padding: '10px', textAlign: 'center', borderRadius: '2px', minHeight: '40px' }}>{phone}</div>
        </div>
      </div>

      {/* תיאור פונה */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>תיאור</label>
        <div style={{ border: '1px solid #ccc', padding: '15px', minHeight: '60px', backgroundColor: 'white', textAlign: 'right' }}>{description}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #333', marginBottom: '20px' }}>
        <button onClick={() => setIsPopupOpen(true)} style={{ padding: '10px', backgroundColor: '#eef2e8', border: 'none', borderLeft: '1px solid #333', cursor: 'pointer', fontWeight: 'bold' }}>+ הוספת עדכון</button>
        <button style={{ padding: '10px', backgroundColor: '#eef2e8', border: 'none', cursor: 'pointer' }}>העברה לארכיון</button>
      </div>

      {/* פופ-אפ עדכון */}
      {isPopupOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '85%', maxWidth: '350px' }}>
            <h3 style={{ marginTop: 0 }}>הוספת עדכון חדש</h3>
            <textarea value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} placeholder="כתבי כאן..." style={{ width: '100%', height: '100px', marginBottom: '15px', padding: '10px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleAddUpdate} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>סיים</button>
              <button onClick={() => setIsPopupOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#eee', border: 'none', borderRadius: '4px' }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}