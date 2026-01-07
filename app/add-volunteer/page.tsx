"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BackButton from "@/components/BackButton";

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

            // Success
            router.push("/profile");
        } catch (error: any) {
            console.error("Error creating user:", error);
            alert(`שגיאה ביצירת המשתמש: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F3F6EC] font-sans" dir="rtl">
            <div className="max-w-md mx-auto min-h-screen border-x border-gray-200 relative bg-[#F3F6EC]">
                {/* Header Style mimicking Profile or Home */}
                <div className="pt-4 px-4 pb-2 border-b border-[#A2A988]">
                    <div className="flex justify-between items-center mb-4">
                        <BackButton />
                        {/* Placeholder for top right user info if needed, for now keeping it simple as per request to open a new page */}
                    </div>
                </div>

                <div className="px-6 mt-8">
                    <h1 className="text-xl font-bold text-right text-black mb-1">הוספת איש צוות</h1>

                    {/* Form Table */}
                    <div className="border-t border-[#A2A988] mt-2 border-b">

                        {/* First Name Row */}
                        <div className="flex border-b border-[#A2A988]">
                            <div className="w-1/4 bg-[#EFF3E6] p-3 text-center font-bold border-l border-[#A2A988] flex items-center justify-center">
                                שם פרטי
                            </div>
                            <div className="w-3/4 p-2 bg-[#F3F6EC]">
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-none outline-none text-right px-2"
                                />
                            </div>
                        </div>

                        {/* Last Name Row */}
                        <div className="flex border-b border-[#A2A988]">
                            <div className="w-1/4 bg-[#EFF3E6] p-3 text-center font-bold border-l border-[#A2A988] flex items-center justify-center">
                                שם משפחה
                            </div>
                            <div className="w-3/4 p-2 bg-[#F3F6EC]">
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-none outline-none text-right px-2"
                                />
                            </div>
                        </div>

                        {/* Phone Row */}
                        <div className="flex border-b border-[#A2A988]">
                            <div className="w-1/4 bg-[#EFF3E6] p-3 text-center font-bold border-l border-[#A2A988] flex items-center justify-center">
                                טל
                            </div>
                            <div className="w-3/4 p-2 bg-[#F3F6EC]">
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-none outline-none text-right px-2"
                                    dir="ltr"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                        </div>

                        {/* Email Row */}
                        <div className="flex border-b border-[#A2A988]">
                            <div className="w-1/4 bg-[#EFF3E6] p-3 text-center font-bold border-l border-[#A2A988] flex items-center justify-center">
                                דואל
                            </div>
                            <div className="w-3/4 p-2 bg-[#F3F6EC]">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-none outline-none text-right px-2"
                                    dir="ltr"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                        </div>

                        {/* Role Row */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div className="w-1/4 bg-[#EFF3E6] p-3 text-center font-bold border-l border-[#A2A988] flex items-center justify-center">
                                תפקיד
                            </div>
                            <div className="w-3/4 p-2 bg-[#F3F6EC]" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', paddingRight: '16px', direction: 'rtl' }}>
                                <label className="items-center gap-2 cursor-pointer select-none" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', direction: 'rtl' }}>
                                    <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center ${formData.role === 'volunteer' ? 'bg-black' : 'bg-transparent'}`}>
                                        {formData.role === 'volunteer' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <span className="text-black">מתנדב.ת</span>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="volunteer"
                                        checked={formData.role === 'volunteer'}
                                        onChange={() => handleRoleChange('volunteer')}
                                        className="hidden"
                                    />
                                </label>

                                <label className="items-center gap-2 cursor-pointer select-none" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', direction: 'rtl' }}>
                                    <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center ${formData.role === 'manager' ? 'bg-black' : 'bg-transparent'}`}>
                                        {formData.role === 'manager' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <span className="text-black">מנהל.ת</span>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="manager"
                                        checked={formData.role === 'manager'}
                                        onChange={() => handleRoleChange('manager')}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Save Button */}
                    <div className="mt-12 text-center">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="text-lg font-medium text-black"
                        >
                            {loading ? "שומר..." : "שמירה"}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
