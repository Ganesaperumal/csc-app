'use client';

import { useEffect, useRef, useState } from 'react';

// Common city coordinate database
const CITY_COORDS: Record<string, [number, number]> = {
  // India Cities
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'chennai': [13.0827, 80.2707],
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777],
  'bombay': [19.0760, 72.8777],
  'kolkata': [22.5726, 88.3639],
  'calcutta': [22.5726, 88.3639],
  'hyderabad': [17.3850, 78.4867],
  'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714],
  'jaipur': [26.9124, 75.7873],
  'lucknow': [26.8467, 80.9462],
  'coimbatore': [11.0168, 76.9558],
  'kochi': [9.9312, 76.2673],
  'cochin': [9.9312, 76.2673],
  'goa': [15.2993, 74.1240],
  'nagpur': [21.1458, 79.0882],
  'indore': [22.7196, 75.8577],
  'patna': [25.5941, 85.1376],
  'bhopal': [23.2599, 77.4126],
  'gurgaon': [28.4595, 77.0266],
  'gurugram': [28.4595, 77.0266],
  'noida': [28.5355, 77.3910],
  'ghaziabad': [28.6692, 77.4538],
  'faridabad': [28.4089, 77.3178],
  'chandigarh': [30.7333, 76.7794],
  'surat': [21.1702, 72.8311],
  'vadodara': [22.3072, 73.1812],
  'visakhapatnam': [17.6868, 83.2185],
  'vizag': [17.6868, 83.2185],
  'trivandrum': [8.5241, 76.9366],
  'thiruvananthapuram': [8.5241, 76.9366],
  'madurai': [9.9252, 78.1198],
  'trichy': [10.7905, 78.7047],
  'guwahati': [26.1158, 91.7086],
  'bhubaneswar': [20.2961, 85.8245],
  'dehradun': [30.3165, 78.0322],
  'jammu': [32.7266, 74.8570],
  'srinagar': [34.0837, 74.7973],
  'ranchi': [23.3441, 85.3096],
  'raipur': [21.2514, 81.6296],

  // International Cities
  'singapore': [1.3521, 103.8198],
  'dubai': [25.2048, 55.2708],
  'abu dhabi': [24.4539, 54.3773],
  'london': [51.5074, -0.1278],
  'new york': [40.7128, -74.0060],
  'paris': [48.8566, 2.3522],
  'tokyo': [35.6762, 139.6503],
  'sydney': [-33.8688, 151.2093],
  'melbourne': [-37.8136, 144.9631],
  'munich': [48.1351, 11.5820],
  'frankfurt': [50.1109, 8.6821],
  'berlin': [52.5200, 13.4050],
  'amsterdam': [52.3676, 4.9041],
  'brussels': [50.8503, 4.3517],
  'geneva': [46.2044, 6.1432],
  'zurich': [47.3769, 8.5417],
  'vienna': [48.2082, 16.3738],
  'shanghai': [31.2304, 121.4737],
  'hong kong': [22.3193, 114.1694],
  'toronto': [43.6532, -79.3832],
  'vancouver': [49.2827, -123.1207],
  'los angeles': [34.0522, -118.2437],
  'san francisco': [37.7749, -122.4194],
  'chicago': [41.8781, -87.6298],
  'houston': [29.7604, -95.3698],
  'seattle': [47.6062, -122.3321],
  'boston': [42.3601, -71.0589],
  'washington': [38.9072, -77.0369],
  'miami': [25.7617, -80.1918],
  'johannesburg': [-26.2041, 28.0473],
  'cape town': [-33.9249, 18.4241],
  'nairobi': [-1.2921, 36.8219],
  'cairo': [30.0444, 31.2357],
  'riyadh': [24.7136, 46.6753],
  'jeddah': [21.5433, 39.1728],
  'kuwait': [29.3759, 47.9774],
  'manama': [26.2285, 50.5860],
  'doha': [25.2854, 51.5310],
  'muscat': [23.5859, 58.4059]
};

// Robust coordinate lookup
const getCoordinates = (name: string): [number, number] | null => {
  if (!name) return null;
  const clean = name.toLowerCase().trim().replace(/[\d\s,.-]+$/, '');
  
  if (CITY_COORDS[clean]) return CITY_COORDS[clean];

  // Try partial matching
  for (const key of Object.keys(CITY_COORDS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return CITY_COORDS[key];
    }
  }

  // Common airport codes or branch lookups
  if (clean.includes('blr') || clean.includes('kempegowda')) return CITY_COORDS['bangalore'];
  if (clean.includes('bom')) return CITY_COORDS['mumbai'];
  if (clean.includes('maa')) return CITY_COORDS['chennai'];
  if (clean.includes('del') || clean.includes('igi')) return CITY_COORDS['delhi'];
  if (clean.includes('hyd')) return CITY_COORDS['hyderabad'];
  if (clean.includes('pnq')) return CITY_COORDS['pune'];
  
  return null;
};

interface Checkpoint {
  location: string;
  date: string;
  remark: string;
}

interface JobMapProps {
  origin: string;
  destination: string;
  checkpoints?: Checkpoint[];
  title?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function JobMap({ origin, destination, checkpoints = [], title = "Live Route & Checkpoints" }: JobMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Dynamic Leaflet injection
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      const checkL = setInterval(() => {
        if (window.L) {
          setLeafletLoaded(true);
          clearInterval(checkL);
        }
      }, 100);
      return () => clearInterval(checkL);
    }
  }, []);

  // 2. Initialize and Render Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    // Destructure Leaflet from window
    const L = window.L;

    // Set fallback default coords if we cannot resolve them
    const originCoords = getCoordinates(origin) || [12.9716, 77.5946]; // Bangalore
    const destCoords = getCoordinates(destination) || [13.0827, 80.2707]; // Chennai

    // Initialize list of stops
    const stops: { name: string; coords: [number, number]; type: 'origin' | 'destination' | 'checkpoint'; desc?: string }[] = [
      { name: origin || 'Origin', coords: originCoords, type: 'origin' }
    ];

    // Build checkpoints coords
    checkpoints.forEach((cp) => {
      const coords = getCoordinates(cp.location);
      if (coords) {
        stops.push({
          name: cp.location,
          coords,
          type: 'checkpoint',
          desc: `${cp.date ? cp.date + ': ' : ''}${cp.remark || ''}`
        });
      }
    });

    stops.push({ name: destination || 'Destination', coords: destCoords, type: 'destination' });

    // Clean up previous map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // Find center
      const centerLat = (originCoords[0] + destCoords[0]) / 2;
      const centerLng = (originCoords[1] + destCoords[1]) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 5,
        zoomControl: true,
        attributionControl: false
      });

      mapInstanceRef.current = map;

      // Add modern OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Create custom markers
      const drawMarker = (stop: typeof stops[0]) => {
        let color = '#3b82f6'; // Blue for checkpoints
        let iconEmoji = '📍';
        if (stop.type === 'origin') {
          color = '#10b981'; // Green
          iconEmoji = '🟢';
        } else if (stop.type === 'destination') {
          color = '#ec4899'; // Pink
          iconEmoji = '🏁';
        }

        const customIcon = L.divIcon({
          html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); text-align: center;">${iconEmoji}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
          className: 'custom-map-marker'
        });

        const popupContent = `
          <div style="font-family: inherit; font-size: 0.85rem; padding: 4px;">
            <strong style="color: ${color}; text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">
              ${stop.type}
            </strong>
            <span style="font-weight: 600; color: var(--text-primary);">${stop.name}</span>
            ${stop.desc ? `<p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-secondary); border-top: 1px solid var(--border-color); padding-top: 4px;">${stop.desc}</p>` : ''}
          </div>
        `;

        L.marker(stop.coords, { icon: customIcon })
          .addTo(map)
          .bindPopup(popupContent);
      };

      // Draw all markers
      stops.forEach(drawMarker);

      // Draw polyline connecting stops
      const polylineCoords = stops.map(s => s.coords);
      L.polyline(polylineCoords, {
        color: '#6366f1',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 8'
      }).addTo(map);

      // Zoom map to fit all coordinates
      const bounds = L.latLngBounds(polylineCoords);
      map.fitBounds(bounds, { padding: [40, 40] });

    } catch (err: any) {
      console.error('Error rendering Leaflet map:', err);
      setError('Could not initialize map layout.');
    }
  }, [leafletLoaded, origin, destination, checkpoints]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', boxShadow: 'var(--glass-shadow)', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.1)', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>🗺️</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Live Route & Checkpoints</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', fontWeight: 600 }}>
          <span style={{ color: '#10b981' }}>🟢 Origin</span>
          <span style={{ color: '#3b82f6' }}>📍 Transit</span>
          <span style={{ color: '#ec4899' }}>🏁 Destination</span>
        </div>
      </div>
      
      {!leafletLoaded && (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ border: '3px solid rgba(0,0,0,0.1)', borderLeftColor: '#6366f1', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8rem' }}>Loading map layers...</span>
          </div>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {leafletLoaded && error && (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-color)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)' }}>
          ⚠️ {error}
        </div>
      )}

      {leafletLoaded && !error && (
        <div 
          ref={mapContainerRef} 
          style={{ height: '320px', width: '100%', zIndex: 10 }} 
        />
      )}
    </div>
  );
}
