'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  textColor?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'All',
  style,
  disabled = false,
  textColor
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let top = rect.bottom + window.scrollY + 4;
      let left = rect.left + window.scrollX;
      let width = rect.width;
      
      const maxDropdownHeight = 220;
      if (rect.bottom + maxDropdownHeight > window.innerHeight) {
        top = rect.top + window.scrollY - maxDropdownHeight - 4;
      }
      
      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
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
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target) && !target.closest('.multi-select-portal')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleOption = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (optValue === 'All') {
      onChange(['All']);
      return;
    }
    
    let nextValue = [...value];
    if (nextValue.includes('All')) {
      nextValue = nextValue.filter(v => v !== 'All');
    }
    
    if (nextValue.includes(optValue)) {
      nextValue = nextValue.filter(v => v !== optValue);
      if (nextValue.length === 0) {
        nextValue = ['All'];
      }
    } else {
      nextValue.push(optValue);
    }
    onChange(nextValue);
  };

  const getDisplayText = () => {
    if (!value || value.length === 0 || value.includes('All')) return placeholder;
    if (value.length === 1) {
      return options.find(o => o.value === value[0])?.label || value[0];
    }
    return `${value.length} selected`;
  };

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
          background: disabled ? 'var(--surface-color)' : (textColor ? `${textColor}15` : 'var(--bg-color)'),
          border: textColor ? `1px solid ${textColor}40` : '1px solid var(--border-color)',
          color: textColor || (value && value.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'),
          fontWeight: textColor ? 700 : 'inherit',
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
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getDisplayText()}</span>
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
            color: '#4f46e5',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="multi-select-portal" style={dropdownStyle}>
          {options.map(opt => {
            const isSelected = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={(e) => toggleOption(opt.value, e)}
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
                  gap: '0.5rem',
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
              >
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  readOnly 
                  style={{ accentColor: '#4f46e5', pointerEvents: 'none' }} 
                />
                {opt.label}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
