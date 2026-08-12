'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  disabled?: boolean;
  textColor?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'None',
  style,
  triggerStyle,
  disabled = false,
  textColor
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      let width = Math.max(rect.width, 140);

      // Prevent rendering off-screen (right)
      if (left + width > window.innerWidth - 16) {
        left = window.innerWidth - width - 16;
      }

      // Prevent rendering off-screen (bottom)
      const maxDropdownHeight = 240;
      if (rect.bottom + maxDropdownHeight > window.innerHeight) {
        top = Math.max(8, rect.top + window.scrollY - maxDropdownHeight - 4);
      }

      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        background: 'var(--surface-color, #ffffff)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        zIndex: 99999,
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxHeight: '240px',
        overflowY: 'auto'
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target) && !target.closest('.custom-select-portal')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const isFilled = Boolean(selectedOption);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        flexGrow: 1,
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
          background: disabled 
            ? (textColor ? `${textColor}15` : 'var(--bg-color)')
            : (textColor ? `${textColor}15` : 'var(--bg-color)'),
          border: textColor ? `1px solid ${textColor}40` : '1px solid var(--border-color)',
          color: textColor || (isFilled ? 'var(--text-primary)' : 'var(--text-secondary)'),
          fontWeight: textColor ? 700 : (isFilled ? 600 : 400),
          borderRadius: '10px',
          padding: '0.55rem 0.85rem',
          fontSize: '0.875rem',
          fontFamily: "'Outfit', sans-serif",
          cursor: disabled ? 'default' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.015)',
          minHeight: '38px',
          boxSizing: 'border-box',
          ...triggerStyle
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = textColor ? `${textColor}40` : 'var(--border-color)';
          }
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: '0.25rem',
          opacity: isFilled ? 1 : 0.4,
          fontWeight: isFilled ? (textColor ? 700 : 600) : 400
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
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
            color: textColor || '#4f46e5',
            opacity: disabled ? 0.35 : 1,
            flexShrink: 0
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
                  gap: '0.5rem'
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
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
