import React from 'react';

export function Button({ children, onClick, variant = 'primary', className = '' }) {
    const baseStyle = "px-6 py-2.5 rounded-full font-medium transition-all duration-300 text-sm flex items-center justify-center";
    const variants = {
        primary: "bg-[#E63946] text-white hover:brightness-110", // Sharp crisp red, no shadows
        secondary: "bg-transparent text-gray-400 hover:text-white", // Ghost button
        outline: "border border-white/20 text-gray-300 hover:text-white hover:border-white", // Minimal outline
        ghost: "bg-transparent border-transparent" // Clean base for custom icons
    };

    const finalVariantStyle = variants[variant] || variants.secondary;

    return (
        <button onClick={onClick} className={`${baseStyle} ${finalVariantStyle} ${className}`}>
            {children}
        </button>
    );
}

export function Card({ children, title, className = '' }) {
    return (
        <div className={`p-6 ${className}`}>
            {title && <h3 className="text-gray-500 text-xs font-medium tracking-widest uppercase mb-6">{title}</h3>}
            {children}
        </div>
    );
}
