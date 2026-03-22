'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MapDistrict {
  id: string;
  name: string;
  state: string;
  status: string;
  latitude: number;
  longitude: number;
}

interface IngestionMapProps {
  search: string;
  stateFilter: string;
  statusFilter: string;
  districtSizeFilter?: string;
  localeTypeFilter?: string;
  localeSubtypeFilter?: string;
}

// Status → hex color mapping (matches dashboard badge colors)
const STATUS_COLORS: Record<string, string> = {
  ingested: '#16a34a',           // green-600
  ingested_with_warnings: '#ea580c', // orange-600
  not_ingested: '#6b7280',       // gray-500
  ready_to_ingest: '#2563eb',    // blue-600
  in_progress: '#ca8a04',        // yellow-600
  failed: '#dc2626',             // red-600
};

function getMarkerColor(status: string): string {
  return STATUS_COLORS[status] || '#6b7280';
}

function createColoredIcon(L: typeof import('leaflet'), color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="20" height="30">
    <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 20 8 20s8-14.6 8-20c0-4.4-3.6-8-8-8z"
      fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="8" r="3" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [20, 30],
    iconAnchor: [10, 30],
    popupAnchor: [0, -30],
  });
}

export default function IngestionMap({ search, stateFilter, statusFilter, districtSizeFilter = '', localeTypeFilter = '', localeSubtypeFilter = '' }: IngestionMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const clusterGroupRef = useRef<import('leaflet').Layer | null>(null);

  const [districts, setDistricts] = useState<MapDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet dynamically (avoid SSR issues)
  useEffect(() => {
    let mounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      if (!mounted || !mapRef.current || leafletMapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [39.5, -98.5],
        zoom: 4,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch map data when filters change
  useEffect(() => {
    const controller = new AbortController();

    async function fetchMapData() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (stateFilter) params.set('state', stateFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (districtSizeFilter) params.set('district_size', districtSizeFilter);
        if (localeTypeFilter) params.set('locale_type', localeTypeFilter);
        if (localeSubtypeFilter) params.set('locale_subtype', localeSubtypeFilter);

        const data = await api.get<{ districts: MapDistrict[] }>(
          `/admin/ingestion/map-data?${params}`
        );
        setDistricts(data.districts);
      } catch (err) {
        if (err instanceof ApiError) {
          setError('Failed to load map data');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMapData();
    return () => controller.abort();
  }, [search, stateFilter, statusFilter, districtSizeFilter, localeTypeFilter, localeSubtypeFilter]);

  // Update markers when map and data are ready
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    async function updateMarkers() {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');
      const map = leafletMapRef.current!;

      // Remove existing cluster group
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }

      // leaflet.markercluster extends L with markerClusterGroup(); returns a LayerGroup-compatible cluster
      const clusterGroup = (L as typeof L & { markerClusterGroup: () => import('leaflet').LayerGroup }).markerClusterGroup();

      districts.forEach((district) => {
        const color = getMarkerColor(district.status);
        const icon = createColoredIcon(L, color);

        const marker = L.marker([district.latitude, district.longitude], { icon }).bindPopup(
          `
            <div style="min-width:160px">
              <div style="font-weight:600;margin-bottom:4px">${district.name}</div>
              <div style="color:#6b7280;font-size:12px;margin-bottom:8px">${district.state}</div>
              <a href="/admin/ingestion/candidates/${district.id}"
                 style="font-size:12px;color:#2563eb;text-decoration:underline">
                View Preview →
              </a>
            </div>
          `
        );

        // Navigate on popup link click
        marker.on('popupopen', () => {
          const popupEl = marker.getPopup()?.getElement();
          if (!popupEl) return;
          const link = popupEl.querySelector('a');
          if (link) {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              router.push(`/admin/ingestion/candidates/${district.id}`);
            });
          }
        });

        clusterGroup.addLayer(marker);
      });

      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    updateMarkers();
  }, [mapReady, districts, router]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (clusterGroupRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}{' '}
          <button
            className="underline ml-1"
            onClick={() => {
              setError('');
              setLoading(true);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading overlay — only on initial map init; avoid flash when refetching on filter change */}
      {!mapReady && (
        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-gray-400">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mb-2" />
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Empty state (after load, no districts with coords) */}
      {!loading && mapReady && districts.length === 0 && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 pointer-events-none">
          <div className="text-center p-6">
            <p className="text-gray-500 font-medium">No districts with coordinates</p>
            <p className="text-gray-400 text-sm mt-1">
              Run{' '}
              <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                npm run geocode:district-candidates
              </code>{' '}
              to geocode candidates.
            </p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div className="relative">
        <div ref={mapRef} style={{ minHeight: '500px', width: '100%' }} />

        {/* Subtle "Updating" badge when refetching (avoids jarring full overlay) */}
        {loading && mapReady && (
          <div className="absolute top-3 left-3 z-[1000] px-2 py-1 bg-white/90 backdrop-blur-sm rounded shadow text-xs text-gray-500 flex items-center gap-1.5">
            <div className="animate-spin w-3.5 h-3.5 border border-gray-300 border-t-gray-500 rounded-full" />
            Updating…
          </div>
        )}
      </div>
    </div>
  );
}
