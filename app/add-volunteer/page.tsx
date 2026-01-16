"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function AddVolunteerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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

    const fullName = formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}` 
        : "";
    const displayRole = formData.role === "volunteer" ? "מתנדב.ת" : "מנהל.ת";

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                {/* Top Section - Beige/Cream background */}
                <div className={styles.topSection}>
                    <div className={styles.backButtonWrapper}>
                        <button 
                            onClick={handleBack}
                            className={styles.closeXButton}
                            aria-label="סגור"
                        >
                            ×
                        </button>
                    </div>
                    <div className={styles.userInfo}>
                        <h3 className={styles.userName}>
                            {fullName || "הוספת איש צוות חדש"}
                        </h3>
                    </div>
                </div>

                {/* Middle Section - Blue-Purple background */}
                <div className={styles.middleSection}>
                    {/* First Name Field */}
                    <div className={styles.formField}>
                        <label className={styles.fieldLabel}>שם פרטי</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className={styles.fieldInput}
                        />
                    </div>

                    {/* Last Name Field */}
                    <div className={styles.formField}>
                        <label className={styles.fieldLabel}>שם משפחה</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className={styles.fieldInput}
                        />
                    </div>

                    {/* Phone Number Field */}
                    <div className={styles.formField}>
                        <label className={styles.fieldLabel}>מס&apos; טלפון</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={styles.fieldInput}
                            dir="ltr"
                        />
                    </div>

                    {/* Email Field */}
                    <div className={styles.formField}>
                        <label className={styles.fieldLabel}>מייל</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={styles.fieldInput}
                            dir="ltr"
                        />
                    </div>

                    {/* Permissions Section */}
                    <div className={styles.permissionsSection}>
                        <label className={styles.permissionsLabel}>הרשאה</label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="volunteer"
                                    checked={formData.role === 'volunteer'}
                                    onChange={() => handleRoleChange('volunteer')}
                                    className={styles.radioInput}
                                />
                                <div className={`${styles.radioButton} ${formData.role === 'volunteer' ? styles.selected : ''}`}></div>
                                <span className={styles.radioLabel}>מתנדב.ת</span>
                            </label>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="manager"
                                    checked={formData.role === 'manager'}
                                    onChange={() => handleRoleChange('manager')}
                                    className={styles.radioInput}
                                />
                                <div className={`${styles.radioButton} ${formData.role === 'manager' ? styles.selected : ''}`}></div>
                                <span className={styles.radioLabel}>מנהל.ת</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Light Yellow background */}
                <div className={styles.bottomSection}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`${styles.actionButton} ${styles.saveButton}`}
                    >
                        {loading ? "שומר..." : "שמירה"}
                    </button>
                </div>
            </div>
        </main>
    );
}
