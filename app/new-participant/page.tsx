"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function NewParticipantPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [fullName, setFullName] = useState('');
    const [circle, setCircle] = useState<string>('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdId, setCreatedId] = useState<string | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const supabase = createClient();

    useEffect(() => {
        if (showSuccessModal && createdId) {
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                router.replace(`/participant-card?id=${createdId}`);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, createdId, router]);

    // Update theme-color to match cream header background (#FFFCE5)
    useEffect(() => {
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) {
            metaThemeColor.setAttribute("content", "#FFFCE5");
        }
        // Cleanup function to reset the color when leaving the page
        return () => {
            if (metaThemeColor) {
                metaThemeColor.setAttribute("content", "#4D58D8");
            }
        };
    }, []);

    const hasUnsavedChanges = () => {
        return name.trim() !== '' ||
            fullName.trim() !== '' ||
            circle !== '' ||
            email.trim() !== '' ||
            phone.trim() !== '' ||
            description.trim() !== '';
    };

    const handleConfirmExit = () => {
        setShowUnsavedModal(false);
        router.back();
    };

    const handleSave = async () => {
        // Validation
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
            // Validation already handled above

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
                setShowSuccessModal(true);
            }
        } catch (err: any) {
            console.error('Error saving participant:', err);
            setError(err.message || 'אירעה שגיאה בשמירת הנתונים');
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
        
        .input-error {
            color: #fca5a5 !important;
        }
        
        .input-error::placeholder {
            color: rgba(248, 113, 113, 0.7) !important;
            opacity: 1;
        }

        ::placeholder {
            font-family: 'EditorSans_PRO';
            font-style: italic;
            color: #949ADD;
            opacity: 0.7;
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
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                                }}
                                className={errors.name ? 'input-error' : ''}
                                placeholder="הזן שם מלא"
                                style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: errors.name ? '0.0625rem solid #ef4444' : '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: errors.name ? '#fca5a5' : '#949ADD', textAlign: 'right' }}
                            />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מס&apos; טלפון*</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: false }));
                                }}
                                className={errors.phone ? 'input-error' : ''}
                                placeholder="הזן מספר טלפון"
                                style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: errors.phone ? '0.0625rem solid #ef4444' : '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: errors.phone ? '#fca5a5' : '#949ADD', textAlign: 'right' }}
                            />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מייל*</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors(prev => ({ ...prev, email: false }));
                                }}
                                className={errors.email ? 'input-error' : ''}
                                placeholder="הזן כתובת מייל"
                                style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: errors.email ? '0.0625rem solid #ef4444' : '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: errors.email ? '#fca5a5' : '#949ADD', textAlign: 'right' }}
                            />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>מעגל*</label>
                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '15px', borderBottom: errors.circle ? '0.0625rem solid #ef4444' : '0.0625rem solid #4D58D8', paddingBottom: '10px' }}>
                                {/* Right Column (in RTL) */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div
                                        onClick={() => {
                                            setCircle('מעגל 1');
                                            if (errors.circle) setErrors(prev => ({ ...prev, circle: false }));
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', justifyContent: 'flex-start' }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '1.5px solid #4D58D8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {circle === 'מעגל 1' && (
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />
                                            )}
                                        </div>
                                        <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', color: '#4D58D8' }}>מעגל 1</span>
                                    </div>
                                    <div
                                        onClick={() => {
                                            setCircle('מעגל 3');
                                            if (errors.circle) setErrors(prev => ({ ...prev, circle: false }));
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', justifyContent: 'flex-start' }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '1.5px solid #4D58D8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {circle === 'מעגל 3' && (
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />
                                            )}
                                        </div>
                                        <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', color: '#4D58D8' }}>מעגל 3</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', backgroundColor: '#949ADD', opacity: 0.5 }}></div>

                                {/* Left Column (in RTL) */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div
                                        onClick={() => {
                                            setCircle('מעגל 2');
                                            if (errors.circle) setErrors(prev => ({ ...prev, circle: false }));
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', justifyContent: 'flex-start' }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '1.5px solid #4D58D8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {circle === 'מעגל 2' && (
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />
                                            )}
                                        </div>
                                        <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', color: '#4D58D8' }}>מעגל 2</span>
                                    </div>
                                    <div
                                        onClick={() => {
                                            setCircle('מעגל 4');
                                            if (errors.circle) setErrors(prev => ({ ...prev, circle: false }));
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', justifyContent: 'flex-start' }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '1.5px solid #4D58D8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {circle === 'מעגל 4' && (
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />
                                            )}
                                        </div>
                                        <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', color: '#4D58D8' }}>מעגל 4</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>קשר</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="הוסף קשר" style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right' }} />
                        </div>

                        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', width: '100%', gap: '0.625rem' }}>
                            <label style={{ display: 'block', fontFamily: 'EditorSans_PRO', fontSize: '1.5rem', fontWeight: 'normal', margin: 0, color: 'var(--color-primary)', textAlign: 'right' }}>תיאור</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="הוסף תיאור" style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.0625rem solid #4D58D8', backgroundColor: 'transparent', outline: 'none', borderRadius: 0, fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', fontStyle: 'italic', color: '#949ADD', textAlign: 'right', resize: 'none', minHeight: '60px' }} />
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

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.successModalContent}>
                            <h3 className={styles.modalTitle}>נשמר בהצלחה!</h3>

                            <div className={styles.modalIllustration}>
                                <img
                                    src="/icons/approve_saving.svg"
                                    alt="Success illustration"
                                    className={styles.plantIcon}
                                />
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
                                <img
                                    src="/icons/not_saved.svg"
                                    alt="Unsaved changes illustration"
                                    className={styles.plantIcon}
                                />
                            </div>

                            <div className={styles.modalButtons}>
                                <button
                                    onClick={handleConfirmExit}
                                    className={styles.confirmButton}
                                >
                                    כן
                                </button>
                                <button
                                    onClick={() => setShowUnsavedModal(false)}
                                    className={styles.cancelButton}
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
