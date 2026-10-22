import React, { useEffect, useRef, useState } from 'react';
import { PoiDto, TourDto } from '../api/content';

interface MapViewProps {
  pois: PoiDto[];
  selectedPoiId: number | null;
  onSelectPoi: (poiId: number) => void;
  userLocation: { latitude: number; longitude: number } | null;
  isSimulatedLocation: boolean;
  onMapClickLocation?: (lat: number, lng: number) => void;
  activeTour: TourDto | null;
  filteredCategory: string;
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Ban kinh Trai Dat tinh theo met
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function loadLeafletLibrary(): Promise<any> {
  const win = window as any;
  if (win.L) return Promise.resolve(win.L);

  return new Promise((resolve) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    script.onerror = () => {
      console.warn('Khong the tai Leaflet tu CDN, ban do se hoat dong o che do du phong.');
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

export const MapView: React.FC<MapViewProps> = ({
  pois,
  selectedPoiId,
  onSelectPoi,
  userLocation,
  isSimulatedLocation,
  onMapClickLocation,
  activeTour,
  filteredCategory
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: number]: any }>({});
  const circlesRef = useRef<{ [key: number]: any }>({});
  const userMarkerRef = useRef<any>(null);
  const tourPolylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // 1. Khoi tao ban do Leaflet khi tai xong thu vien
  useEffect(() => {
    let active = true;

    loadLeafletLibrary().then((L) => {
      if (!active || !L || !mapContainerRef.current) return;
      setLeafletLoaded(true);

      if (!mapInstanceRef.current) {
        const defaultCenter = [10.7875, 106.7053];
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 17,
          zoomControl: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        map.on('click', (e: any) => {
          if (onMapClickLocation) {
            onMapClickLocation(e.latlng.lat, e.latlng.lng);
          }
        });

        mapInstanceRef.current = map;
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // 2. Ve cac POI markers va trigger circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !leafletLoaded) return;

    Object.values(markersRef.current).forEach((m: any) => m.remove());
    Object.values(circlesRef.current).forEach((c: any) => c.remove());
    markersRef.current = {};
    circlesRef.current = {};

    const visiblePois = pois.filter((poi) => {
      if (filteredCategory === 'ALL') return true;
      return (poi.category || '').toUpperCase() === filteredCategory;
    });

    visiblePois.forEach((poi) => {
      const isSelected = poi.poiId === selectedPoiId;
      const radius = poi.triggerRadius || 30;

      let iconEmoji = '📍';
      const cat = (poi.category || '').toUpperCase();
      if (cat === 'ANIMAL') iconEmoji = '🦁';
      else if (cat === 'PLANT') iconEmoji = '🌿';
      else if (cat === 'HERITAGE') iconEmoji = '🏛️';
      else if (cat === 'AMENITY') iconEmoji = '🚻';

      const customIcon = L.divIcon({
        className: 'poi-map-marker',
        html: `
          <div style="
            background: ${isSelected ? '#15803d' : '#2d6a4f'};
            color: #ffffff;
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '18px' : '14px'};
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            ${iconEmoji}
          </div>
        `,
        iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
        iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
      });

      const marker = L.marker([poi.latitude, poi.longitude], { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        onSelectPoi(poi.poiId);
      });

      const poiName = poi.text?.name || poi.originalName;
      marker.bindTooltip(`<strong>${poiName}</strong>`, {
        direction: 'top',
        offset: [0, -16]
      });

      markersRef.current[poi.poiId] = marker;

      const circle = L.circle([poi.latitude, poi.longitude], {
        radius,
        color: isSelected ? '#15803d' : '#52b788',
        fillColor: isSelected ? '#52b788' : '#74c69d',
        fillOpacity: isSelected ? 0.25 : 0.12,
        weight: isSelected ? 2 : 1
      }).addTo(map);

      circlesRef.current[poi.poiId] = circle;
    });
  }, [pois, selectedPoiId, filteredCategory, leafletLoaded]);

  // 3. Pan to selected POI
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedPoiId === null) return;
    const target = pois.find((p) => p.poiId === selectedPoiId);
    if (target) {
      map.panTo([target.latitude, target.longitude], { animate: true, duration: 0.5 });
    }
  }, [selectedPoiId, pois]);

  // 4. Ve vi tri cua du khach
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !leafletLoaded) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-map-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${isSimulatedLocation ? '#f59e0b' : '#3b82f6'};
              opacity: 0.4;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: absolute;
              top: 4px;
              left: 4px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: ${isSimulatedLocation ? '#d97706' : '#1d4ed8'};
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon }).addTo(map);
      marker.bindTooltip(
        isSimulatedLocation ? '📍 Vị trí du khách (Giả lập)' : '👤 Vị trí hiện tại của bạn',
        { permanent: false, direction: 'top' }
      );
      userMarkerRef.current = marker;
    }
  }, [userLocation, isSimulatedLocation, leafletLoaded]);

  // 5. Ve duong noi lo trinh Tour
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !leafletLoaded) return;

    if (tourPolylineRef.current) {
      tourPolylineRef.current.remove();
      tourPolylineRef.current = null;
    }

    if (activeTour && activeTour.items && activeTour.items.length > 1) {
      const sorted = [...activeTour.items].sort((a, b) => a.sequenceNo - b.sequenceNo);
      const latlngs: [number, number][] = [];

      sorted.forEach((item) => {
        const poi = pois.find((p) => p.poiId === item.poiId);
        if (poi) {
          latlngs.push([poi.latitude, poi.longitude]);
        }
      });

      if (latlngs.length > 1) {
        const polyline = L.polyline(latlngs, {
          color: '#15803d',
          weight: 4,
          opacity: 0.8,
          dashArray: '6, 8',
          lineCap: 'round'
        }).addTo(map);

        tourPolylineRef.current = polyline;
      }
    }
  }, [activeTour, pois, leafletLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px', background: '#e5e7eb' }} />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 500,
        background: 'rgba(255, 255, 255, 0.92)',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span>🦁 Động vật</span>
        <span>🌿 Cây di sản</span>
        <span>🏛️ Di tích</span>
        <span>⭕ Vòng kích hoạt 30m</span>
      </div>
    </div>
  );
};
