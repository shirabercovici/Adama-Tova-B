"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/client";

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
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        // Prevent multiple fetches
        if (hasFetchedUserRef.current) {
            return;
        }
        hasFetchedUserRef.current = true;
        
        fetchUsers();
        fetchCurrentUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCurrentUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            const { data: dbUser } = await supabase
                .from("users")
                .select("*")
                .eq("email", authUser.email)
                .single();
            setCurrentUser(dbUser || authUser);
        }
    };

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

    return (
        <main className="min-h-screen bg-[#F3F6EC] font-sans" dir="rtl">
            <div className="max-w-md mx-auto min-h-screen border-x border-gray-200 relative bg-[#F3F6EC]">
                {/* Header */}
                <div className="pt-4 px-4 pb-2 border-b border-[#A2A988]">
                    <div className="flex justify-between items-center mb-4">
                        <BackButton />
                        <div className="text-left rtl:text-right">
                            <h3 className="text-base font-bold text-gray-800">היי {currentUser?.first_name || "אורח"}</h3>
                            <p className="text-sm text-gray-600">{currentUser?.role || ""}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 mt-6">
                    <h1 className="text-xl font-bold text-right text-black mb-1">עריכה/הסרה איש צוות</h1>

                    {/* Search */}
                    <div className="mb-4 relative">
                        <input
                            type="text"
                            placeholder="חיפוש לפי שם/טל/מייל"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-[#A2A988] py-2 px-2 text-right focus:outline-none placeholder-gray-500 text-gray-700 font-bold"
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-0 mt-6">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">טעינה...</div>
                        ) : (
                            <div className="border-t border-[#A2A988]">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => router.push(`/manage-volunteers/${user.id}`)}
                                        className="flex items-stretch border-b border-[#A2A988] bg-[#EFF3E6] hover:bg-[#E0E5D5] cursor-pointer transition-colors h-14"
                                    >
                                        {/* Name Column (Right) */}
                                        <div className="flex-1 flex items-center justify-start pr-4 pl-2">
                                            <span className="font-bold text-gray-600 text-lg mx-auto md:mx-0 w-full text-right truncate">
                                                {user.first_name} {user.last_name}
                                            </span>
                                        </div>

                                        {/* Role Column (Middle) */}
                                        <div className="w-32 flex items-center justify-center border-r border-[#A2A988] px-2">
                                            <span className="text-black text-base">{user.role || "מתנדב.ת"}</span>
                                        </div>

                                        {/* Arrow Column (Left) */}
                                        <div className="w-12 flex items-center justify-center border-r border-[#A2A988]">
                                            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                                                <polyline points="1.5 1 8.5 8 1.5 15"></polyline>
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && !loading && (
                                    <div className="p-4 text-center text-gray-500 bg-[#EFF3E6] border-b border-[#A2A988]">לא נמצאו תוצאות</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
