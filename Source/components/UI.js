import React from 'react';

export function Button({ children, onClick, variant = 'primary', className = '' }) {
    const baseStyle = "px-6 py-2 rounded font-medium transition-all duration-200 uppercase tracking-wider text-sm";
    const variants = {
        primary: "bg-[#00FF41] text-black hover:bg-[#00CC33] hover:shadow-[0_0_10px_#00FF41]", // Matrix Green
        secondary: "bg-[#FFB86C] text-black hover:bg-[#E0A050]", // Amber
        outline: "border border-white/20 text-white hover:bg-white/10"
    };

    return (
        <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {children}
        </button>
    );
}

export function Card({ children, title, className = '' }) {
    return (
        <div className={`bg-[#151722] border border-white/5 p-6 rounded-xl ${className}`}>
            {title && <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-mono">{title}</h3>}
            {children}
        </div>
    );
}
