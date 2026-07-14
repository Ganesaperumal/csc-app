'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  style,
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Calculate position relative to viewport
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      let width = rect.width;
      
      // Prevent rendering off-screen (bottom)
      const maxDropdownHeight = 220;
      if (rect.bottom + maxDropdownHeight > window.innerHeight) {
        top = rect.top + window.scrollY - maxDropdownHeight - 4;
      }
      
      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        background: 'var(--surface-color)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.1), 0 8px 10px -6px rgba(79, 70, 229, 0.05)',
        zIndex: 99999,
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxHeight: `${maxDropdownHeight}px`,
        overflowY: 'auto'
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Check if click was inside container OR inside the portal
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target) && !target.closest('.custom-select-portal')) {
        setIsOpen(false);
      }
    };
    // Need to use capture phase or just mousedown so it fires before React unmounts it
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);


  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        flexGrow: 1,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...style 
      }}
    >
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: disabled ? 'var(--surface-color)' : 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
          borderRadius: '10px',
          padding: '0.55rem 0.85rem',
          fontSize: '0.875rem',
          fontFamily: "'Outfit', sans-serif",
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.015)',
          minHeight: '38px',
          boxSizing: 'border-box'
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.25)';
          }
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ 
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            color: '#4f46e5'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="custom-select-portal" style={dropdownStyle}>
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                  background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                  color: isSelected ? '#4f46e5' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
              >
                {opt.label}
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
