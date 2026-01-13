"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface User {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
    role: string;
}

export default function ManageVolunteersPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const hasFetchedUserRef = useRef(false);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        // Prevent multiple fetches
        if (hasFetchedUserRef.current) {
            return;
        }
        hasFetchedUserRef.current = true;
        
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.body.classList.add('profile-page');
        return () => {
            document.body.classList.remove('profile-page');
        };
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/manage-volunteers/api");
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const term = search.toLowerCase();
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
        const phone = (user.phone_number || "").toLowerCase();
        const email = (user.email || "").toLowerCase();

        return fullName.includes(term) || phone.includes(term) || email.includes(term);
    });

    // Count volunteers and managers from ALL users (not filtered)
    const volunteerCount = users.filter(
        (user) => user.role === "מתנדב.ת" || user.role === "מתנדב" || user.role === "מתנדבת" || (user.role && user.role.includes("מתנדב"))
    ).length;
    const managerCount = users.filter(
        (user) => user.role === "מנהל.ת" || user.role === "מנהל" || user.role === "מנהלת" || (user.role && user.role.includes("מנהל"))
    ).length;

    if (loading) {
        return (
            <main className={styles.main} dir="rtl">
                <div className={styles.container}>
                    <div className={styles.backButtonWrapper}>
                        <button 
                            onClick={() => router.back()}
                            className={styles.closeXButton}
                            aria-label="סגור"
                        >
                            ×
                        </button>
                    </div>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingText}>טוען...</div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                <div className={styles.backButtonWrapper}>
                    <button 
                        onClick={() => router.back()}
                        className={styles.closeXButton}
                        aria-label="סגור"
                    >
                        ×
                    </button>
                </div>

                {/* Header with Add Button and Search */}
                <div className={styles.header}>
                    <div className={styles.searchBarWrapper}>
                        <input
                            type="text"
                            placeholder="חיפוש צוות"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={styles.searchBar}
                        />
                        <svg
                            className={styles.searchIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <button
                        onClick={() => router.push('/add-volunteer')}
                        className={styles.addButton}
                        aria-label="הוסף איש צוות"
                    >
                        <svg
                            className={styles.addButtonIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="8" r="5" />
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Team Summary */}
                    <div className={styles.teamSummary}>
                        {volunteerCount} מתנדבים.ות{managerCount > 0 ? `, ${managerCount} מנהלים.ות` : ""}
                    </div>

                    <hr className={styles.divider} />

                    {/* Team Members List */}
                    {filteredUsers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateText}>
                                {search ? "לא נמצאו תוצאות" : "אין אנשי צוות"}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.teamList}>
                            {filteredUsers.map((user, index) => (
                                <div
                                    key={user.id}
                                    className={styles.teamMemberItem}
                                    onClick={() => router.push(`/manage-volunteers/${user.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.memberName}>
                                        {user.first_name} {user.last_name}
                                    </div>
                                    <div className={styles.memberRole}>
                                        {user.role || "מתנדב.ת"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
