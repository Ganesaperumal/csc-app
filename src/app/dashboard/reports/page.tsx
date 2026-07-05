'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getUserColor } from '@/lib/colorUtils';
import CustomSelect from '../components/CustomSelect';

// HSL-based beautiful color palette for charts
const CHART_COLORS = [
  '#4f46e5', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#d946ef', // Fuchsia
  '#84cc16', // Lime
];

// Helper to format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// --- Beautiful SVG Donut Chart ---
function DonutChart({ 
  data, 
  title 
}: { 
  data: { label: string; value: number }[]; 
  title: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);
  
  const chartData = useMemo(() => {
    let currentAngle = 0;
    return data.map((item, index) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = total > 0 ? (item.value / total) * 360 : 0;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...item,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: CHART_COLORS[index % CHART_COLORS.length]
      };
    });
  }, [data, total]);

  // SVG parameters
  const size = 200;
  const radius = 70;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '280px', padding: '1rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'flex-start' }}>{title}</h4>
      
      {total === 0 ? (
        <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          No data available
        </div>
      ) : (
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={center} cy={center} r={radius} fill="transparent" stroke="rgba(148,163,184,0.08)" strokeWidth={strokeWidth} />
              {chartData.map((slice, idx) => {
                const dashArray = circumference;
                const dashOffset = circumference - (slice.percentage / 100) * circumference;
                // Rotate the circle path to start from the correct angle (default starts at 3 o'clock, so we subtract 90deg to start at 12 o'clock)
                const rotation = slice.startAngle - 90;
                
                const isHovered = hoveredIdx === idx;
                
                return (
                  <circle
                    key={slice.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(${rotation} ${center} ${center})`}
                    style={{ 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                      cursor: 'pointer',
                      opacity: hoveredIdx === null || isHovered ? 1 : 0.65
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>
            
            {/* Center Text displaying hover info */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', textAlign: 'center', padding: '1rem'
            }}>
              {hoveredIdx !== null ? (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chartData[hoveredIdx].label}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: chartData[hoveredIdx].color }}>
                    {chartData[hoveredIdx].value}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                    {chartData[hoveredIdx].percentage.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Total</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{total}</span>
                </>
              )}
            </div>
          </div>

          {/* Custom Side Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '140px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {chartData.map((slice, idx) => (
              <div 
                key={slice.label} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer',
                  padding: '2px 4px', borderRadius: '4px', background: hoveredIdx === idx ? 'rgba(0,0,0,0.03)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: slice.color, flexShrink: 0 }} />
                <span style={{ color: '#334155', fontWeight: hoveredIdx === idx ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {slice.label}
                </span>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{slice.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Beautiful SVG Grouped Bar Chart ---
function GroupedBarChart({
  data,
  keys,
  labels,
  title
}: {
  data: { label: string; [key: string]: any }[];
  keys: string[];
  labels: string[];
  title: string;
}) {
  const [hoveredBar, setHoveredBar] = useState<{ groupIdx: number; keyIdx: number } | null>(null);

  // Compute maximum value
  const maxVal = useMemo(() => {
    let max = 0;
    data.forEach(item => {
      keys.forEach(k => {
        if (item[k] > max) max = item[k];
      });
    });
    return max === 0 ? 10 : Math.ceil(max * 1.15); // Add 15% headroom
  }, [data, keys]);

  // Chart config
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const contentWidth = 500;
  const contentHeight = chartHeight - paddingTop - paddingBottom;
  
  const groupWidth = data.length > 0 ? (contentWidth / data.length) : 0;
  const barWidth = keys.length > 0 ? (groupWidth * 0.7) / keys.length : 0;
  const barGap = 2;

  const keyColors = ['#4f46e5', '#a78bfa', '#f472b6'];

  return (
    <div className="glass" style={{ flex: 1, minWidth: '320px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {keys.map((k, idx) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: keyColors[idx % keyColors.length] }} />
              {labels[idx]}
            </div>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          No data available
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${contentWidth + paddingLeft + paddingRight} ${chartHeight}`} style={{ minWidth: `${contentWidth + paddingLeft + paddingRight}px` }}>
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = paddingTop + contentHeight * (1 - pct);
              const gridVal = Math.round(maxVal * pct);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={paddingLeft + contentWidth} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="600">
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((group, gIdx) => {
              const groupStartX = paddingLeft + gIdx * groupWidth + (groupWidth * 0.15);
              return (
                <g key={group.label}>
                  {/* Group Labels */}
                  <text
                    x={groupStartX + (groupWidth * 0.7) / 2}
                    y={chartHeight - paddingBottom + 18}
                    fill="#334155"
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {group.label}
                  </text>

                  {/* Individual Bars inside group */}
                  {keys.map((k, kIdx) => {
                    const val = group[k] || 0;
                    const barHeight = maxVal > 0 ? (val / maxVal) * contentHeight : 0;
                    const x = groupStartX + kIdx * (barWidth + barGap);
                    const y = chartHeight - paddingBottom - barHeight;
                    
                    const isHovered = hoveredBar?.groupIdx === gIdx && hoveredBar?.keyIdx === kIdx;
                    
                    return (
                      <g key={k}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(2, barHeight)}
                          fill={keyColors[kIdx % keyColors.length]}
                          rx="3"
                          ry="3"
                          style={{ 
                            transition: 'all 0.2s ease', 
                            cursor: 'pointer',
                            opacity: hoveredBar === null || isHovered ? 1 : 0.7
                          }}
                          onMouseEnter={() => setHoveredBar({ groupIdx: gIdx, keyIdx: kIdx })}
                          onMouseLeave={() => setHoveredBar(null)}
                        />
                        {isHovered && (
                          <g>
                            {/* Hover tooltip directly above the bar */}
                            <rect
                              x={x + barWidth/2 - 20}
                              y={y - 20}
                              width="40"
                              height="16"
                              rx="3"
                              fill="#1e293b"
                            />
                            <text
                              x={x + barWidth/2}
                              y={y - 9}
                              fill="white"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {val}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            
            {/* Base Line */}
            <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={paddingLeft + contentWidth} y2={chartHeight - paddingBottom} stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// --- Beautiful SVG Area / Timeline Chart ---
function TimelineChart({
  data,
  title
}: {
  data: { date: string; count: number }[];
  title: string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const maxVal = useMemo(() => {
    const max = Math.max(...data.map(d => d.count), 0);
    return max === 0 ? 10 : Math.ceil(max * 1.2);
  }, [data]);

  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const contentWidth = 520;
  const contentHeight = chartHeight - paddingTop - paddingBottom;
  
  const stepX = data.length > 1 ? contentWidth / (data.length - 1) : contentWidth;

  const points = useMemo(() => {
    return data.map((item, idx) => {
      const x = paddingLeft + idx * stepX;
      const y = maxVal > 0 ? paddingTop + contentHeight * (1 - item.count / maxVal) : paddingTop + contentHeight;
      return { x, y, ...item };
    });
  }, [data, maxVal, stepX]);

  // Build SVG path strings
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((path, p, idx) => {
      return path + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const start = `M ${points[0].x} ${chartHeight - paddingBottom}`;
    const line = points.map(p => `L ${p.x} ${p.y}`).join(' ');
    const end = `L ${points[points.length - 1].x} ${chartHeight - paddingBottom} Z`;
    return `${start} ${line} ${end}`;
  }, [points]);

  return (
    <div className="glass" style={{ flex: 1, minWidth: '320px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
      
      {data.length === 0 ? (
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          No data available
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${contentWidth + paddingLeft + paddingRight} ${chartHeight}`} style={{ minWidth: `${contentWidth + paddingLeft + paddingRight}px` }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = paddingTop + contentHeight * (1 - pct);
              const gridVal = Math.round(maxVal * pct);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={paddingLeft + contentWidth} y2={y} stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="600">
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Fill Area */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Line Path */}
            <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* X Axis Labels */}
            {points.map((p, idx) => {
              // Show label for every 2nd day or first/last to avoid clutter
              const showLabel = points.length < 8 || idx % 2 === 0 || idx === points.length - 1;
              return (
                <g key={idx}>
                  {showLabel && (
                    <text
                      x={p.x}
                      y={chartHeight - paddingBottom + 18}
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {p.date}
                    </text>
                  )}
                  
                  {/* Interactive marker dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint === idx ? 6 : 4}
                    fill={hoveredPoint === idx ? '#4f46e5' : '#ffffff'}
                    stroke="#4f46e5"
                    strokeWidth="2"
                    style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}

            {/* Tooltip on Hover */}
            {hoveredPoint !== null && (
              <g>
                <line
                  x1={points[hoveredPoint].x}
                  y1={paddingTop}
                  x2={points[hoveredPoint].x}
                  y2={chartHeight - paddingBottom}
                  stroke="#4f46e5"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                
                <rect
                  x={points[hoveredPoint].x - 45}
                  y={points[hoveredPoint].y - 28}
                  width="90"
                  height="22"
                  rx="4"
                  fill="#0f172a"
                  style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))' }}
                />
                <text
                  x={points[hoveredPoint].x}
                  y={points[hoveredPoint].y - 14}
                  fill="white"
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {points[hoveredPoint].date}: {points[hoveredPoint].count} act.
                </text>
              </g>
            )}

            {/* Base line */}
            <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={paddingLeft + contentWidth} y2={chartHeight - paddingBottom} stroke="rgba(148,163,184,0.3)" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// --- MAIN REPORTS PAGE COMPONENT ---
export default function ReportsPage() {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'jobs' | 'agents'>('jobs');
  
  // Loading and Raw Data States
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // 360-Degree Filters for Active Jobs
  const [jobSearch, setJobSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGoodsType, setFilterGoodsType] = useState('');
  const [filterOperationBy, setFilterOperationBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Agent for Agent Details view
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentActivitySearch, setAgentActivitySearch] = useState('');

  // Sorting for Active Jobs table
  const [jobsSortField, setJobsSortField] = useState('job_date');
  const [jobsSortOrder, setJobsSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Check authentication and load data
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      await loadAllAnalyticsData();
    };

    initPage();
  }, []);

  const loadAllAnalyticsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profiles
      const { data: pData } = await supabase.from('profiles').select('*');
      setProfiles(pData || []);

      // 2. Fetch Jobs (including both active & billed/closed for lead times & full insights)
      const { data: jData } = await supabase.from('jobs').select('*');
      setJobs(jData || []);

      // 3. Fetch Audit Logs (limit to 2000 for efficiency)
      const { data: aData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(2000);
      setAuditLogs(aData || []);

      // 4. Fetch Job Communications
      const { data: cData } = await supabase.from('job_communications').select('*');
      setComms(cData || []);

      // 5. Fetch Job Notes
      const { data: nData } = await supabase.from('job_notes').select('*');
      setNotes(nData || []);

    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. JOBS DATA PROCESSING ---
  
  // Extract active jobs following the same business logic as active dashboard
  const activeJobsRaw = useMemo(() => {
    return jobs.filter(job => {
      if (job.erp_status?.toLowerCase().includes('cancel')) return false;

      const isBilled = job.erp_status?.toLowerCase() === 'billed';
      if (!isBilled) return true;

      const goodsCompleted = job.goods_track_status === '22. Job Completed';
      const carIncluded = job.car_included === true || job.car_included === 'Yes' || job.car_included === 'yes';

      if (!carIncluded) {
        return !goodsCompleted;
      } else {
        const carCompleted = job.car_track_status === '16. Job Completed';
        return !(goodsCompleted && carCompleted);
      }
    });
  }, [jobs]);

  // Extract unique filtering options from raw active jobs
  const filterOptions = useMemo(() => {
    const branches = new Set<string>();
    const statuses = new Set<string>();
    const goodsTypes = new Set<string>();

    activeJobsRaw.forEach(job => {
      if (job.branch) branches.add(job.branch.trim());
      if (job.goods_track_status) statuses.add(job.goods_track_status.trim());
      if (job.goods_type) {
        // Group raw goods type slightly to keep clean filter
        if (job.goods_type.toLowerCase().includes('household') || job.goods_type.toLowerCase().includes('hhg')) {
          goodsTypes.add('Household');
        } else if (job.goods_type.toLowerCase().includes('commercial') || job.goods_type.toLowerCase().includes('office')) {
          goodsTypes.add('Commercial');
        } else {
          goodsTypes.add(job.goods_type.trim());
        }
      }
    });

    return {
      branches: Array.from(branches).sort(),
      statuses: Array.from(statuses).sort(),
      goodsTypes: Array.from(goodsTypes).sort(),
    };
  }, [activeJobsRaw]);

  // Apply 360-degree filters to Active Jobs
  const filteredActiveJobs = useMemo(() => {
    let result = [...activeJobsRaw];

    if (jobSearch) {
      const searchLower = jobSearch.toLowerCase();
      result = result.filter(j => 
        j.job_number?.toLowerCase().includes(searchLower) ||
        j.customer_name?.toLowerCase().includes(searchLower) ||
        j.company?.toLowerCase().includes(searchLower) ||
        j.erp_job_id?.toString().includes(searchLower)
      );
    }

    if (filterBranch) {
      result = result.filter(j => j.branch === filterBranch);
    }

    if (filterStatus) {
      result = result.filter(j => j.goods_track_status === filterStatus);
    }

    if (filterGoodsType) {
      result = result.filter(j => {
        if (!j.goods_type) return false;
        if (filterGoodsType === 'Household') {
          return j.goods_type.toLowerCase().includes('household') || j.goods_type.toLowerCase().includes('hhg');
        }
        if (filterGoodsType === 'Commercial') {
          return j.goods_type.toLowerCase().includes('commercial') || j.goods_type.toLowerCase().includes('office');
        }
        return j.goods_type === filterGoodsType;
      });
    }

    if (filterOperationBy) {
      result = result.filter(j => j.operation_by === filterOperationBy);
    }

    if (startDate) {
      result = result.filter(j => j.job_date && j.job_date >= startDate);
    }

    if (endDate) {
      result = result.filter(j => j.job_date && j.job_date <= endDate);
    }

    // Apply Sorting
    return result.sort((a, b) => {
      let aVal = a[jobsSortField];
      let bVal = b[jobsSortField];
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return jobsSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      
      if (strA < strB) return jobsSortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return jobsSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  }, [activeJobsRaw, jobSearch, filterBranch, filterStatus, filterGoodsType, filterOperationBy, startDate, endDate, jobsSortField, jobsSortOrder]);

  // Compute Active Jobs Reports Metrics
  const jobsMetrics = useMemo(() => {
    const totalJobs = filteredActiveJobs.length;
    let deviationCount = 0;
    let carIncludedCount = 0;
    let totalTransitDays = 0;
    let transitDaysCount = 0;

    const branchCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const goodsTypeCounts: Record<string, number> = {};

    filteredActiveJobs.forEach(j => {
      if (j.deviation === true || j.deviation === 'Yes') deviationCount++;
      if (j.car_included === true || j.car_included === 'Yes' || j.car_included === 'yes') carIncludedCount++;
      if (j.transit_days) {
        totalTransitDays += Number(j.transit_days);
        transitDaysCount++;
      }

      // Branch
      const br = j.branch || 'Unknown';
      branchCounts[br] = (branchCounts[br] || 0) + 1;

      // Status
      const st = j.goods_track_status ? j.goods_track_status.split('. ')[1] || j.goods_track_status : 'Pending';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      // Goods Type
      let gt = 'Other';
      if (j.goods_type) {
        if (j.goods_type.toLowerCase().includes('household') || j.goods_type.toLowerCase().includes('hhg')) {
          gt = 'Household';
        } else if (j.goods_type.toLowerCase().includes('commercial') || j.goods_type.toLowerCase().includes('office')) {
          gt = 'Commercial';
        } else {
          gt = j.goods_type;
        }
      }
      goodsTypeCounts[gt] = (goodsTypeCounts[gt] || 0) + 1;
    });

    // Format chart ready data
    const branchChart = Object.entries(branchCounts).map(([label, value]) => ({ label, value }));
    const statusChart = Object.entries(statusCounts).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value).slice(0, 5);
    const goodsTypeChart = Object.entries(goodsTypeCounts).map(([label, value]) => ({ label, value }));

    return {
      totalJobs,
      deviationRate: totalJobs > 0 ? (deviationCount / totalJobs) * 100 : 0,
      carServiceRate: totalJobs > 0 ? (carIncludedCount / totalJobs) * 100 : 0,
      avgTransitDays: transitDaysCount > 0 ? (totalTransitDays / transitDaysCount) : 0,
      branchChart,
      statusChart,
      goodsTypeChart
    };
  }, [filteredActiveJobs]);

  // --- 2. AGENTS DATA PROCESSING ---

  // Compile full profile mapping (id -> name) and list of agents who performed any activities
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => {
      if (p.username) map[p.username.toLowerCase()] = p.name || p.username;
      if (p.name) map[p.name.toLowerCase()] = p.name;
    });
    map['agent'] = 'Rijish';
    return map;
  }, [profiles]);

  // Compute stats per agent
  const agentActivityData = useMemo(() => {
    const activityMap: Record<string, { edits: number; comms: number; notes: number; total: number; callType: Record<string, number>; regarding: Record<string, number> }> = {
      'Shruti': { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} },
      'Rabecca': { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} },
      'Chandrama': { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} },
    };

    const getCleanName = (name: string) => {
      if (!name) return 'Unknown';
      const nameL = name.toLowerCase().trim();
      return userMap[nameL] || name;
    };

    // Process edits (audit logs) - skip database trigger logs
    auditLogs.forEach(log => {
      if (log.field_changed === 'goods_track_status') {
        const match = log.changed_at?.match(/\.(\d+)/);
        if (match && match[1].length > 3) return; // Skip trigger logs
      }
      
      const agent = getCleanName(log.agent_name);
      if (!activityMap[agent]) {
        activityMap[agent] = { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} };
      }
      activityMap[agent].edits++;
      activityMap[agent].total++;
    });

    // Process communications
    comms.forEach(c => {
      const agent = getCleanName(c.agent_name);
      if (!activityMap[agent]) {
        activityMap[agent] = { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} };
      }
      activityMap[agent].comms++;
      activityMap[agent].total++;
      
      // Call type breakdown
      if (c.call_type) {
        activityMap[agent].callType[c.call_type] = (activityMap[agent].callType[c.call_type] || 0) + 1;
      }
      
      // Regarding breakdown
      if (c.regarding) {
        activityMap[agent].regarding[c.regarding] = (activityMap[agent].regarding[c.regarding] || 0) + 1;
      }
    });

    // Process notes
    notes.forEach(n => {
      const agent = getCleanName(n.agent_name);
      if (!activityMap[agent]) {
        activityMap[agent] = { edits: 0, comms: 0, notes: 0, total: 0, callType: {}, regarding: {} };
      }
      activityMap[agent].notes++;
      activityMap[agent].total++;
    });

    // Convert map to list and sort by total activity, keeping only the 3 allowed agents
    const allowedAgents = ['shruti', 'rabecca', 'chandrama'];
    return Object.entries(activityMap)
      .map(([agent, stats]) => ({
        label: agent,
        ...stats
      }))
      .filter(item => allowedAgents.includes(item.label.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [auditLogs, comms, notes, userMap]);

  // Set default selected agent once agentActivityData is ready
  useEffect(() => {
    if (agentActivityData.length > 0 && !selectedAgent) {
      setSelectedAgent(agentActivityData[0].label);
    }
  }, [agentActivityData, selectedAgent]);

  // Selected agent's full stats object
  const selectedAgentStats = useMemo(() => {
    return agentActivityData.find(a => a.label === selectedAgent) || null;
  }, [agentActivityData, selectedAgent]);

  // Selected agent's detailed activity logs (combined timeline)
  const selectedAgentTimelineAndLogs = useMemo(() => {
    if (!selectedAgent) return { timeline: [], details: [] };

    const getCleanName = (name: string) => {
      if (!name) return 'Unknown';
      const nameL = name.toLowerCase().trim();
      return userMap[nameL] || name;
    };

    // Filter audit logs for selected agent
    const editsFiltered = auditLogs
      .filter(l => {
        if (l.field_changed === 'goods_track_status') {
          const match = l.changed_at?.match(/\.(\d+)/);
          if (match && match[1].length > 3) return false;
        }
        return getCleanName(l.agent_name) === selectedAgent;
      })
      .map(l => ({
        id: l.id || Math.random().toString(),
        type: 'Edit',
        time: l.changed_at,
        job: l.job_number,
        detail: `Changed ${l.field_changed} from "${l.old_value || 'empty'}" to "${l.new_value || 'empty'}"`
      }));

    // Filter communications for selected agent
    const commsFiltered = comms
      .filter(c => getCleanName(c.agent_name) === selectedAgent)
      .map(c => ({
        id: c.id || Math.random().toString(),
        type: 'Comm Log',
        time: c.created_at,
        job: c.job_number,
        detail: `Logged ${c.call_type} call regarding ${c.regarding}: "${c.summary}"`
      }));

    // Filter notes for selected agent
    const notesFiltered = notes
      .filter(n => getCleanName(n.agent_name) === selectedAgent)
      .map(n => ({
        id: n.id || Math.random().toString(),
        type: 'Note',
        time: n.created_at,
        job: n.job_number,
        detail: `Added note: "${n.message}"`
      }));

    // Combine all and sort by time desc
    const combined = [...editsFiltered, ...commsFiltered, ...notesFiltered].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    // Compute 14-day timeline (counts of actions per day)
    const timelineMap: Record<string, number> = {};
    const today = new Date();
    
    // Initialize past 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      timelineMap[dateStr] = 0;
    }

    // Populate timeline map
    combined.forEach(act => {
      if (act.time) {
        const actDateStr = new Date(act.time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (timelineMap[actDateStr] !== undefined) {
          timelineMap[actDateStr]++;
        }
      }
    });

    const timeline = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

    // Filter details table if search is provided
    let details = combined;
    if (agentActivitySearch) {
      const lower = agentActivitySearch.toLowerCase();
      details = details.filter(d => 
        d.job?.toLowerCase().includes(lower) || 
        d.type.toLowerCase().includes(lower) || 
        d.detail.toLowerCase().includes(lower)
      );
    }

    return {
      timeline,
      details: details.slice(0, 100) // Show last 100 details for performance
    };

  }, [selectedAgent, auditLogs, comms, notes, userMap, agentActivitySearch]);

  // Overall Global stats cards data
  const globalStats = useMemo(() => {
    return {
      totalJobs: jobs.length,
      activeJobs: activeJobsRaw.length,
      closedJobs: jobs.length - activeJobsRaw.length,
      totalComms: comms.length,
      totalNotes: notes.length,
      totalEdits: auditLogs.length,
    };
  }, [jobs, activeJobsRaw, comms, notes, auditLogs]);

  // Sorting Handler for jobs table
  const handleJobsSort = (field: string) => {
    if (jobsSortField === field) {
      setJobsSortOrder(jobsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setJobsSortField(field);
      setJobsSortOrder('desc');
    }
  };

  const handleJobsSortIcon = (field: string) => {
    if (jobsSortField !== field) return '↕️';
    return jobsSortOrder === 'asc' ? '🔼' : '🔽';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontSize: '1.25rem', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <svg className="animate-spin" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
          Loading reports and analytics...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', height: '100%', overflowY: 'auto', fontFamily: "'Outfit', 'Inter', sans-serif", boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2.5rem' }}>📊</span>
            <h1 style={{ 
              fontSize: '2.4rem', 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #4f46e5 0%, #d946ef 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              margin: 0,
              filter: 'drop-shadow(0 2px 4px rgba(79, 70, 229, 0.1))'
            }}>
              Reports & Analytics
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem', fontWeight: 500 }}>
            360° Operations Dashboard · Real-time metrics and Agent activity oversight
          </p>
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={loadAllAnalyticsData}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: '99px',
            border: 'none',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)',
            color: '#4f46e5',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.25s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #d946ef 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.15)'; }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          Sync Fresh Data
        </button>
      </div>

      {/* Global Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Jobs Created', val: globalStats.totalJobs, color: '#4f46e5', icon: '📦' },
          { label: 'Active Jobs', val: globalStats.activeJobs, color: '#f59e0b', icon: '⚡' },
          { label: 'Completed Jobs', val: globalStats.closedJobs, color: '#10b981', icon: '✅' },
          { label: 'Agent Audit Trails', val: globalStats.totalEdits, color: '#8b5cf6', icon: '📝' },
          { label: 'Comm Logs Stored', val: globalStats.totalComms, color: '#ec4899', icon: '💬' },
        ].map(card => (
          <div key={card.label} className="glass" style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{ fontSize: '2rem', padding: '0.5rem', background: `${card.color}10`, borderRadius: '12px' }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {card.val}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '0.6rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeTab === 'jobs' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          📦 Active Jobs Report
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          style={{
            padding: '0.6rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'agents' ? '3px solid #4f46e5' : '3px solid transparent',
            color: activeTab === 'agents' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          👥 Agent Activity Oversight
        </button>
      </div>

      {/* TAB 1: ACTIVE JOBS REPORTS */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 360-Degree Filter Panel */}
          <div className="glass" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎛️</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>360-Degree Filters</span>
              </div>
              <button 
                onClick={() => {
                  setJobSearch('');
                  setFilterBranch('');
                  setFilterStatus('');
                  setFilterGoodsType('');
                  setFilterOperationBy('');
                  setStartDate('');
                  setEndDate('');
                }}
                style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.3rem 0.8rem', borderRadius: '99px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
              >
                Clear All Filters
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Search input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Search text</label>
                <input 
                  type="text"
                  placeholder="ID, Job No, Customer, Company..."
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', background: 'white', color: '#0f172a', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Branch Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Branch</label>
                <CustomSelect
                  placeholder="All Branches"
                  value={filterBranch}
                  onChange={(val) => setFilterBranch(val)}
                  options={[
                    { value: '', label: 'All Branches' },
                    ...filterOptions.branches.map(b => ({ value: b, label: b }))
                  ]}
                  style={{ minWidth: '130px' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Goods Track Status</label>
                <CustomSelect
                  placeholder="All Statuses"
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...filterOptions.statuses.map(s => ({ value: s, label: s }))
                  ]}
                  style={{ minWidth: '150px' }}
                />
              </div>

              {/* Goods Type Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Goods Type</label>
                <CustomSelect
                  placeholder="All Types"
                  value={filterGoodsType}
                  onChange={(val) => setFilterGoodsType(val)}
                  options={[
                    { value: '', label: 'All Types' },
                    ...filterOptions.goodsTypes.map(t => ({ value: t, label: t }))
                  ]}
                  style={{ minWidth: '130px' }}
                />
              </div>

              {/* Operation By Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Operation By</label>
                <CustomSelect
                  placeholder="All Partners"
                  value={filterOperationBy}
                  onChange={(val) => setFilterOperationBy(val)}
                  options={[
                    { value: '', label: 'All Partners' },
                    { value: 'TI', label: 'TI' },
                    { value: 'Outsourced', label: 'Outsourced' }
                  ]}
                  style={{ minWidth: '130px' }}
                />
              </div>



              {/* Date Start */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Job Date Start</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', background: 'white', color: '#0f172a', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Date End */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Job Date End</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', background: 'white', color: '#0f172a', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Active Job Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Active Jobs matching Filters', val: jobsMetrics.totalJobs, suffix: '', color: '#4f46e5', labelColor: '#4f46e5' },
              { label: 'Deviation Rate (%)', val: jobsMetrics.deviationRate.toFixed(1), suffix: '%', color: '#ef4444', labelColor: '#b91c1c' },
              { label: 'Average Lead Transit', val: jobsMetrics.avgTransitDays.toFixed(1), suffix: ' Days', color: '#10b981', labelColor: '#047857' },
              { label: 'Car Services Included', val: jobsMetrics.carServiceRate.toFixed(1), suffix: '%', color: '#06b6d4', labelColor: '#0891b2' },
            ].map(m => (
              <div key={m.label} className="glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: m.color, marginTop: '0.3rem' }}>
                  {m.val}{m.suffix}
                </span>
              </div>
            ))}
          </div>

          {/* Job Charts Row */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <DonutChart data={jobsMetrics.branchChart} title="Jobs by Branch" />
            <DonutChart data={jobsMetrics.goodsTypeChart} title="Jobs by Goods Type" />
            <DonutChart data={jobsMetrics.statusChart} title="Top 5 Goods Status Distribution" />
          </div>

          {/* Detailed filtered jobs table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'stretch' }}>
            
            {/* Jobs Details table */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>📄 Filtered Jobs Details</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Showing {filteredActiveJobs.length} active jobs</span>
              </div>

              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(148, 163, 184, 0.2)' }}>
                      {[
                        { label: 'Job ID', key: 'erp_job_id' },
                        { label: 'Job Number', key: 'job_number' },
                        { label: 'Date', key: 'job_date' },
                        { label: 'Customer Name', key: 'customer_name' },
                        { label: 'Branch', key: 'branch' },
                        { label: 'Goods Status', key: 'goods_track_status' }
                      ].map(col => (
                        <th 
                          key={col.key} 
                          onClick={() => handleJobsSort(col.key)}
                          style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                        >
                          {col.label} {handleJobsSortIcon(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No jobs match filter criteria.</td>
                      </tr>
                    ) : (
                      filteredActiveJobs.map(job => (
                        <tr 
                          key={job.job_number}
                          onClick={() => router.push(`/dashboard/job/${encodeURIComponent(job.job_number)}`)}
                          style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.8rem 0.9rem', color: '#3b82f6', fontWeight: 700 }}>
                            {job.erp_job_id ? `#${job.erp_job_id}` : '—'}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', fontWeight: 800, color: '#4f46e5' }}>
                            {job.job_number}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', color: '#64748b' }}>
                            {formatDate(job.job_date)}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', fontWeight: 700, color: '#1e293b' }}>
                            {job.customer_name || '—'}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', color: '#475569', fontWeight: 600 }}>
                            {job.branch || '—'}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', color: '#0f172a', fontWeight: 600, fontSize: '0.8rem' }}>
                            {job.goods_track_status ? job.goods_track_status.split('. ')[1] || job.goods_track_status : 'Pending'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: AGENT ACTIVITY OVERVIEW */}
      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Agent activity grouped bar chart */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <GroupedBarChart 
              data={agentActivityData}
              keys={['edits', 'comms', 'notes']}
              labels={['Field Edits', 'Comm Logs', 'Notes Added']}
              title="Agent Activity All-Around Breakdown"
            />
          </div>

          {/* Master-Detail Agent Selection View */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            {/* Master list of Agents */}
            <div className="glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', maxHeight: '550px', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>👤 Select Agent</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {agentActivityData.map(agent => {
                  const isSelected = selectedAgent === agent.label;
                  return (
                    <div 
                      key={agent.label} 
                      onClick={() => setSelectedAgent(agent.label)}
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', 
                        background: isSelected ? 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' : 'white', 
                        borderRadius: '12px', border: isSelected ? '1px solid #c7d2fe' : '1px solid rgba(148,163,184,0.1)',
                        cursor: 'pointer', transition: 'all 0.25s'
                      }}
                      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.transform = 'translateX(2px)'; }}
                      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.transform = 'none'; }}
                    >
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        color: isSelected ? '#4338ca' : '#334155'
                      }}>{agent.label}</span>
                      <span style={{ 
                        fontSize: '0.78rem', 
                        fontWeight: 800, 
                        background: isSelected ? '#4f46e5' : '#64748b15', 
                        color: isSelected ? 'white' : '#64748b', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '20px' 
                      }}>
                        {agent.total} act.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Agent details view */}
            {selectedAgentStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Agent Header and Mini Cards */}
                <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      background: getUserColor(selectedAgent).bg,
                      color: getUserColor(selectedAgent).text,
                      width: '45px', height: '45px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.25rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                    }}>
                      {selectedAgent[0].toUpperCase()}
                    </span>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>{selectedAgent} Activity Insight</h3>
                      <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>Overview of recent edits, logs, and communication histories</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                    {[
                      { label: 'Total Actions', val: selectedAgentStats.total, color: '#4f46e5' },
                      { label: 'Field Changes', val: selectedAgentStats.edits, color: '#8b5cf6' },
                      { label: 'Comm Entries', val: selectedAgentStats.comms, color: '#ec4899' },
                      { label: 'Notes Written', val: selectedAgentStats.notes, color: '#10b981' }
                    ].map(st => (
                      <div key={st.label} className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: st.color, marginTop: '0.15rem' }}>{st.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline and communication breakdown */}
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <TimelineChart 
                    data={selectedAgentTimelineAndLogs.timeline} 
                    title="14-Day Activity Velocity Timeline"
                  />
                  
                  {/* Comm Log Regarding distribution */}
                  <DonutChart 
                    data={Object.entries(selectedAgentStats.regarding).map(([label, value]) => ({ label, value }))} 
                    title="Communication Regarding Topics" 
                  />
                </div>

                {/* Agent Activity Detail logs Table */}
                <div className="glass" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>📋 Activity Detail Logs</h4>
                    
                    <input 
                      type="text"
                      placeholder="Search this agent's logs..."
                      value={agentActivitySearch}
                      onChange={e => setAgentActivitySearch(e.target.value)}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.3)', background: 'white', color: '#0f172a', fontSize: '0.8rem', outline: 'none', width: '220px' }}
                    />
                  </div>

                  <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(148, 163, 184, 0.2)', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                          <th style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Time</th>
                          <th style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Job Number</th>
                          <th style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Type</th>
                          <th style={{ padding: '0.6rem 0.9rem', color: '#64748b', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAgentTimelineAndLogs.details.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No activity records found.</td>
                          </tr>
                        ) : (
                          selectedAgentTimelineAndLogs.details.map(act => (
                            <tr 
                              key={act.id}
                              onClick={() => act.job && router.push(`/dashboard/job/${encodeURIComponent(act.job)}`)}
                              style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.03)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '0.7rem 0.9rem', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                {new Date(act.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '0.7rem 0.9rem', fontWeight: 700, color: '#4f46e5', whiteSpace: 'nowrap' }}>
                                {act.job || '—'}
                              </td>
                              <td style={{ padding: '0.7rem 0.9rem', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '12px',
                                  background: act.type === 'Edit' ? 'rgba(139, 92, 246, 0.08)' : act.type === 'Comm Log' ? 'rgba(236, 72, 153, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                  color: act.type === 'Edit' ? '#7c3aed' : act.type === 'Comm Log' ? '#ec4899' : '#059669'
                                }}>
                                  {act.type}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 0.9rem', color: '#334155', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={act.detail}>
                                {act.detail}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Select an agent to see their details</div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
