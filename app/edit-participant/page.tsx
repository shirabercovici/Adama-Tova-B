"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// --- קומפוננטות עזר לניקוי הכפילויות ---

const FormRow = ({ label, children, error }: { label: string, children: React.ReactNode, error?: boolean }) => (
    <div style={{ display: 'flex', padding: '0.8rem 0', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem', width: '100%' }}>
        <div style={{ display: 'flex', width: '100%', maxWidth: '17.11794rem', padding: '0 0.3125rem', flexDirection: 'column', alignItems: 'flex-start', marginBottom: "5ram" }}>
            <div style={{ color: '#4D58D8', fontSize: '1.3rem', fontWeight: '450', fontFamily: 'EditorSans_PRO' }}>{label}</div>
            <div style={{ width: '100%', direction: 'rtl' }}>{children}</div>
        </div>
        <div style={{ width: '100%', borderBottom: error ? '1px solid #ef4444' : '1px solid #4D58D8', marginTop: '0.3125rem' }}></div>
    </div>
);

const CircleOption = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', justifyContent: 'flex-start' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid #4D58D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {active && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4D58D8' }} />}
        </div>
        <span style={{ fontFamily: 'EditorSans_PRO', fontSize: '1.25rem', color: '#4D58D8' }}>{label}</span>
    </div>
);

const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', 
    fontFamily: 'EditorSans_PRO', fontSize: '1.2rem', fontWeight: '400', 
    color: hasError ? '#fca5a5' : '#4D58D8', textAlign: 'right', padding: 0
});

export default function EditParticipantPage() {
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const id = searchParams?.get('id');

    // States המקוריים שלך
    const [name, setName] = useState('');
    const [fullName, setFullName] = useState('');
    const [circle, setCircle] = useState<string>('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdId, setCreatedId] = useState<string | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const supabase = useMemo(() => createClient(), []);

    // שליפת המידע (זהה למקור)
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
            }
        };
        fetchParticipantData();
    }, [id, supabase]);

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
                full_name: name, bereavement_detail: fullName, bereavement_circle: circle,
                email: email, phone: phone, general_notes: description,
            }).eq('id', id);

            if (updateError) throw updateError;
            router.push(`/participant-card?id=${id}`);
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה בעדכון הנתונים');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onClose = () => router.back();

    return (
        <div style={{ backgroundColor: '#FFFCE5', height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 0px; }
                ::placeholder { font-family: 'EditorSans_PRO'; font-style: italic; color: #949ADD; opacity: 0.7; }
            `}} />

            {/* HEADER - כולל ה-Checkbox המקורי */}
            <div style={{ flexShrink: 0, padding: '3rem 1.88rem 1.25rem', borderBottom: '1px solid #4D58D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4D58D8" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'normal', color: '#4D58D8', margin: 0, fontFamily: 'EditorSans_PRO' }}>עריכת פרטי פונה</h1>
                
                {/* ה-Checkbox המקורי שלך */}
                <div onClick={() => setIsChecked(!isChecked)} style={{
                    width: '24px', height: '24px', border: '1.5px solid #4D58D8', borderRadius: '4px',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                    backgroundColor: isChecked ? '#4D58D8' : 'transparent', flexShrink: 0
                }}>
                    {isChecked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
            </div>

            {/* CONTENT */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '23.75rem' }}>
                    {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</div>}

                    <FormRow label="שם מלא*" error={errors.name}>
                        <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: false })); }} style={inputStyle(errors.name)} placeholder="הזן שם מלא" />
                    </FormRow>

                    <FormRow label="מס' טלפון*" error={errors.phone}>
                        <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: false })); }} style={inputStyle(errors.phone)} placeholder="הזן מספר טלפון" />
                    </FormRow>

                    <FormRow label="מייל*" error={errors.email}>
                        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: false })); }} style={inputStyle(errors.email)} placeholder="הזן כתובת מייל" />
                    </FormRow>

                    <FormRow label="מעגל*" error={errors.circle}>
                        <div style={{ display: 'flex', gap: '20px', paddingTop: '5px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <CircleOption label="מעגל 1" active={circle === 'מעגל 1'} onClick={() => { setCircle('מעגל 1'); setErrors(p => ({ ...p, circle: false })); }} />
                                <CircleOption label="מעגל 3" active={circle === 'מעגל 3'} onClick={() => { setCircle('מעגל 3'); setErrors(p => ({ ...p, circle: false })); }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <CircleOption label="מעגל 2" active={circle === 'מעגל 2'} onClick={() => { setCircle('מעגל 2'); setErrors(p => ({ ...p, circle: false })); }} />
                                <CircleOption label="מעגל 4" active={circle === 'מעגל 4'} onClick={() => { setCircle('מעגל 4'); setErrors(p => ({ ...p, circle: false })); }} />
                            </div>
                        </div>
                    </FormRow>

                    <FormRow label="קשר">
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle(false)} placeholder="הוסף קשר" />
                    </FormRow>

                    <FormRow label="תיאור">
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle(false), resize: 'none', minHeight: '60px' }} placeholder="הוסף תיאור" />
                        {/* הערת ה-50 מילים המקורית */}
                        <div style={{ textAlign: 'left', fontSize: '1rem', color: '#4D58D8', marginTop: '5px', fontFamily: 'EditorSans_PRO', fontStyle: 'italic' }}>
                            עד 50 מילים
                        </div>
                    </FormRow>
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #4D58D8', backgroundColor: '#FFF2A8' }}>
                <button onClick={handleSave} disabled={isSubmitting} style={{ width: '100%', background: 'none', border: 'none', color: '#4D58D8', fontSize: '1.875rem', cursor: 'pointer', fontFamily: 'EditorSans_PRO' }}>
                    {isSubmitting ? 'שומר...' : 'שמירה'}
                </button>
            </div>
        </div>
    );
}