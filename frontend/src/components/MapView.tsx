import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import React, { useEffect, useRef, useState } from 'react';
import { PoiDto, TourDto } from '../api/content';
import { handleMarkerPhotoError, visitorMarkerHtml } from './visitorMapMarker';
import { constrainVisitorMap } from './visitorMapBounds';

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
  // Shipped by Vite with the app; opening a map must not depend on a third-party script CDN.
  leafletPromise = import('leaflet').then(module => {
    const library = module.default || module;
    win.L = library;
    return library;
  }).catch(() => { leafletPromise = null; return null; });
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
  const { t, language: locale } = useVisitorLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const viewRegionRef = useRef<ReturnType<typeof constrainVisitorMap>>(null);
  const markersRef = useRef<{ [key: number]: any }>({});
  const circlesRef = useRef<{ [key: number]: any }>({});
  const userMarkerRef = useRef<any>(null);
  const tourPolylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [tileError, setTileError] = useState(false);

  // 1. Load the standard OSM basemap; failed tiles must not look like a loaded map.
  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer1: number | null = null;
    let resizeTimer2: number | null = null;

    const handleWindowResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };

    loadLeafletLibrary().then((L) => {
      if (!active) return;
      if (!L || typeof L.map !== 'function') {
        setMapError(true);
        return;
      }
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const defaultCenter = [10.7875, 106.7053]; // Thao Cam Vien Sai Gon
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 17,
          zoomSnap: 0.25,
          maxZoom: 19,
          maxBoundsViscosity: 1,
          bounceAtZoomLimits: false,
          zoomControl: true,
          attributionControl: true
        });

        let currentLayer: any = null;
        let fallbackUsed = false;
        const installBasemap = (fallback: boolean) => {
          currentLayer?.remove?.();
          let failed = false;
          const tiles = L.tileLayer(fallback
            ? 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
            : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <span data-map-contributors>contributors</span>' +
              (fallback ? ' | <a href="https://www.hotosm.org/">HOT</a>, tiles <a href="https://www.openstreetmap.fr/usage/">OpenStreetMap France</a>' : '')
          });
          currentLayer = tiles;
          tiles.on('loading', () => { if (active && tiles === currentLayer) { failed = false; setTileError(false); } });
          tiles.on('load', () => { if (active && tiles === currentLayer && !failed) setTileError(false); });
          tiles.on('tileerror', () => {
            if (!active || tiles !== currentLayer) return;
            failed = true;
            if (!fallbackUsed) {
              fallbackUsed = true;
              installBasemap(true); // One bounded fallback; never bypass HTTPS validation.
            } else setTileError(true);
          });
          tiles.addTo(map);
        };
        installBasemap(false);

        mapInstanceRef.current = map;

        // Kich hoat invalidateSize nhieu buoc de dong bo kich thuoc voi CSS Grid
        map.invalidateSize();
        resizeTimer1 = window.setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 150);
        resizeTimer2 = window.setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 400);

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('resize', handleWindowResize);
        }

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => map.invalidateSize());
          resizeObserver.observe(mapContainerRef.current);
        }
        setLeafletLoaded(true);
      }
    });

    return () => {
      active = false;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', handleWindowResize);
      }
      if (resizeTimer1) window.clearTimeout(resizeTimer1);
      if (resizeTimer2) window.clearTimeout(resizeTimer2);
      resizeObserver?.disconnect();
      viewRegionRef.current?.dispose();
      viewRegionRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      circlesRef.current = {};
      userMarkerRef.current = null;
      tourPolylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    const attribution = container?.querySelector?.('[data-map-contributors]');
    if (attribution) attribution.textContent = t('đóng góp bản đồ');
    container?.querySelector?.('.leaflet-control-zoom-in')?.setAttribute('title', t('Phóng to'));
    container?.querySelector?.('.leaflet-control-zoom-in')?.setAttribute('aria-label', t('Phóng to'));
    container?.querySelector?.('.leaflet-control-zoom-out')?.setAttribute('title', t('Thu nhỏ'));
    container?.querySelector?.('.leaflet-control-zoom-out')?.setAttribute('aria-label', t('Thu nhỏ'));
  }, [locale, leafletLoaded, t]);

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

      const customIcon = L.divIcon({
        className: `poi-map-marker${isSelected ? ' is-selected' : ''}`,
        html: visitorMarkerHtml(poi, locale),
        iconSize: [isSelected ? 44 : 38, isSelected ? 44 : 38],
        iconAnchor: [isSelected ? 22 : 19, isSelected ? 22 : 19]
      });

      const marker = L.marker([poi.latitude, poi.longitude], { icon: customIcon, title: poi.text?.name || poi.originalName, alt: poi.text?.name || poi.originalName }).addTo(map);
      handleMarkerPhotoError(marker);
      marker.getElement?.()?.setAttribute('aria-label', poi.text?.name || poi.originalName);
      marker.on('click', () => {
        onSelectPoi(poi.poiId);
      });

      const poiName = poi.text?.name || poi.originalName;
      const tooltip = document.createElement('strong');
      tooltip.textContent = poiName;
      marker.bindTooltip(tooltip, {
        direction: 'top', permanent: isSelected,
        className: isSelected ? 'garden-selected-tooltip' : '',
        offset: [0, isSelected ? -24 : -20]
      });

      markersRef.current[poi.poiId] = marker;

      if (!isSelected) return;
      const circle = L.circle([poi.latitude, poi.longitude], {
        radius,
        color: '#596746',
        fillColor: '#596746',
        fillOpacity: 0.08,
        weight: isSelected ? 2 : 1
      }).addTo(map);

      circlesRef.current[poi.poiId] = circle;
    });
  }, [pois, selectedPoiId, filteredCategory, leafletLoaded, onSelectPoi, locale]);

  // Keep the view region independent of search/category/language selections.
  const selectedMapPoi = pois.find(p => p.poiId === selectedPoiId);
  const initialPointKey = tourPois.map(p => `${p.poiId}:${p.latitude}:${p.longitude}`).join('|');
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !leafletLoaded) return;
    viewRegionRef.current = constrainVisitorMap(map, tourPois);
    return () => { viewRegionRef.current?.dispose(); viewRegionRef.current = null; };
  }, [initialPointKey, leafletLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !leafletLoaded) return;
    if (selectedMapPoi) map.panTo([selectedMapPoi.latitude, selectedMapPoi.longitude], { animate: true, duration: 0.5 });
  }, [selectedPoiId, selectedMapPoi?.latitude, selectedMapPoi?.longitude, leafletLoaded]);

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
      marker.bindTooltip(t("👤 Vị trí hiện tại của bạn"), { permanent: false, direction: 'top' });
      userMarkerRef.current = marker;
    }
  }, [userLocation, leafletLoaded, locale]);

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
      <div ref={mapContainerRef} className="leaflet-map-canvas" aria-label={t("Bản đồ điểm tham quan Thảo Cầm Viên")} />
      {!leafletLoaded && <div className="map-load-notice" role="status">{mapError ? t("Chưa tải được bản đồ. Bạn vẫn có thể chọn điểm trong danh sách để xem giới thiệu và nghe thuyết minh.") : t("Đang mở bản đồ khu vườn…")}</div>}
      {leafletLoaded && tileError && <div className="map-load-notice" role="status">{t("Chưa tải được một phần nền bản đồ. Bạn vẫn có thể chọn điểm trong danh sách; thử tải lại trang khi kết nối ổn định.")}</div>}
      {leafletLoaded && <button className="garden-map-fit" type="button" aria-label={t("Hiện toàn bộ điểm")} onClick={() => {
        viewRegionRef.current?.fitOverview();
      }}>{t("Toàn cảnh")}</button>}

    </div>
  );
};
