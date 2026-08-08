'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CustomSelect from '../components/CustomSelect';
import MultiSelect from '../components/MultiSelect';
import { showToast } from '@/components/GlobalDialogs';

const GOODS_TRACK_OPTIONS = [
  "01. Packing Not Scheduled",
  "02. Packing Scheduled",
  "03. Packing Material Dispatched",
  "04. Team Dispatched",
  "05. Packing Completed",
  "06. Loaded into Vehicle",
  "07. Vehicle Dispatched (Direct)",
  "08. In Transit (Direct)",
  "09. Reached WH (Part Load)",
  "10. Vehicle Dispatched (Part Load)",
  "11. Transshipment WH (Part Load)",
  "12. Vehicle In Transit",
  "13. Reached Dest WH (Part Load)",
  "14. Vehicle Arranged (Escort)",
  "15. Planed for Delivery",
  "16. Out for Delivery",
  "17. Unloading Completed",
  "18. Unpacking Completed",
  "19. Handyman Job Completed",
  "20. Goods Delivered",
  "21. VAR / Hard Copy POD Collected",
  "22. Job Completed",
  "23. Job # taken for Billing",
  "24. Customer Cancelled",
  "25. Job # to be Cancelled",
  "26. Billing Pending"
];

const CAR_TRACK_OPTIONS = [
  "01. Car Pickup Not Scheduled",
  "02. Car Pickup Scheduled",
  "03. Car Picked",
  "04. Despatched in Market Vehicle (Exclusive)",
  "05. Despatched in Mareket Vehicle (Part Load)",
  "06. In Transit",
  "07. At Destination WH",
  "08. Planed for Delivery",
  "09. Out for Delivery",
  "10. Delivered",
  "11. VAR Collected",
  "12. Complaints",
  "13. Damages",
  "14. POD Sent to the branch",
  "15. Damage Resolved",
  "16. Job Completed"
];

// --- EXACT APP CAR STATUS SLIDER COMPONENT ---
function AppCarStatusSlider({ value, onChange }: { value: string; onChange: (newVal: string) => void }) {
  const currentIndex = CAR_TRACK_OPTIONS.indexOf(value || CAR_TRACK_OPTIONS[0]);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getStageColor = (idx: number) => {
    const hues = [220, 240, 260, 280, 300, 320, 340, 0, 20, 40, 80, 120, 150, 180, 200];
    const hue = hues[idx % hues.length];
    return `hsl(${hue}, 70%, 45%)`;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const innerWidth = rect.width - 46;
      let x = e.clientX - rect.left - 23;
      x = Math.max(0, Math.min(innerWidth, x));
      let percentage = x / innerWidth;
      if (isNaN(percentage)) percentage = 0;
      const newIndex = Math.round(percentage * (CAR_TRACK_OPTIONS.length - 1));
      if (newIndex >= 0 && newIndex < CAR_TRACK_OPTIONS.length) {
        onChange(CAR_TRACK_OPTIONS[newIndex]);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.car-tooltip')) return;
    
    e.preventDefault();
    handlePointerMove(e);

    const onMove = (moveEvt: PointerEvent) => handlePointerMove(moveEvt);
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const currentColor = getStageColor(safeIndex);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0 1rem 0' }}>
      <div 
        ref={trackRef}
        onPointerDown={handlePointerDown}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '0 10px', touchAction: 'none', cursor: 'pointer' }}
      >
        <div style={{ position: 'absolute', top: '50%', left: '23px', right: '23px', height: '4px', background: 'var(--border-color)', zIndex: 0, transform: 'translateY(-50%)' }}>
          <div style={{ width: `${(safeIndex / (CAR_TRACK_OPTIONS.length - 1)) * 100}%`, height: '100%', background: '#a78bfa', transition: 'width 0.1s ease' }}></div>
        </div>
        
        {CAR_TRACK_OPTIONS.map((opt, i) => (
          <div 
            key={i} 
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ 
              width: i === safeIndex ? '36px' : '26px', 
              height: i === safeIndex ? '36px' : '26px', 
              borderRadius: i === safeIndex ? '0' : '50%', 
              background: i === safeIndex ? 'transparent' : (i < safeIndex ? '#a78bfa' : 'var(--bg-color)'),
              border: i === safeIndex ? 'none' : `2px solid ${i < safeIndex ? '#a78bfa' : 'var(--border-color)'}`,
              color: i < safeIndex ? '#fff' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', 
              fontWeight: 'bold', zIndex: 2,
              transition: 'all 0.1s ease',
              position: 'relative'
            }}
          >
            {i === safeIndex ? (
              <span style={{ transform: 'scaleX(-1) translateY(-10px)', display: 'inline-block', fontSize: '2.68rem', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.4))' }}>
                🚗
              </span>
            ) : (
              i + 1
            )}
            
            {hoveredIndex === i && (
              <div className="car-tooltip" style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                marginBottom: '8px', padding: '4px 8px', background: 'var(--text-primary)', color: '#fff',
                fontSize: '0.75rem', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10
              }}>
                {opt}
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid var(--text-primary)' }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontWeight: '700', color: currentColor, marginTop: '0.75rem', fontSize: '0.95rem', transition: 'color 0.3s ease' }}>
        {CAR_TRACK_OPTIONS[safeIndex]}
      </div>
    </div>
  );
}

// --- EXACT APP HORIZONTAL GOODS STATUS SLIDER ---
function AppGoodsStatusSlider({ value, onChange }: { value: string; onChange: (newVal: string) => void }) {
  const currentIndex = GOODS_TRACK_OPTIONS.indexOf(value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 185, 129, 0.1))',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        color: '#0d9488',
        padding: '0.5rem 1rem',
        borderRadius: '7px',
        fontWeight: 700,
        textAlign: 'center',
        fontSize: '0.88rem',
        letterSpacing: '0.03em',
        boxShadow: '0 0 10px rgba(6, 182, 212, 0.05)'
      }}>
        {GOODS_TRACK_OPTIONS[safeIndex]}
      </div>
      <input
        type="range"
        min="0"
        max={GOODS_TRACK_OPTIONS.length - 1}
        value={safeIndex}
        onChange={(e) => onChange(GOODS_TRACK_OPTIONS[parseInt(e.target.value, 10)])}
        style={{
          WebkitAppearance: 'none',
          width: '100%',
          height: '6px',
          background: 'rgba(148, 163, 184, 0.2)',
          borderRadius: '3px',
          outline: 'none',
          accentColor: '#06b6d4',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}

// --- EXACT APP VERTICAL GOODS TRACK STEPPER (FROM JOB DETAILS PAGE) ---
function AppGoodsVerticalStepper({ value, onChange }: { value: string; onChange: (newVal: string) => void }) {
  const currentIndex = GOODS_TRACK_OPTIONS.indexOf(value || GOODS_TRACK_OPTIONS[0]);

  return (
    <div style={{ padding: '1.25rem', background: 'var(--surface-color)', borderRadius: '14px', border: '1px solid var(--border-color)', height: '420px', overflowY: 'auto', position: 'relative' }}>
      <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🚚</span> Goods Track Status Stepper (Exact Job Details Page View)
      </h3>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '2.2rem' }}>
        {/* Vertical Track Line */}
        <div style={{ position: 'absolute', left: '11px', top: '12px', bottom: '12px', width: '3px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '99px' }} />

        {GOODS_TRACK_OPTIONS.map((option, idx) => {
          const isActive = value === option;
          const isCompleted = idx <= currentIndex;

          return (
            <div
              key={option}
              onClick={() => onChange(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                minHeight: '28px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-2.2rem',
                  width: '25px',
                  height: '25px',
                  borderRadius: '50%',
                  background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : (isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-color)'),
                  border: isActive ? '2px solid #10b981' : (isCompleted ? '2px solid #10b981' : '2px solid var(--border-color)'),
                  color: isActive ? '#ffffff' : (isCompleted ? '#10b981' : 'var(--text-secondary)'),
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  boxShadow: isActive ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {isActive ? '' : (isCompleted ? '✓' : idx + 1)}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : (isCompleted ? '#059669' : 'var(--text-secondary)') }}>
                {option}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function UIShowcasePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_super_admin !== true) {
        showToast('⛔ Access Denied: UI Showcase is restricted to Super Admin only.', 'error');
        router.push('/home');
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // Dropdown States
  const [singleSelectVal, setSingleSelectVal] = useState('All');
  const [multiSelectVal, setMultiSelectVal] = useState<string[]>(['BLR', 'MAA']);
  const [columnFilterSearch, setColumnFilterSearch] = useState('');
  const [columnFilterSelected, setColumnFilterSelected] = useState<string[]>(['In Transit', 'Completed']);

  // Button States
  const [btnLoading, setBtnLoading] = useState(false);

  // Slider States (Exact App Sliders)
  const [goodsStatusVal, setGoodsStatusVal] = useState(GOODS_TRACK_OPTIONS[11]); // "12. Vehicle In Transit"
  const [carStatusVal, setCarStatusVal] = useState(CAR_TRACK_OPTIONS[5]); // "06. In Transit"

  // Calendar / Date States
  const [singleDate, setSingleDate] = useState('2026-08-08');
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-08-31');

  // Input States
  const [searchText, setSearchText] = useState('');
  const [sampleInput, setSampleInput] = useState('Sample Job #');
  const [checkboxVal, setCheckboxVal] = useState(true);

  if (checkingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Checking permissions...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif", color: 'var(--text-primary)', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>🎨</span>
          <span style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5, #ec4899, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            UI Design System & Component Showcase
          </span>
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Exact interactive representations of standardized UI components, controls, dropdowns, buttons, sliders, and calendars applied across TI_Jobs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* SECTION 1: DROPDOWNS & SELECT CONTROLS */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🔽</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>1. Dropdowns & Select Controls</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Single Selection Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Single Selection Dropdown (<code style={{ color: '#4f46e5' }}>CustomSelect</code>)
              </label>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Standard single-select used on Follow-ups Operator filter, Activity Log, and Documents.
              </p>
              <CustomSelect
                placeholder="Select Operator"
                value={singleSelectVal}
                onChange={(val) => setSingleSelectVal(val)}
                options={[
                  { value: 'All', label: 'All Operators' },
                  { value: 'Chandrama', label: 'Chandrama' },
                  { value: 'Rabecca', label: 'Rabecca' },
                  { value: 'Shruti', label: 'Shruti' },
                  { value: 'Pankaj Raj', label: 'Pankaj Raj' }
                ]}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Selected: {singleSelectVal}</span>
            </div>

            {/* Multi-Select Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Multi-Select Dropdown (<code style={{ color: '#8b5cf6' }}>MultiSelect</code>)
              </label>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Used for multi-branch selection in User Details and permissions editor.
              </p>
              <MultiSelect
                options={[
                  { value: 'BLR', label: 'BLR - Bengaluru' },
                  { value: 'MAA', label: 'MAA - Chennai' },
                  { value: 'BOM', label: 'BOM - Mumbai' },
                  { value: 'DEL', label: 'DEL - Delhi' },
                  { value: 'HYD', label: 'HYD - Hyderabad' }
                ]}
                value={multiSelectVal}
                onChange={(vals) => setMultiSelectVal(vals)}
                placeholder="Select Branches"
              />
              <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600 }}>Selected ({multiSelectVal.length}): {multiSelectVal.join(', ') || 'None'}</span>
            </div>

            {/* Excel / Google Sheets Column Filter Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Table Column Filter Dropdown
              </label>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Excel/Sheets style interactive column header filter used in All Jobs table.
              </p>
              <div style={{ position: 'relative', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button style={{ flex: 1, padding: '0.3rem', background: 'rgba(244, 114, 182, 0.15)', color: '#ec4899', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Sort A-Z</button>
                  <button style={{ flex: 1, padding: '0.3rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Sort Z-A</button>
                </div>
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={columnFilterSearch}
                  onChange={e => setColumnFilterSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto' }}>
                  {['In Transit', 'Completed', 'Packing Scheduled', 'Billing Pending']
                    .filter(opt => opt.toLowerCase().includes(columnFilterSearch.toLowerCase()))
                    .map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={columnFilterSelected.includes(opt)}
                          onChange={() => {
                            if (columnFilterSelected.includes(opt)) {
                              setColumnFilterSelected(columnFilterSelected.filter(o => o !== opt));
                            } else {
                              setColumnFilterSelected([...columnFilterSelected, opt]);
                            }
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 2: BUTTONS & ACTION STYLES */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🔘</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>2. Buttons & Action Variants</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            
            {/* Primary Indigo Button */}
            <button
              onClick={() => showToast('Primary Gradient Action Triggered!', 'success')}
              style={{
                padding: '0.65rem 1.3rem',
                borderRadius: '99px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'transform 0.2s'
              }}
            >
              🚀 Primary Action
            </button>

            {/* Emerald Success Button */}
            <button
              onClick={() => showToast('Data exported successfully!', 'success')}
              style={{
                padding: '0.65rem 1.3rem',
                borderRadius: '99px',
                border: '1px solid #10b981',
                background: '#10b981',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              📊 Export to Sheets
            </button>

            {/* Violet Sync Gradient Button */}
            <button
              onClick={() => {
                setBtnLoading(true);
                setTimeout(() => setBtnLoading(false), 1500);
              }}
              style={{
                padding: '0.65rem 1.3rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {btnLoading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
              ) : (
                <span>🔄</span>
              )}
              {btnLoading ? 'Syncing ERP...' : 'Sync Fresh Data'}
            </button>

            {/* Outline Glass Button */}
            <button
              style={{
                padding: '0.65rem 1.3rem',
                borderRadius: '99px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: 'var(--glass-shadow)'
              }}
            >
              <span>🔍</span> Filter Options
            </button>

            {/* Clear Red Action Button */}
            <button
              onClick={() => showToast('Filters cleared', 'info')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '99px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ✕ Clear All Filters
            </button>

            {/* Disabled State Button */}
            <button
              disabled
              style={{
                padding: '0.65rem 1.3rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                opacity: 0.5,
                cursor: 'not-allowed'
              }}
            >
              🔒 Locked (Disabled)
            </button>

          </div>
        </section>

        {/* SECTION 3: EXACT APP SLIDERS & TRACKING STAGERS */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🎚️</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>3. Exact Application Sliders & Steppers</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* 1. Horizontal Goods Track Status Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  📦 Goods Track Horizontal Slider (<code style={{ color: '#0d9488' }}>StatusSlider</code>)
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>26 Stages</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Horizontal Goods Track slider control with cyan display badge.
              </p>
              <AppGoodsStatusSlider
                value={goodsStatusVal}
                onChange={(newVal) => setGoodsStatusVal(newVal)}
              />
            </div>

            {/* 2. Car Track Status Pointer Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  🚗 Car Track Status Pointer Slider (<code style={{ color: '#8b5cf6' }}>CarStatusSlider</code>)
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>16 Nodes with Moving Vehicle Pointer</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Car Track slider applied on Job Detail page with 16 stage nodes, track line progress, hover tooltips, and interactive moving car pointer.
              </p>
              <AppCarStatusSlider
                value={carStatusVal}
                onChange={(newVal) => setCarStatusVal(newVal)}
              />
            </div>

            {/* 3. EXACT GOODS TRACK VERTICAL STEPPER CARD FROM JOB DETAILS PAGE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                🚚 Goods Track Vertical Stepper Card (Exact Job Details View)
              </label>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Exact vertical stepper panel on right side of Job Details page with 26 interactive stage steps, glowing active state, and checkmarks.
              </p>
              <AppGoodsVerticalStepper
                value={goodsStatusVal}
                onChange={(newVal) => setGoodsStatusVal(newVal)}
              />
            </div>

          </div>
        </section>

        {/* SECTION 4: CALENDARS & DATEPICKERS */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📅</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>4. Calendars & Date Controls</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            
            {/* Single Date Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Single Date Picker</label>
              <input
                type="date"
                value={singleDate}
                onChange={e => setSingleDate(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Selected: {singleDate || 'None'}</span>
            </div>

            {/* Date Range Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Date Range Selector (From / To)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ flex: 1, padding: '0.55rem 0.6rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ flex: 1, padding: '0.55rem 0.6rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Range: {dateFrom} → {dateTo}</span>
            </div>

            {/* Calendar Follow-up Date Card Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Follow-up Date Badge Preview</label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 800, fontSize: '0.8rem' }}>
                  ⏰ ASAP Overdue
                </span>
                <span style={{ padding: '0.3rem 0.75rem', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.25)', fontWeight: 800, fontSize: '0.8rem' }}>
                  📅 08-Aug-26
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 5: INPUTS & SEARCH CONTROLS */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🔍</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>5. Inputs & Search Bars</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* Search Input Bar with Icon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pill Search Bar</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs, customers, status..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.55rem',
                    paddingBottom: '0.55rem',
                    borderRadius: '99px',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Text Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Standard Text Input</label>
              <input
                type="text"
                value={sampleInput}
                onChange={e => setSampleInput(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Checkbox */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Checkbox & Switch</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={checkboxVal}
                  onChange={e => setCheckboxVal(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <span>Enable Automated Notifications</span>
              </label>
            </div>

          </div>
        </section>

        {/* SECTION 6: BADGES, STATUS & CARDS */}
        <section className="glass" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🏷️</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>6. Badges, Tags & Notification Cards</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Status Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: 700, fontSize: '0.78rem' }}>
                🏢 BLR Branch
              </span>
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700, fontSize: '0.78rem' }}>
                22. Job Completed
              </span>
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700, fontSize: '0.78rem' }}>
                ⚠️ High Priority
              </span>
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 700, fontSize: '0.78rem' }}>
                ⏳ Pending Approval
              </span>
              <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)', fontWeight: 700, fontSize: '0.78rem' }}>
                CSC: Edit
              </span>
            </div>

            {/* Representative Pending Follow-up Notification Card */}
            <div style={{ maxWidth: '340px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                Pending Follow-ups Notification Card
              </label>
              <div style={{
                padding: '1rem',
                background: 'var(--surface-color)',
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(239,68,68,0.1)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', letterSpacing: '-0.02em', flex: 1, paddingRight: '0.5rem' }}>
                    Infosys Technologies
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.75rem' }}>#4320</span>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800 }}>08-Aug</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.4rem' }}>
                  <div>
                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.2)' }}>🏢 BLR</span>
                  </div>
                  <div>
                    <span style={{ padding: '0.15rem 0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>Vehicle Delivery</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic' }}>
                  <strong style={{ fontStyle: 'normal', color: 'var(--text-primary)' }}>Chandrama:</strong> "Followed up with customer regarding car pickup timing."
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
