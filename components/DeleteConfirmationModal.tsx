import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm }: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] px-4">
            <div className="bg-[#EFF3E6] border border-black p-8 w-64 h-64 flex flex-col justify-between items-center shadow-2xl">
                <h3 className="text-lg font-bold mt-4 text-black">למחוק פרופיל?</h3>

                <div className="flex flex-col gap-3 w-full mb-2">
                    <button
                        onClick={onConfirm}
                        className="bg-transparent text-black font-bold py-1 w-full hover:text-red-600 transition-colors"
                    >
                        כן
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-black text-white font-bold py-2 w-full hover:bg-gray-800 transition-colors"
                    >
                        לא
                    </button>
                </div>
            </div>
        </div>
    );
}
