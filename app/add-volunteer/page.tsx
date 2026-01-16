"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function AddVolunteerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.classList.add('profile-page');
        return () => {
            document.body.classList.remove('profile-page');
        };
    }, []);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        role: "volunteer" // 'volunteer' | 'manager'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (role: string) => {
        setFormData((prev) => ({ ...prev, role }));
    };

    const handleSave = async () => {
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
            
            // Show success message (optional)
            alert("המתנדב נוסף בהצלחה!");
        } catch (error: any) {
            console.error("Error creating user:", error);
            alert(`שגיאה ביצירת המשתמש: ${error.message || "Unknown error"}`);
        } finally {
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
                            className={styles.backButton}
                            aria-label="חזור"
                        >
                            <Image
                                src="/icons/right_arrow.svg"
                                alt="חזור"
                                width={17}
                                height={21}
                            />
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
                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>שם פרטי*</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={styles.fieldInput}
                                placeholder="הזן שם פרטי"
                            />
                        </div>

                        {/* Last Name */}
                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>שם משפחה*</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={styles.fieldInput}
                                placeholder="הזן שם משפחה"
                            />
                        </div>

                        {/* Phone */}
                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>מס&apos; טלפון*</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={styles.fieldInput}
                                placeholder="הזן מספר טלפון"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                            />
                        </div>

                        {/* Email */}
                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>מייל*</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={styles.fieldInput}
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
                        {loading ? "שומר..." : "שמירה"}
                    </button>
                </div>
            </div>
        </main>
    );
}
