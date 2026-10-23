import React, { useEffect, useRef, useState } from 'react';
import { PoiDto, TourDto } from '../api/content';

interface MapViewProps {
  pois: PoiDto[];
  tourPois?: PoiDto[];
  selectedPoiId: number | null;
  onSelectPoi: (poiId: number) => void;
  userLocation: { latitude: number; longitude: number } | null;
  activeTour: TourDto | null;
  filteredCategory: string;
}

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

let leafletPromise: Promise<any> | null = null;
function loadLeafletLibrary(): Promise<any> {
  const win = window as any;
  if (win.L) return Promise.resolve(win.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve) => {
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
    const timeout = window.setTimeout(() => { script.remove(); leafletPromise = null; resolve(null); }, 15000);
    script.onload = () => { window.clearTimeout(timeout); resolve(win.L || null); };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); leafletPromise = null; resolve(null); };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export const MapView: React.FC<MapViewProps> = ({
  pois,
  tourPois = pois,
  selectedPoiId,
  onSelectPoi,
  userLocation,
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
  const [mapError, setMapError] = useState(false);

  // 1. Khoi tao ban do Leaflet
  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;

    loadLeafletLibrary().then((L) => {
      if (!active) return;
      if (!L) { setMapError(true); return; }
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const defaultCenter = [10.7875, 106.7053]; // Thao Cam Vien Sai Gon
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 17,
          zoomControl: true,
          attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapInstanceRef.current = map;
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(mapContainerRef.current);
        }
        setLeafletLoaded(true);
      }
    });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      circlesRef.current = {};
      userMarkerRef.current = null;
      tourPolylineRef.current = null;
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
            background: ${isSelected ? '#a57434' : '#315c43'};
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

      const marker = L.marker([poi.latitude, poi.longitude], { icon: customIcon, title: poi.text?.name || poi.originalName, alt: poi.text?.name || poi.originalName }).addTo(map);
      marker.on('click', () => {
        onSelectPoi(poi.poiId);
      });

      const poiName = poi.text?.name || poi.originalName;
      const tooltip = document.createElement('strong');
      tooltip.textContent = poiName;
      marker.bindTooltip(tooltip, {
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
  }, [pois, selectedPoiId, filteredCategory, leafletLoaded, onSelectPoi]);

  // 3. Pan to selected POI
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedPoiId === null) return;
    const target = pois.find((p) => p.poiId === selectedPoiId);
    if (target) {
      map.panTo([target.latitude, target.longitude], { animate: true, duration: 0.5 });
    }
  }, [selectedPoiId, pois, leafletLoaded]);

  // 4. Ve vi tri nguoi dung (GPS thuc te)
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
              background: #3b82f6;
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
              background: #1d4ed8;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon }).addTo(map);
      marker.bindTooltip('👤 Vị trí hiện tại của bạn', { permanent: false, direction: 'top' });
      userMarkerRef.current = marker;
    }
  }, [userLocation, leafletLoaded]);

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
        const poi = tourPois.find((p) => p.poiId === item.poiId);
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
  }, [activeTour, tourPois, leafletLoaded]);

  return (
    <div className="leaflet-map-shell">
      <div ref={mapContainerRef} className="leaflet-map-canvas" aria-label="Bản đồ điểm tham quan Thảo Cầm Viên" />
      {!leafletLoaded && <div className="map-load-notice" role="status">{mapError ? 'Chưa tải được bản đồ. Bạn vẫn có thể chọn điểm trong danh sách để xem giới thiệu và nghe thuyết minh.' : 'Đang mở bản đồ khu vườn…'}</div>}
      {leafletLoaded && <div className="map-legend"><span>🦁 Động vật</span><span>🌿 Thực vật</span><span>🏛️ Di tích</span><span>Vòng tròn: vùng kích hoạt</span></div>}
    </div>
  );
};
