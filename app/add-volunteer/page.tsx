"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AddVolunteerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.classList.add('profile-page');
        return () => {
            document.body.classList.remove('profile-page');
        };
    }, []);

    // Auto-dismiss success modal after 2.5 seconds
    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                router.push("/manage-volunteers");
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal, router]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        role: "volunteer" // 'volunteer' | 'manager'
    });

    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: false }));
        }
    };

    const handleRoleChange = (role: string) => {
        setFormData((prev) => ({ ...prev, role }));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, boolean> = {};
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = true;
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = true;
        }
        if (!formData.phone.trim()) {
            newErrors.phone = true;
        }
        if (!formData.email.trim()) {
            newErrors.email = true;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        // Validate before submitting
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/add-volunteer/api", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create user");
            }

            // Success - clear all fields for next entry
            setFormData({
                firstName: "",
                lastName: "",
                phone: "",
                email: "",
                role: "volunteer"
            });
            setErrors({});
            
            // Show success modal
            setShowSuccessModal(true);
            setLoading(false);
        } catch (error: any) {
            console.error("Error creating user:", error);
            alert(`שגיאה ביצירת המשתמש: ${error.message || "Unknown error"}`);
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                {/* Header with User Info */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button 
                            onClick={handleBack}
                            className={styles.closeXButton}
                            aria-label="סגור"
                        >
                            ×
                        </button>
                        <div className={styles.userInfo}>
                            <h3 className={styles.userName}>הוספת איש צוות חדש</h3>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className={styles.content}>
                    <div className={styles.formSection}>
                        {/* First Name */}
                        <div className={`${styles.formField} ${errors.firstName ? styles.fieldError : ''}`}>
                            <label className={styles.fieldLabel}>שם פרטי*</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`${styles.fieldInput} ${errors.firstName ? styles.inputError : ''}`}
                                placeholder="הזן שם פרטי"
                            />
                        </div>

                        {/* Last Name */}
                        <div className={`${styles.formField} ${errors.lastName ? styles.fieldError : ''}`}>
                            <label className={styles.fieldLabel}>שם משפחה*</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`${styles.fieldInput} ${errors.lastName ? styles.inputError : ''}`}
                                placeholder="הזן שם משפחה"
                            />
                        </div>

                        {/* Phone */}
                        <div className={`${styles.formField} ${errors.phone ? styles.fieldError : ''}`}>
                            <label className={styles.fieldLabel}>מס&apos; טלפון*</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`${styles.fieldInput} ${errors.phone ? styles.inputError : ''}`}
                                placeholder="הזן מספר טלפון"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                            />
                        </div>

                        {/* Email */}
                        <div className={`${styles.formField} ${errors.email ? styles.fieldError : ''}`}>
                            <label className={styles.fieldLabel}>מייל*</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`${styles.fieldInput} ${errors.email ? styles.inputError : ''}`}
                                placeholder="הזן כתובת מייל"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                            />
                        </div>

                        {/* Role Selection */}
                        <div className={styles.roleSection}>
                            <label className={styles.roleLabel}>הרשאה</label>
                            <div className={styles.roleOptions}>
                                <label className={styles.roleOption} onClick={() => handleRoleChange('volunteer')}>
                                    <div className={`${styles.radioButton} ${formData.role === 'volunteer' ? styles.active : ''}`}>
                                        {formData.role === 'volunteer' && <div className={styles.radioButtonInner}></div>}
                                    </div>
                                    <span className={styles.roleText}>מתנדב.ת</span>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="volunteer"
                                        checked={formData.role === 'volunteer'}
                                        onChange={() => handleRoleChange('volunteer')}
                                        className={styles.hiddenInput}
                                    />
                                </label>

                                <div className={styles.roleSeparator}></div>

                                <label className={styles.roleOption} onClick={() => handleRoleChange('manager')}>
                                    <div className={`${styles.radioButton} ${formData.role === 'manager' ? styles.active : ''}`}>
                                        {formData.role === 'manager' && <div className={styles.radioButtonInner}></div>}
                                    </div>
                                    <span className={styles.roleText}>מנהל.ת</span>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="manager"
                                        checked={formData.role === 'manager'}
                                        onChange={() => handleRoleChange('manager')}
                                        className={styles.hiddenInput}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Button */}
                <div className={styles.bottomSection}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={styles.saveButton}
                    >
                        שמירה
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>איש הצוות נוסף בהצלחה!</h3>
                        
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
        </main>
    );
}
