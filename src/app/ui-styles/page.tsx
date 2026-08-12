'use client';

import React, { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

type PillarCategory = 'all' | 'foundations' | 'dimensional' | 'composition' | 'artistic';

interface UIStyleItem {
  id: string;
  pillar: 'foundations' | 'dimensional' | 'composition' | 'artistic';
  pillarName: string;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  cssSnippet: string;
  renderPreview: () => React.ReactNode;
}

export default function UIStylesShowcase() {
  const [activePillar, setActivePillar] = useState<PillarCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = async (id: string, code: string) => {
    await copyToClipboard(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const styles: UIStyleItem[] = [
    // ═══════════════════════════════════════════════════════════════
    // PILLAR 1: THE CORE MODERN FOUNDATIONS
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'flat-design',
      pillar: 'foundations',
      pillarName: 'Core Foundations',
      name: 'Flat Design',
      subtitle: 'Clean & Ultra-Fast Simplicity',
      description: 'Strips away all drop shadows, gradients, and 3D textures to emphasize raw content clarity, rapid load times, and minimalist vector shapes.',
      tags: ['No Gradients', 'Flat Fills', 'High Speed', 'Clean UI'],
      cssSnippet: `.flat-card {
  background: #2563eb;
  border-radius: 8px;
  color: #ffffff;
  padding: 20px;
  border: none;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          color: '#0f172a'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            background: '#2563eb',
            borderRadius: '12px',
            color: '#ffffff'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: '#93c5fd' }}>
              FLAT FOUNDATION
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Flat Interface Panel</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', color: '#dbeafe' }}>
              Pure solid color blocks without shadows or bevels for immediate readability.
            </p>
            <button style={{
              width: '100%',
              padding: '12px',
              background: '#1d4ed8',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer'
            }}>
              FLAT ACTION BUTTON
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'material-design',
      pillar: 'foundations',
      pillarName: 'Core Foundations',
      name: 'Material Design (Material 3)',
      subtitle: 'Grid Geometry & Tactile Surfaces',
      description: 'Google design system utilizing calculated elevation surfaces, dynamic color extraction, ripple feedback, and realistic lighting.',
      tags: ['Elevation Tints', 'Ripple Ink', 'Surface Geometry'],
      cssSnippet: `.material-card {
  background: #feefc3;
  border-radius: 16px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.12);
  transition: box-shadow 0.2s ease;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6750a4', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                M3
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1d1b20' }}>Material 3 Card</div>
                <div style={{ fontSize: '11px', color: '#49454f' }}>Surface Elevation 2</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#49454f', lineHeight: 1.5, marginBottom: '20px' }}>
              Structured elevation layers with soft directional drop shadows and dynamic surface tinting.
            </p>
            <button style={{
              width: '100%',
              padding: '12px',
              borderRadius: '50px',
              background: '#6750a4',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(103,80,164,0.3)'
            }}>
              CONTAINED M3 BUTTON
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'minimalism',
      pillar: 'foundations',
      pillarName: 'Core Foundations',
      name: 'Minimalism (Swiss Style)',
      subtitle: 'Abundant Whitespace & Stark Typography',
      description: 'Eliminates all non-essential visual elements to prioritize generous negative space, precise grid alignment, and high-contrast typography.',
      tags: ['Negative Space', 'Swiss Grid', 'Stark Type'],
      cssSnippet: `.minimal-card {
  background: #ffffff;
  border-left: 4px solid #000000;
  padding: 32px;
  color: #000000;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#000000'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '28px',
            background: '#ffffff',
            borderLeft: '4px solid #000000'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
              01 // SWISS STYLE
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '12px', lineHeight: 1.2 }}>
              FUNCTION FIRST.
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
              Visual noise completely removed. Essential functional typography and whitespace only.
            </p>
            <div style={{ fontSize: '12px', fontWeight: 900, textDecoration: 'underline', cursor: 'pointer' }}>
              EXPLORE ARCHITECTURE →
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'responsive-design',
      pillar: 'foundations',
      pillarName: 'Core Foundations',
      name: 'Responsive Fluid Layouts',
      subtitle: 'Dynamic Adaptability Across Viewports',
      description: 'Layout system designed to fluidly rearrange structural components based on screen width breakpoints.',
      tags: ['Fluid Grids', 'Auto Flex', 'Viewport Aware'],
      cssSnippet: `.responsive-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '360px',
            padding: '20px',
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155'
          }}>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, marginBottom: '12px' }}>
              📱 FLUID BREAKPOINT CONTAINER
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: '1 1 120px', padding: '12px', background: '#334155', borderRadius: '8px', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>
                Col A (Flex)
              </div>
              <div style={{ flex: '1 1 120px', padding: '12px', background: '#334155', borderRadius: '8px', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>
                Col B (Flex)
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Auto-wraps on mobile screens
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'grid-based-layouts',
      pillar: 'foundations',
      pillarName: 'Core Foundations',
      name: 'Grid-Based Structural Alignment',
      subtitle: 'Rigid Multi-Column Module Hierarchy',
      description: 'Mathematical multi-column grid systems maintaining visual order, structured image ratios, and alignment discipline.',
      tags: ['12-Col Grid', 'Mathematical', 'Structural Order'],
      cssSnippet: `.strict-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1b4b'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '360px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} style={{
                padding: '16px 8px',
                background: 'rgba(99, 102, 241, 0.25)',
                border: '1px solid #6366f1',
                borderRadius: '8px',
                color: '#c7d2fe',
                fontSize: '11px',
                fontWeight: 800,
                textAlign: 'center'
              }}>
                G-{n}
              </div>
            ))}
          </div>
        </div>
      )
    },

    // ═══════════════════════════════════════════════════════════════
    // PILLAR 2: INTERACTIVE & DIMENSIONAL STYLES
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'liquidglass',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Liquid Glass (Fluid Glassmorphism)',
      subtitle: 'Organic Fluid Morphing & Prism Refraction',
      description: 'Next-gen evolution of glassmorphism featuring organic morphing liquid blob containers, water ripple distortion, and prismatic rainbow edge refractions.',
      tags: ['Liquid Morphing', 'Prismatic Spectrum', 'Water Sheen'],
      cssSnippet: `.liquid-glass-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4),
              inset 0 2px 6px rgba(255, 255, 255, 0.8),
              inset 0 -6px 16px rgba(0, 0, 0, 0.3);
}`,
      renderPreview: () => (
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #030712 100%)'
        }}>
          <div style={{
            position: 'absolute',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'conic-gradient(from 180deg at 50% 50%, #06b6d4 0deg, #3b82f6 120deg, #ec4899 240deg, #06b6d4 360deg)',
            filter: 'blur(45px)',
            opacity: 0.55
          }}></div>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(200%)',
            WebkitBackdropFilter: 'blur(20px) saturate(200%)',
            border: '1.5px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 3px 8px rgba(255, 255, 255, 0.8), inset 0 -6px 16px rgba(0, 0, 0, 0.3)',
            color: '#ffffff'
          }}>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '50px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff' }}>💧 LIQUID GLASS</span>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginTop: '8px', marginBottom: '8px', color: '#ffffff' }}>Fluid Prismatic Sheen</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>Water-drop specularity with rainbow light refractions.</p>
            <button style={{ width: '100%', padding: '10px', borderRadius: '14px', background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>LIQUID BUTTON</button>
          </div>
        </div>
      )
    },
    {
      id: 'glassmorphism',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Glassmorphism',
      subtitle: 'Frosted Layering & Translucency',
      description: 'Classic translucent glass panels resting on vibrant background blurs with subtle light borders and multi-layered depth.',
      tags: ['Frosted Glass', 'Backdrop Blur', 'Layered Depth'],
      cssSnippet: `.glass-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 24px;
}`,
      renderPreview: () => (
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            color: '#ffffff'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>Glassmorphism Panel</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>Frosted glass backdrop-blur interface over vibrant gradients.</p>
            <button style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 700, fontSize: '12px' }}>GLASS ACTION</button>
          </div>
        </div>
      )
    },
    {
      id: 'neumorphism',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Neumorphism (Soft UI)',
      subtitle: 'Extruded Plastic Surface Shadows',
      description: 'Calculated soft dual light and dark shadows making buttons appear molded directly out of the background material.',
      tags: ['Extruded UI', 'Soft Shadows', 'Molded Material'],
      cssSnippet: `.neumorphic-card {
  background: #e0e5ec;
  box-shadow: 9px 9px 18px rgba(163, 177, 198, 0.7),
             -9px -9px 18px rgba(255, 255, 255, 0.8);
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e0e5ec'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            borderRadius: '24px',
            background: '#e0e5ec',
            boxShadow: '9px 9px 18px rgba(163, 177, 198, 0.7), -9px -9px 18px rgba(255, 255, 255, 0.8)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Soft Extruded Surface</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Dual directional shadows simulate physical plastic material.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button style={{ padding: '10px', borderRadius: '12px', background: '#e0e5ec', border: 'none', boxShadow: '5px 5px 10px rgba(163,177,198,0.7), -5px -5px 10px rgba(255,255,255,0.8)', fontWeight: 800, fontSize: '11px', color: '#334155' }}>RAISED</button>
              <button style={{ padding: '10px', borderRadius: '12px', background: '#e0e5ec', border: 'none', boxShadow: 'inset 4px 4px 8px rgba(163,177,198,0.7), inset -4px -4px 8px rgba(255,255,255,0.8)', fontWeight: 800, fontSize: '11px', color: '#6366f1' }}>INSET</button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'skeuomorphism',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Skeuomorphism 2.0',
      subtitle: 'Real-World Material Imitation',
      description: 'Imitates physical real-world object textures, metallic dials, leather stitching, and realistic bevel lighting.',
      tags: ['Real Textures', 'Metallic Bevels', 'Physical Dials'],
      cssSnippet: `.skeuo-card {
  background: linear-gradient(180deg, #334155 0%, #0f172a 100%);
  border-top: 1px solid #94a3b8;
  box-shadow: 0 15px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35);
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '28px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, #334155 0%, #0f172a 100%)',
            border: '1px solid #475569',
            borderTop: '1px solid #94a3b8',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
            color: '#ffffff'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Physical Metallic Dial</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Specular top edge highlight simulates real metallic bevels.</p>
            <button style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)', border: '1px solid #60a5fa', borderTop: '1px solid #93c5fd', color: '#ffffff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', boxShadow: '0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)' }}>METALLIC SWITCH</button>
          </div>
        </div>
      )
    },
    {
      id: 'parallax-scrolling',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Parallax Scrolling Depth',
      subtitle: 'Multi-Layer Speed Perspective',
      description: 'Background components move at a distinctly slower speed than foreground content, constructing deep 3D scroll illusions.',
      tags: ['Layered Velocity', '3D Illusion', 'Scroll Depth'],
      cssSnippet: `.parallax-bg {
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            padding: '20px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.4)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: '#bae6fd' }}>
              FOREGROUND CONTENT (FAST)
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Multi-Layer Velocity</h4>
            <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '11px', color: '#38bdf8' }}>
              Background moves at 0.3x speed ↓
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'card-based-design',
      pillar: 'dimensional',
      pillarName: 'Interactive & Dimensional',
      name: 'Card-Based Module Containers',
      subtitle: 'Modular Content Separation',
      description: 'Splits various information streams into clean, discrete card modules to maximize scannability and user focus.',
      tags: ['Modular Cards', 'Scannability', 'Discrete Blocks'],
      cssSnippet: `.info-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}`,
      renderPreview: () => (
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          minHeight: '260px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9'
        }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '340px' }}>
            <div style={{ flex: 1, padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Card Alpha</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Discrete Module</div>
            </div>
            <div style={{ flex: 1, padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Card Beta</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Isolated Stream</div>
            </div>
          </div>
        </div>
      )
    },

    // ═══════════════════════════════════════════════════════════════
    // PILLAR 3: LAYOUT & COMPOSITION FORMATS
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'bento-box-layout',
      pillar: 'composition',
      pillarName: 'Layout & Composition',
      name: 'Bento Box Modular Grid',
      subtitle: 'Compartmentalized Asymmetrical Layouts',
      description: 'Structures digital dashboards into perfectly packed, asymmetrical grids inspired by Japanese compartmentalized lunchboxes.',
      tags: ['Bento Grid', 'Asymmetrical Spans', 'Linear Style'],
      cssSnippet: `.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
          <div style={{ width: '100%', maxWidth: '360px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ gridColumn: 'span 2', padding: '14px', background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', color: '#fff', fontSize: '12px', fontWeight: 800 }}>Bento Hero Card (Span 2)</div>
            <div style={{ gridColumn: 'span 1', padding: '14px', background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', color: '#34d399', fontSize: '14px', fontWeight: 900 }}>98.4%</div>
            <div style={{ gridColumn: 'span 3', padding: '10px 14px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#94a3b8', fontSize: '11px' }}>Bottom Bento Full Span Footer</div>
          </div>
        </div>
      )
    },
    {
      id: 'asymmetrical-layouts',
      pillar: 'composition',
      pillarName: 'Layout & Composition',
      name: 'Asymmetrical Layouts',
      subtitle: 'Dynamic Unbalanced Eye Guidance',
      description: 'Intentionally breaks traditional symmetrical balances to construct visually exciting, dynamic paths for the user eye to follow.',
      tags: ['Off-Center', 'Dynamic Balance', 'Visual Tension'],
      cssSnippet: `.asymmetric-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#431407' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', width: '100%', maxWidth: '340px' }}>
            <div style={{ padding: '20px', background: '#7c2d12', borderRadius: '16px', color: '#fff', fontSize: '13px', fontWeight: 800 }}>Major Weight 66%</div>
            <div style={{ padding: '20px', background: '#9a3412', borderRadius: '16px', color: '#ffedd5', fontSize: '11px', fontWeight: 700 }}>Minor 33%</div>
          </div>
        </div>
      )
    },
    {
      id: 'single-page-ui',
      pillar: 'composition',
      pillarName: 'Layout & Composition',
      name: 'Single-Page UI (SPA Scroll)',
      subtitle: 'Continuous Seamless App Experience',
      description: 'Houses the entirety of an app or platform into a single continuous, scroll-driven container with zero page reloads.',
      tags: ['Single Page', 'Zero Reload', 'Scroll Driven'],
      cssSnippet: `.single-page-app {
  height: 100vh;
  scroll-snap-type: y mandatory;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#064e3b', color: '#ffffff' }}>
          <div style={{ width: '100%', maxWidth: '340px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#6ee7b7', marginBottom: '6px' }}>SECTION 01 / 04</div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Continuous SPA Container</h4>
            <div style={{ fontSize: '11px', color: '#a7f3d0' }}>Scroll snap sections seamless navigation</div>
          </div>
        </div>
      )
    },
    {
      id: 'fullscreen-hero-ui',
      pillar: 'composition',
      pillarName: 'Layout & Composition',
      name: 'Fullscreen Hero UI',
      subtitle: 'Immersive Screen-Filling Media',
      description: 'Locks critical landing content into dramatic, 100vh screen-filling media sections to capture total user focus.',
      tags: ['100vh Hero', 'Immersive Focus', 'Dramatic Impact'],
      cssSnippet: `.fullscreen-hero {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', color: '#ffffff', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', color: '#f59e0b', marginBottom: '8px' }}>100vh FULLSCREEN HERO</div>
          <h3 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '12px' }}>TOTAL IMMERSION</h3>
          <button style={{ padding: '10px 20px', borderRadius: '50px', background: '#f59e0b', border: 'none', color: '#000', fontWeight: 900, fontSize: '11px', cursor: 'pointer' }}>ENTER EXPERIENCE</button>
        </div>
      )
    },
    {
      id: 'experimental-radial-navigation',
      pillar: 'composition',
      pillarName: 'Layout & Composition',
      name: 'Experimental / Radial Menus',
      subtitle: 'Non-Standard Interactive Navigation',
      description: 'Replaces standard linear header bars with hidden drawers, interactive spatial maps, or circular radial menus.',
      tags: ['Radial Menus', 'Non-Standard', 'Experimental UI'],
      cssSnippet: `.radial-menu {
  border-radius: 50%;
  transform: rotate(0deg);
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#312e81' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#4338ca', border: '2px solid #818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#fff', fontWeight: 900, fontSize: '12px' }}>
            CENTER
            <div style={{ position: 'absolute', top: '-15px', width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>N</div>
            <div style={{ position: 'absolute', right: '-15px', width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>E</div>
          </div>
        </div>
      )
    },

    // ═══════════════════════════════════════════════════════════════
    // PILLAR 4: ARTISTIC & CULTURAL AESTHETICS
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'neobrutalism',
      pillar: 'artistic',
      pillarName: 'Artistic & Cultural',
      name: 'Neo-Brutalism',
      subtitle: 'Raw Outlines & Unsoftened Shadows',
      description: 'Unpolished raw aesthetic with thick 4px black borders, stark unsoftened block offset shadows, and high-contrast primary block colors.',
      tags: ['Thick Outlines', 'Hard Shadow', 'Raw Saturation'],
      cssSnippet: `.neo-card {
  background: #ffde59;
  border: 4px solid #000000;
  box-shadow: 8px 8px 0px #000000;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '28px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef08a', color: '#000' }}>
          <div style={{ width: '100%', maxWidth: '340px', padding: '20px', background: '#ffde59', border: '4px solid #000', boxShadow: '8px 8px 0px #000', borderRadius: '16px' }}>
            <div style={{ display: 'inline-block', padding: '3px 8px', background: '#000', color: '#fff', fontWeight: 900, fontSize: '10px', borderRadius: '4px', marginBottom: '8px' }}>NEO-BRUTALIST</div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>STARK & RAW</h3>
            <button style={{ width: '100%', padding: '10px', background: '#ff914d', border: '3px solid #000', boxShadow: '4px 4px 0px #000', fontWeight: 900, fontSize: '11px', cursor: 'pointer', borderRadius: '10px' }}>RAW ACTION</button>
          </div>
        </div>
      )
    },
    {
      id: 'typography-centric-design',
      pillar: 'artistic',
      pillarName: 'Artistic & Cultural',
      name: 'Typography-Centric Design',
      subtitle: 'Extreme Proportional Letterform Art',
      description: 'Scales text to massive proportional sizes, making letterforms themselves the primary visual artwork over imagery.',
      tags: ['Massive Display', 'Type as Artwork', 'Expressive Fonts'],
      cssSnippet: `.hero-typography {
  font-size: 5rem;
  font-weight: 900;
  line-height: 0.9;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000', color: '#ffffff' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '42px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.95, background: 'linear-gradient(180deg, #fff 0%, #64748b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TYPE<br />ART
            </h2>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px', letterSpacing: '3px', textTransform: 'uppercase' }}>Letterforms As Art</div>
          </div>
        </div>
      )
    },
    {
      id: 'illustrative-3d-interactive',
      pillar: 'artistic',
      pillarName: 'Artistic & Cultural',
      name: 'Illustrative & 3D Interactive',
      subtitle: 'Vector Artwork & Real-Time 3D Models',
      description: 'Weaves custom animated vectors, interactive 3D Canvas models, and augmented reality elements into interface frameworks.',
      tags: ['Interactive 3D', 'WebGL/ThreeJS', 'Animated Vectors'],
      cssSnippet: `.canvas-3d {
  width: 100%;
  height: 400px;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)', color: '#ffffff' }}>
          <div style={{ width: '100%', maxWidth: '340px', padding: '20px', background: 'rgba(255,255,255,0.08)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔮</div>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>Real-Time 3D Canvas</div>
            <div style={{ fontSize: '11px', color: '#c7d2fe', marginTop: '4px' }}>WebGL interactive vector mesh model</div>
          </div>
        </div>
      )
    },
    {
      id: 'retro-futurism-synthwave',
      pillar: 'artistic',
      pillarName: 'Artistic & Cultural',
      name: 'Retro-Futurism / Synthwave',
      subtitle: '80s Neon Grids & Cyberpunk Vibes',
      description: 'Fuses neon luminescent lighting, synthwave wireframe horizon grids, dark backgrounds, and 1980s retro aesthetics.',
      tags: ['80s Synthwave', 'Horizon Grid', 'Magenta Glow'],
      cssSnippet: `.synthwave-grid {
  background: linear-gradient(180deg, #09090b 0%, #581c87 100%);
  border-bottom: 2px solid #f43f5e;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #09090b 0%, #4c1d95 60%, #be185d 100%)', color: '#ffffff' }}>
          <div style={{ width: '100%', maxWidth: '340px', padding: '20px', background: 'rgba(9,9,11,0.7)', borderRadius: '16px', border: '1px solid #f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.4)', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f472b6', letterSpacing: '2px' }}>SYNTHWAVE_GRID</div>
            <h3 style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 900, color: '#67e8f9', marginTop: '6px' }}>RETRO FUTURISM</h3>
          </div>
        </div>
      )
    },
    {
      id: 'monochromatic-color-blocking',
      pillar: 'artistic',
      pillarName: 'Artistic & Cultural',
      name: 'Monochromatic / Color Blocking',
      subtitle: 'Single Hue Shades & High-Contrast Blocks',
      description: 'Restricts the interface theme strictly to shades of a single color or bold, contrasting solid color blocks.',
      tags: ['Single Hue', 'Color Blocking', 'High Contrast'],
      cssSnippet: `.monochrome-card {
  background: #0284c7;
  color: #e0f2fe;
}`,
      renderPreview: () => (
        <div style={{ borderRadius: '16px', padding: '24px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0284c7', color: '#ffffff' }}>
          <div style={{ width: '100%', maxWidth: '340px', padding: '20px', background: '#0369a1', borderRadius: '14px', border: '2px solid #38bdf8' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#bae6fd', textTransform: 'uppercase' }}>MONOCHROME BLUE</div>
            <h4 style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px' }}>Color Blocking</h4>
            <div style={{ padding: '8px', background: '#075985', borderRadius: '6px', fontSize: '11px', marginTop: '12px' }}>Single hue tone family</div>
          </div>
        </div>
      )
    }
  ];

  const filteredStyles = activePillar === 'all'
    ? styles
    : styles.filter(s => s.pillar === activePillar);

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: '#070b14',
      color: '#f8fafc',
      padding: '40px 24px 80px 24px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 40px auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '50px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#818cf8',
          fontSize: '12px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          🌐 COMPLETE UI DESIGN SYSTEMS CATALOG (20 STYLES)
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '12px', color: '#ffffff' }}>
          Master UI Design Systems & Aesthetics
        </h1>
        <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '850px', lineHeight: 1.6 }}>
          Comprehensive gallery covering 4 core design pillars: Modern Foundations, Interactive & Dimensional Styles, Layout & Composition Formats, and Artistic & Cultural Aesthetics.
        </p>

        {/* Pillar Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '28px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          <button
            onClick={() => setActivePillar('all')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activePillar === 'all' ? '#4f46e5' : '#1e293b',
              color: '#ffffff',
              boxShadow: activePillar === 'all' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            All Design Pillars ({styles.length})
          </button>
          <button
            onClick={() => setActivePillar('foundations')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activePillar === 'foundations' ? '#4f46e5' : '#1e293b',
              color: activePillar === 'foundations' ? '#ffffff' : '#cbd5e1',
              boxShadow: activePillar === 'foundations' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            🏛️ Core Foundations (5)
          </button>
          <button
            onClick={() => setActivePillar('dimensional')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activePillar === 'dimensional' ? '#4f46e5' : '#1e293b',
              color: activePillar === 'dimensional' ? '#ffffff' : '#cbd5e1',
              boxShadow: activePillar === 'dimensional' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            💎 Interactive & Dimensional (6)
          </button>
          <button
            onClick={() => setActivePillar('composition')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activePillar === 'composition' ? '#4f46e5' : '#1e293b',
              color: activePillar === 'composition' ? '#ffffff' : '#cbd5e1',
              boxShadow: activePillar === 'composition' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            🍱 Layout & Composition (5)
          </button>
          <button
            onClick={() => setActivePillar('artistic')}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activePillar === 'artistic' ? '#4f46e5' : '#1e293b',
              color: activePillar === 'artistic' ? '#ffffff' : '#cbd5e1',
              boxShadow: activePillar === 'artistic' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none'
            }}
          >
            🎨 Artistic & Cultural (5)
          </button>
        </div>
      </div>

      {/* Grid of Styles */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '32px'
      }}>
        {filteredStyles.map((style) => (
          <div 
            key={style.id} 
            style={{
              borderRadius: '24px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>{style.name}</h2>
                <span style={{ fontSize: '10px', color: '#818cf8', fontFamily: 'monospace', padding: '3px 8px', background: 'rgba(129,140,248,0.1)', borderRadius: '4px' }}>
                  {style.pillarName}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
                {style.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {style.tags.map((t, idx) => (
                  <span key={idx} style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    fontSize: '11px',
                    color: '#cbd5e1',
                    fontWeight: 600
                  }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Render Pure CSS Preview */}
              {style.renderPreview()}
            </div>

            {/* CSS Recipe Code Bar */}
            <div style={{
              background: '#030712',
              padding: '16px 24px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a5b4fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                {style.cssSnippet.split('\n')[1]}
              </code>
              <button
                onClick={() => copyCode(style.id, style.cssSnippet)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#a5b4fc',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {copiedId === style.id ? '✓ Copied CSS' : '📋 Copy CSS Recipe'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
