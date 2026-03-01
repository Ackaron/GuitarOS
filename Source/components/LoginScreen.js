'use client';
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ onLogin }) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (window.electronAPI) {
                await window.electronAPI.invoke('db:set-user', trimmed);
            }
            onLogin(trimmed);
        } catch (err) {
            console.error('Login failed:', err);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0A0C14] flex items-center justify-center z-[100] overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-600/8 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[130px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
                <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white/[0.02] backdrop-blur-3xl rounded-3xl p-10">

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-5">
                            <img src="/logo.png" alt="GuitarOS" className="w-full h-full object-contain filter grayscale brightness-200" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-wider mb-1">GuitarOS</h1>
                        <p className="text-sm text-gray-500 font-medium">{t('login.subtitle') || 'Practice Environment'}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs text-gray-400 uppercase tracking-widest font-bold mb-2.5 pl-1">
                                {t('login.name_label') || 'Your Name'}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('login.name_placeholder') || 'Enter your name...'}
                                autoFocus
                                className="w-full px-5 py-4 bg-white/[0.04] rounded-xl text-white text-lg placeholder:text-gray-600 focus:outline-none focus:bg-white/[0.08] transition-all duration-300"
                                maxLength={30}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!name.trim() || isSubmitting}
                            className="w-full py-4 px-6 bg-red-600 text-white font-bold text-lg rounded-xl hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Loading...
                                </span>
                            ) : (
                                t('login.submit') || 'Start Practicing'
                            )}
                        </button>
                    </form>
                </div>

                {/* Version */}
                <p className="text-center text-[10px] text-gray-700 font-mono mt-4">GuitarOS</p>
            </div>
        </div>
    );
}
