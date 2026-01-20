"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css'; // ודאי שה-CSS של מסך היצירה נמצא כאן
import { useThemeColor } from '@/lib/hooks/useThemeColor';

export default function EditParticipantPage() {
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const id = searchParams?.get('id');

    // פונקציית עזר לשליפה מהירה מהזיכרון (Cache)
const getCachedValue = (field: string) => {
    if (typeof window === 'undefined' || !id) return '';
    try {
        const cached = localStorage.getItem(`participant_${id}`);
        if (cached) {
            const { participant } = JSON.parse(cached);
            // מיפוי השדות מהדאטה-בייס לשמות המשתנים שלך
            const fieldMap: Record<string, string> = {
                'name': participant.full_name,
                'phone': participant.phone,
                'email': participant.email,
                'circle': participant.bereavement_circle,
                'fullName': participant.bereavement_detail, // "קשר"
                'description': participant.general_notes   // "תיאור"
            };
            return fieldMap[field] || '';
        }
    } catch (e) {
        return '';
    }
    return '';
};
    // States לנתונים
const [name, setName] = useState(getCachedValue('name'));
const [phone, setPhone] = useState(getCachedValue('phone'));
const [email, setEmail] = useState(getCachedValue('email'));
const [circle, setCircle] = useState<string>(getCachedValue('circle'));
const [fullName, setFullName] = useState(getCachedValue('fullName')); // שדה "קשר"
const [description, setDescription] = useState(getCachedValue('description'));
 // שדה "תיאור"
    // States לניהול המסך
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    
    // שמירת הנתונים המקוריים כדי לזהות שינויים
    const [originalData, setOriginalData] = useState<any>(null);

    const supabase = useMemo(() => createClient(), []);
    useThemeColor('#FFFCE5');

    
    // שליפת המידע המקורי
    useEffect(() => {
        const fetchParticipantData = async () => {
            if (!id) return;
            const { data, error } = await supabase.from('participants').select('*').eq('id', id).single();
            if (error) {
                setError('לא הצלחנו למצוא את פרטי הפונה');
                return;
            }
            if (data) {
                setName(data.full_name || '');
                setFullName(data.bereavement_detail || '');
                setCircle(data.bereavement_circle || '');
                setEmail(data.email || '');
                setPhone(data.phone || '');
                setDescription(data.general_notes || '');
                setOriginalData(data); // שומרים להשוואה
            }
        };
        fetchParticipantData();
    }, [id, supabase]);

    // סגירת מודאל הצלחה ומעבר כרטיס
    useEffect(() => {
        if (showSuccessModal && id) {
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                router.replace(`/participant-card?id=${id}`);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, id, router]);

    const hasUnsavedChanges = () => {
        if (!originalData) return false;
        return name !== originalData.full_name ||
            fullName !== originalData.bereavement_detail ||
            circle !== originalData.bereavement_circle ||
            email !== originalData.email ||
            phone !== originalData.phone ||
            description !== originalData.general_notes;
    };

    const handleSave = async () => {
        const newErrors: Record<string, boolean> = {};
        if (!name.trim()) newErrors.name = true;
        if (!phone.trim()) newErrors.phone = true;
        if (!email.trim()) newErrors.email = true;
        if (!circle) newErrors.circle = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.from('participants').update({
                full_name: name, 
                bereavement_detail: fullName, 
                bereavement_circle: circle,
                email: email, 
                phone: phone, 
                general_notes: description,
            }).eq('id', id);

            if (updateError) throw updateError;
            setShowSuccessModal(true);
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה בעדכון הנתונים');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onClose = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedModal(true);
        } else {
            router.back();
        }
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 0px; }
                ::placeholder { font-family: 'EditorSans_PRO'; font-style: italic; color: #949ADD; opacity: 0.7; }
                .input-error { color: #fca5a5 !important; border-bottom: 0.0625rem solid #ef4444 !important; }
            `}} />

            <div style={{
                fontFamily: 'EditorSans_PRO, sans-serif',
                backgroundColor: '#FFFCE5',
                height: '100vh',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
            }}>
                {/* HEADER SECTION */}
                <div style={{ flexShrink: 0, borderBottom: '1px solid #4D58D8' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '3rem 1.88rem 1.25rem',
                        width: '100%',
                        maxWidth: '23.75rem',
                        margin: '0 auto',
                        boxSizing: 'border-box'
                    }}>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4D58D8" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'normal', color: '#4D58D8', margin: 0 }}>עריכת פרטי פונה</h1>
                        <div onClick={() => setIsChecked(!isChecked)} style={{
                            width: '24px', height: '24px', border: '1.5px solid #4D58D8', borderRadius: '4px',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                            backgroundColor: isChecked ? '#4D58D8' : 'transparent'
                        }}>
                            {isChecked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '23.75rem' }}>
                        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</div>}

                        {/* שדות קלט במבנה של המסך החדש */}
                        {[
                            { label: 'שם מלא*', value: name, setter: setName, err: errors.name, type: 'text', placeholder: 'הזן שם מלא' },
                            { label: "מס' טלפון*", value: phone, setter: setPhone, err: errors.phone, type: 'tel', placeholder: 'הזן מספר טלפון' },
                            { label: 'מייל*', value: email, setter: setEmail, err: errors.email, type: 'email', placeholder: 'הזן כתובת מייל' },
                        ].map((field, i) => (
                            <div key={i} style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                <label style={{ fontSize: '1.5rem', color: '#4D58D8', textAlign: 'right' }}>{field.label}</label>
                                <input
                                    type={field.type}
                                    value={field.value}
                                    onChange={(e) => field.setter(e.target.value)}
                                    className={field.err ? 'input-error' : ''}
                                    placeholder={field.placeholder}
                                    style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', borderRadius: 0, backgroundColor: 'transparent', outline: 'none', fontSize: '1.25rem', textAlign: 'right', color: '#4D58D8' }}
                                />
                            </div>
                        ))}

                        {/* בחירת מעגל */}
                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            <label style={{ fontSize: '1.5rem', color: '#4D58D8', textAlign: 'right' }}>מעגל*</label>
                            <div style={{ display: 'flex', width: '100%', gap: '15px', borderBottom: errors.circle ? '0.0625rem solid #ef4444' : '0.0625rem solid #4D58D8', paddingBottom: '10px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {['מעגל 1', 'מעגל 3'].map(m => (
                                        <div key={m} onClick={() => setCircle(m)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid #4D58D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {circle === m && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />}
                                            </div>
                                            <span style={{ fontSize: '1.25rem', color: '#4D58D8' }}>{m}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ width: '1px', backgroundColor: '#949ADD', opacity: 0.5 }}></div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {['מעגל 2', 'מעגל 4'].map(m => (
                                        <div key={m} onClick={() => setCircle(m)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid #4D58D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {circle === m && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />}
                                            </div>
                                            <span style={{ fontSize: '1.25rem', color: '#4D58D8' }}>{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* קשר ותיאור */}
                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            <label style={{ fontSize: '1.5rem', color: '#4D58D8', textAlign: 'right' }}>קשר</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="הוסף קשר" style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8',borderRadius: 0, backgroundColor: 'transparent', outline: 'none', fontSize: '1.25rem', textAlign: 'right', color: '#4D58D8' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            <label style={{ fontSize: '1.5rem', color: '#4D58D8', textAlign: 'right' }}>תיאור</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="הוסף תיאור" style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8',borderRadius: 0, backgroundColor: 'transparent', outline: 'none', fontSize: '1.25rem', textAlign: 'right', color: '#4D58D8', resize: 'none', minHeight: '60px' }} />
                            <div style={{ textAlign: 'left', fontSize: '1rem', color: '#949ADD', fontStyle: 'italic' }}>עד 50 מילים</div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div style={{ flexShrink: 0, backgroundColor: '#FFF2A8', borderTop: '0.0625rem solid #4D58D8', padding: '15px 20px' }}>
                    <button onClick={handleSave} disabled={isSubmitting} style={{ width: '100%', background: 'none', border: 'none', color: '#4D58D8', fontSize: '1.875rem', cursor: 'pointer' }}>
                        {isSubmitting ? 'שומר...' : 'שמירה'}
                    </button>
                </div>

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.successModalContent}>
                            <h3 className={styles.modalTitle}>נשמר בהצלחה!</h3>
                            <div className={styles.modalIllustration}>
                                <img src="/icons/approve_saving.svg" alt="Success" className={styles.plantIcon} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Unsaved Changes Modal */}
                {showUnsavedModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h3 className={styles.modalTitle}>הנתונים לא נשמרו. לצאת בכל זאת?</h3>
                            <div className={styles.modalIllustration}>
                                <img src="/icons/not_saved.svg" alt="Unsaved" className={styles.plantIcon} />
                            </div>
                            <div className={styles.modalButtons}>
                                <button onClick={() => { setShowUnsavedModal(false); router.back(); }} className={styles.confirmButton}>כן</button>
                                <button onClick={() => setShowUnsavedModal(false)} className={styles.cancelButton}>ביטול</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}