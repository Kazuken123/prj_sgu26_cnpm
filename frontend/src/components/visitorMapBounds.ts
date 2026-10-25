type Coordinate = { latitude: number; longitude: number };
type Bounds = [[number, number], [number, number]];

// A display region around the supplied POIs, not a surveyed zoo boundary.
export function visitorMapRegion(points: Coordinate[]): { points: Bounds; region: Bounds } | null {
  const valid = points.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180);
  if (!valid.length) return null;
  const south = Math.min(...valid.map(p => p.latitude));
  const north = Math.max(...valid.map(p => p.latitude));
  const west = Math.min(...valid.map(p => p.longitude));
  const east = Math.max(...valid.map(p => p.longitude));
  const latMargin = Math.max((north - south) * 0.25, 0.001);
  const lngMargin = Math.max((east - west) * 0.25, 0.001);
  return {
    points: [[south, west], [north, east]],
    region: [[Math.max(-90, south - latMargin), Math.max(-180, west - lngMargin)],
      [Math.min(90, north + latMargin), Math.min(180, east + lngMargin)]]
  };
}

interface VisitorMap {
  getBoundsZoom(bounds: Bounds, inside: boolean, padding: [number, number]): number;
  getZoom(): number;
  setMinZoom(zoom: number): unknown;
  setMaxBounds(bounds: Bounds): unknown;
  fitBounds(bounds: Bounds, options: { padding: [number, number]; maxZoom: number; animate: boolean }): unknown;
  on(event: string, handler: () => void): unknown;
  off(event: string, handler: () => void): unknown;
}

export function constrainVisitorMap(map: VisitorMap, points: Coordinate[]) {
  const bounds = visitorMapRegion(points);
  if (!bounds) return null;
  let overviewZoom = 18;
  const fitOverview = () => map.fitBounds(bounds.points, { padding: [44, 44], maxZoom: 18, animate: false });
  const updateMinimum = () => {
    // Fit the POIs, including marker/tooltip room, on both narrow and wide screens.
    const fitZoom = map.getBoundsZoom(bounds.points, false, [88, 88]);
    overviewZoom = Number.isFinite(fitZoom) ? Math.max(0, Math.min(18, fitZoom)) : 18;
    map.setMinZoom(overviewZoom);
  };
  const onResize = () => {
    const wasOverview = map.getZoom() <= overviewZoom + 0.01;
    updateMinimum();
    if (wasOverview) fitOverview();
  };
  updateMinimum();
  map.setMaxBounds(bounds.region);
  fitOverview();
  map.on('resize', onResize);
  return { fitOverview, dispose: () => map.off('resize', onResize) };
}
