"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewParticipantPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [fullName, setFullName] = useState('');
    const [circle, setCircle] = useState<string>('מעגל 1');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdId, setCreatedId] = useState<string | null>(null);
    const [isChecked, setIsChecked] = useState(false);

    const supabase = createClient();

    const handleSave = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            if (!name || !circle) throw new Error('שם ומעגל הם שדות חובה');

            const { data, error: insertError } = await supabase
                .from('participants')
                .insert([{
                    full_name: name,
                    bereavement_detail: fullName,
                    bereavement_circle: circle,
                    email: email,
                    phone: phone,
                    general_notes: description,
                    is_archived: false,
                    updates: JSON.stringify([]),
                }])
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
        if (createdId) router.push(`/participant-card?id=${createdId}`);
        else router.push('/');
    };

    const onClose = () => {
        router.back();
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
        /* Custom Scrollbar Styling */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #949ADD var(--color-background);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: var(--color-background);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #949ADD;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #4D58D8;
        }
      `}} />

            <div style={{
                fontFamily: 'EditorSans_PRO, var(--font-body)',
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-background)',
                height: '100vh',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                margin: 0,
                padding: 0,
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
            }}>
                {/* HEADER SECTION */}
                <div style={{
                    flexShrink: 0,
                    backgroundColor: 'var(--color-background)',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '2.5rem',
                        paddingBottom: '1.25rem',
                        paddingLeft: '1.88rem',
                        paddingRight: '1.88rem',
                        width: '100%',
                        maxWidth: '23.75rem',
                        margin: '0 auto',
                        boxSizing: 'border-box',
                        gap: '0.8rem',
                        flexWrap: 'nowrap',
                    }}>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4D58D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <h1 style={{
                            fontFamily: 'EditorSans_PRO',
                            fontSize: '1.875rem',
                            fontWeight: 'normal',
                            color: 'var(--color-primary)',
                            textAlign: 'center',
                            margin: 0,
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>הוספת פונה חדש</h1>
                        <div onClick={() => setIsChecked(!isChecked)} style={{
                            width: '24px',
                            height: '24px',
                            border: '1.5px solid #4D58D8',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: isChecked ? '#4D58D8' : 'transparent',
                            flexShrink: 0,
                        }}>
                            {isChecked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '0', borderBottom: '0.0625rem solid #4D58D8' }}></div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    width: '100%',
                    padding: '20px',
                    paddingBottom: '20px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                    <div style={{ width: '100%', maxWidth: '23.75rem' }}>
                        {error && (
                            <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center', fontFamily: 'EditorSans_PRO' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>שם מלא*</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מס' טלפון*</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מייל*</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מעגל*</label>
                            <select value={circle} onChange={(e) => setCircle(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23949ADD%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0px center', backgroundSize: '12px' }}>
                                {['מעגל 1', 'מעגל 2', 'מעגל 3', 'מעגל 4'].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>קשר</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>תיאור</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right', resize: 'none', minHeight: '60px' }} />
                            <div style={{ textAlign: 'left', fontSize: '1rem', color: '#949ADD', marginTop: '5px', fontFamily: 'EditorSans_PRO', fontStyle: 'italic' }}>
                                עד 50 מילים
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER SECTION */}
                <div style={{
                    flexShrink: 0,
                    backgroundColor: 'var(--color-secondary)',
                    borderTop: '0.0625rem solid #4D58D8',
                    padding: '15px 20px',
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                }}>
                    <button onClick={handleSave} disabled={isSubmitting} style={{
                        backgroundColor: 'transparent',
                        color: '#4D58D8',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'center',
                        maxWidth: '23.75rem',
                        fontFamily: 'EditorSans_PRO',
                        fontSize: '1.875rem',
                        fontStyle: 'normal',
                        fontWeight: 'normal',
                    }}>
                        {isSubmitting ? 'שומר...' : 'שמירה'}
                    </button>
                </div>

                {/* POPUP */}
                {showPopup && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', width: '80%', maxWidth: '350px' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '20px', fontSize: '1.2rem', color: 'var(--color-primary)' }}>כרטיסיית פונה חדשה נוצרה בהצלחה!</p>
                            <button onClick={goToProfile} style={{ padding: '10px 30px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '1rem' }}>צפייה בתיק הפונה</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
