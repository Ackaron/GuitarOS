import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({
    options = [], // Array of strings or objects { label, value }
    value,        // Current value (string or array for multi)
    onChange,     // Callback
    placeholder = "Select...",
    multi = false,
    freeSolo = false // Allow typing new values
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Normalize options
    const normalizedOptions = options.map(o =>
        typeof o === 'string' ? { label: o, value: o } : o
    );

    // Filter logic
    const filteredOptions = normalizedOptions.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (optionValue) => {
        if (multi) {
            const current = Array.isArray(value) ? value : (value ? [value] : []);
            const exists = current.includes(optionValue);
            const newValue = exists
                ? current.filter(v => v !== optionValue)
                : [...current, optionValue];
            onChange(newValue);
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
        setSearch('');
    };

    const handleRemove = (valToRemove, e) => {
        e.stopPropagation();
        if (multi) {
            onChange(value.filter(v => v !== valToRemove));
        } else {
            onChange('');
        }
    };

    // Display Value
    const getDisplay = () => {
        if (multi) {
            const safeValue = Array.isArray(value) ? value : (value ? [value] : []);
            if (safeValue.length === 0) return <span className="text-gray-500">{placeholder}</span>;
            return (
                <div className="flex flex-wrap gap-1">
                    {safeValue.map(val => (
                        <span key={val} className="bg-white/5 text-xs px-2 py-1 flex items-center gap-1">
                            {val}
                            <X size={12} className="cursor-pointer hover:text-white" onClick={(e) => handleRemove(val, e)} />
                        </span>
                    ))}
                </div>
            );
        } else {
            if (!value) return <span className="text-gray-500">{placeholder}</span>;
            const found = normalizedOptions.find(o => o.value === value);
            return found ? found.label : value;
        }
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 min-h-[38px] flex items-center justify-between cursor-pointer hover:border-white/20 hover:bg-white/[0.04] focus-within:border-[#E63946] transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex-1">
                    {getDisplay()}
                </div>
                <ChevronDown size={14} className="text-gray-500 ml-2" />
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 w-full mt-2 bg-[#0F111A] border border-white/[0.05] shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    <input
                        type="text"
                        autoFocus
                        className="w-full bg-[#0F111A] border-b border-white/[0.05] p-3 text-sm text-white focus:outline-none sticky top-0"
                        placeholder="Type to search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {filteredOptions.length > 0 ? filteredOptions.map(opt => {
                        const isSelected = multi
                            ? value && value.includes(opt.value)
                            : value === opt.value;

                        return (
                            <div
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`px-4 py-3 text-sm cursor-pointer flex justify-between items-center ${isSelected ? 'text-[#E63946] bg-white/[0.02]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <Check size={14} />}
                            </div>
                        );
                    }) : (
                        <div className="p-2 text-gray-500 text-xs text-center">No results</div>
                    )}

                    {freeSolo && search && !filteredOptions.find(o => o.label === search) && (
                        <div
                            onClick={() => handleSelect(search)}
                            className="px-4 py-3 text-sm cursor-pointer text-[#E63946] hover:bg-white/[0.02] border-t border-white/[0.05]"
                        >
                            Use "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
