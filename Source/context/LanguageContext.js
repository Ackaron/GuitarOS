'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const LanguageContext = createContext();

const translations = {
    en,
    ru
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadLanguage = async () => {
            if (window.electronAPI) {
                try {
                    const prefs = await window.electronAPI.invoke('prefs:get');
                    if (prefs && prefs.general && prefs.general.language) {
                        setLanguage(prefs.general.language);
                    }
                } catch (e) {
                    console.error("Failed to load language pref", e);
                }
            }
            setIsLoaded(true);
        };
        loadLanguage();
    }, []);

    const changeLanguage = async (lang) => {
        if (!translations[lang]) return;
        setLanguage(lang);
        if (window.electronAPI) {
            try {
                // Must ensure we preserve other prefs. 
                // However, prefs:save merges with existing.
                await window.electronAPI.invoke('prefs:save', { general: { language: lang } });
            } catch (e) {
                console.error("Failed to save language pref", e);
            }
        }
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t, isLoaded }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
