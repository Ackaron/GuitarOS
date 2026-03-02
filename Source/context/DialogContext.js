"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const DialogContext = createContext({});

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [dialogs, setDialogs] = useState([]);

    const showAlert = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            setDialogs(prev => [...prev, {
                id,
                type: 'alert',
                message,
                title: options.title || 'Внимание',
                icon: options.icon || 'info',
                onClose: () => {
                    setDialogs(prev => prev.filter(d => d.id !== id));
                    resolve(true); // alerts always resolve to true when closed
                }
            }]);
        });
    }, []);

    const showConfirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            const id = crypto.randomUUID();
            setDialogs(prev => [...prev, {
                id,
                type: 'confirm',
                message,
                title: options.title || 'Подтверждение',
                icon: options.icon || 'alert',
                confirmText: options.confirmText || 'ОК',
                cancelText: options.cancelText || 'Отмена',
                onConfirm: () => {
                    setDialogs(prev => prev.filter(d => d.id !== id));
                    resolve(true);
                },
                onCancel: () => {
                    setDialogs(prev => prev.filter(d => d.id !== id));
                    resolve(false);
                }
            }]);
        });
    }, []);

    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'success': return <CheckCircle2 className="text-green-400" size={24} />;
            case 'error': return <AlertTriangle className="text-red-400" size={24} />;
            case 'alert': return <AlertTriangle className="text-yellow-400" size={24} />;
            case 'info':
            default: return <Info className="text-blue-400" size={24} />;
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {/* Dialogs Portal */}
            {dialogs.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    {dialogs.map((dialog, index) => (
                        <div
                            key={dialog.id}
                            className="bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full animate-in zoom-in-95 fade-in duration-200"
                            style={{
                                zIndex: 100 + index,
                                position: dialogs.length > 1 ? 'absolute' : 'relative',
                                transform: dialogs.length > 1 ? `scale(${1 - (dialogs.length - 1 - index) * 0.05}) translateY(${(dialogs.length - 1 - index) * -20}px)` : 'none'
                            }}
                        >
                            <div className="flex items-start gap-4 p-6">
                                <div className="mt-1 flex-shrink-0">
                                    {renderIcon(dialog.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white mb-2">{dialog.title}</h3>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{dialog.message}</p>
                                </div>
                            </div>

                            <div className="bg-black/40 px-6 py-4 flex justify-end gap-3 border-t border-white/5">
                                {dialog.type === 'confirm' && (
                                    <button
                                        onClick={dialog.onCancel}
                                        className="px-4 py-2 rounded-lg font-medium text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        {dialog.cancelText}
                                    </button>
                                )}

                                <button
                                    onClick={dialog.type === 'confirm' ? dialog.onConfirm : dialog.onClose}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm text-white transition-colors shadow-lg ${dialog.icon === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                                            dialog.icon === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' :
                                                'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                                        }`}
                                >
                                    {dialog.type === 'confirm' ? dialog.confirmText : 'ОК'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DialogContext.Provider>
    );
};
