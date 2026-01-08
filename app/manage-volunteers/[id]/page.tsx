"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

export default function EditVolunteerPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        role: "volunteer" // 'volunteer' or 'manager'
    });

    useEffect(() => {
        fetchUser();
    }, [params.id]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F3F6EC] font-sans" dir="rtl">
                <div className="max-w-md mx-auto min-h-screen border-x border-gray-200 relative bg-[#F3F6EC]">
                    <BackButton />
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-gray-400">טוען...</div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F3F6EC] font-sans" dir="rtl">
            <div className="max-w-md mx-auto min-h-screen border-x border-gray-200 relative bg-[#F3F6EC]">
                {/* Header */}
                <div className="pt-4 px-4 pb-2 border-b border-[#A2A988]">
                    <div className="flex justify-between items-center mb-4">
                        <BackButton />
                    </div>
                </div>

                <div className="px-6 mt-6">
                    <h1 className="text-xl font-bold text-right text-black mb-1">עריכה/הסרה מתנדב.ת</h1>

                    {/* Form Section */}
                    <div className="mt-8">
                        <h2 className="text-sm text-gray-500 mb-1 border-b border-gray-400 pb-1 w-full text-right block">עריכה</h2>

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
                    </div>

                    {/* Remove Section */}
                    <div className="mt-8">
                        <h2 className="text-sm text-gray-500 mb-1 border-b border-gray-400 pb-1 w-full text-right block">הסרה</h2>
                        <div className="border border-[#A2A988] mt-2 border-t-0">
                            {/* Note: border-t-0 because the header above acts as separator or we just want a box? 
                    Actually, let's just make it a simple button block as per design request often seen.*/}
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="w-full text-center py-3 text-black font-bold bg-[#F3F6EC] hover:bg-[#eaeedd] transition-colors border-t border-[#A2A988]"
                            >
                                מחיקת פרופיל
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-12 text-center pb-8">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="text-lg font-medium text-black"
                        >
                            {saving ? "שומר..." : "שמירה"}
                        </button>
                    </div>
                </div>

            </div>

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
            />
        </main>
    );
}
