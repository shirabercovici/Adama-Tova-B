"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import SearchBarWithAdd from "@/lib/components/SearchBarWithAdd";
import styles from "./page.module.css";
import { useThemeColor } from '@/lib/hooks/useThemeColor';

interface User {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
    role: string;
}

const CACHE_KEY = 'manage-volunteers-cache';

export default function ManageVolunteersPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const hasFetchedUserRef = useRef(false);

    // Try to get cached users first for instant display
    const getCachedUsers = (): User[] => {
        if (typeof window === 'undefined') return [];
        try {
            const cached = sessionStorage.getItem(`${CACHE_KEY}-users`);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (e) {
            // Ignore cache errors
        }
        return [];
    };

    const cachedUsers = getCachedUsers();
    const [users, setUsers] = useState<User[]>(cachedUsers);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(() => cachedUsers.length === 0);

    useEffect(() => {
        // If we have cached users, fetch in background for updates but show immediately
        // If no cache, wait for data before showing anything
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

    // Update theme-color for iOS compatibility (iOS doesn't always respect viewport exports)
    // Use cream color during loading to match loading screen, otherwise use purple
    useThemeColor(isLoading && users.length === 0 ? '#FFFCE5' : '#4D58D8');

    const fetchUsers = async () => {
        try {
            const response = await fetch("/manage-volunteers/api");
            if (response.ok) {
                const data = await response.json();
                const fetchedUsers = data.users || [];
                setUsers(fetchedUsers);

                // Cache the users for instant loading on return
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.setItem(`${CACHE_KEY}-users`, JSON.stringify(fetchedUsers));
                    } catch (e) {
                        // Ignore cache errors
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
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

    // Show loading screen when loading and no cached data
    if (isLoading && users.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingImageWrapper}>
                    <Image
                        src="/icons/loading.png"
                        alt="טוען..."
                        width={200}
                        height={200}
                        className={styles.loadingImage}
                        priority
                    />
                </div>
                <div className={styles.loadingText}>רק רגע...</div>
            </div>
        );
    }

    return (
        <main className={styles.main} dir="rtl">
            <div className={styles.container}>
                {/* Header with Search Bar and Add Button */}
                <div className={styles.header}>
                    <SearchBarWithAdd
                        placeholder="חיפוש צוות"
                        searchValue={search}
                        onSearchChange={setSearch}
                        onAddClick={() => router.push('/add-volunteer')}
                        onBackClick={() => router.back()}
                        addButtonLabel="הוסף איש צוות"
                        searchBarLabel="חיפוש צוות"
                        alwaysShowBackArrow={true}
                    />
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
                                <Link
                                    key={user.id}
                                    href={`/manage-volunteers/${user.id}`}
                                    className={styles.teamMemberItem}
                                    prefetch={true}
                                >
                                    <div className={styles.memberName}>
                                        {user.first_name} {user.last_name}
                                    </div>
                                    <div className={styles.memberRole}>
                                        {user.role || "מתנדב.ת"}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
