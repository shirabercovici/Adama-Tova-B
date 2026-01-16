"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function EditVolunteerPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        role: "volunteer" // 'volunteer' or 'manager'
    });

    useEffect(() => {
        setMounted(true);
        document.body.classList.add('profile-page');
        return () => {
            document.body.classList.remove('profile-page');
        };
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch(`/manage-volunteers/api?id=${params.id}`);
                if (response.ok) {
                    const data = await response.json();
                    const user = data.user;
                    if (user) {
                        setFormData({
                            firstName: user.first_name || "",
                            lastName: user.last_name || "",
                            phone: user.phone_number || "",
                            email: user.email || "",
                            role: user.role === "מנהל.ת" ? "manager" : "volunteer"
                        });
                    }
                } else {
                    alert("שגיאה בטעינת הנתונים");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [params.id]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (value: string) => {
        setFormData(prev => ({ ...prev, role: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch("/manage-volunteers/api", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: params.id,
                    ...formData
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update user");
            }

            router.push("/manage-volunteers");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`/manage-volunteers/api?id=${params.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                router.push("/manage-volunteers");
            } else {
                alert("שגיאה במחיקת המשתמש");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("שגיאה במחיקת המשתמש");
        }
    };

    const getRoleDisplayName = () => {
        return formData.role === 'manager' ? 'מנהל.ת' : 'מתנדב.ת';
    };

    const getFullName = () => {
        const name = `${formData.firstName} ${formData.lastName}`.trim();
        return name || "טוען...";
    };

    if (loading) {
        return (
            <main className={styles.main} dir="rtl">
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <button 
                                onClick={() => router.back()}
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
                            </div>
                        </div>
                    </div>
                    <div className={styles.content}>
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingText}>טוען...</div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                {/* Header with User Info */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button 
                            onClick={() => router.back()}
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
                            <h3 className={styles.userName}>{getFullName()}</h3>
                            <p className={styles.userRole}>{getRoleDisplayName()}</p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className={styles.content}>
                    <div className={styles.formSection}>
                        {/* First Name */}
                        <div className={styles.formField}>
                            <label className={styles.fieldLabel}>שם פרטי</label>
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
                            <label className={styles.fieldLabel}>שם משפחה</label>
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
                            <label className={styles.fieldLabel}>מס&apos; טלפון</label>
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
                            <label className={styles.fieldLabel}>מייל</label>
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

                {/* Bottom Action Buttons */}
                <div className={styles.bottomSection}>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className={styles.deleteButton}
                    >
                       מחיקת איש צוות
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={styles.saveButton}
                    >
                        {saving ? "שומר..." : "שמירה"}
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>למחוק פרופיל?</h3>
                        
                        <div className={styles.modalIllustration}>
                            <Image
                                src="/icons/delete_profile.svg"
                                alt="Delete profile illustration"
                                width={180}
                                height={160}
                                className={styles.plantIcon}
                            />
                        </div>

                        <div className={styles.modalButtons}>
                            <button
                                onClick={handleDelete}
                                className={styles.confirmButton}
                            >
                                כן
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className={styles.cancelButton}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
