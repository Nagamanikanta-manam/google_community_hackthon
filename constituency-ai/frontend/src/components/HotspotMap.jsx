import { useCallback } from 'react';
import { GoogleMap, LoadScript, CircleF } from '@react-google-maps/api';
import { themeClass, themeHex } from '../theme.js';

const MAPS_KEY = import.meta.env.VITE_MAPS_API_KEY || '';

const containerStyle = { width: '100%', height: '380px' };
const defaultCenter = { lat: 14.68, lng: 77.6 };

// google.maps.visualization.HeatmapLayer was removed from the Maps JS API as of
// v3.65 (see https://developers.google.com/maps/deprecations) - circles sized by
// urgency and colored by theme replace it, and double as a direct-label legend key
// since color already carries theme identity elsewhere on the dashboard.
//
// Uses CircleF (the functional/hooks variant), not Circle (the class variant) -
// the class component's contextType-based mount silently no-ops in this
// React 18 + Vite setup (confirmed by instrumenting google.maps.Circle's
// constructor: zero calls with Circle, correct calls with CircleF).
function densityRadius(urgency) {
  return 300 + (urgency || 1) * 250;
}

export default function HotspotMap({ points, onMarkerClick }) {
  const validPoints = points.filter((p) => p.lat && p.lng);

  // A fixed district-wide zoom makes ~500m-1km hotspot circles imperceptible; fit
  // the viewport to whatever points actually exist instead of guessing a zoom level.
  const onMapLoad = useCallback((map) => {
    if (!validPoints.length) return;
    if (validPoints.length === 1) {
      map.setCenter({ lat: validPoints[0].lat, lng: validPoints[0].lng });
      map.setZoom(13);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    validPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  if (!MAPS_KEY) {
    return (
      <div className="map-wrap map-fallback">
        <p className="map-fallback-note">
          Set VITE_MAPS_API_KEY in frontend/.env to enable the hotspot map. Showing a plain list
          instead:
        </p>
        <ul>
          {points.slice(0, 10).map((p, i) => (
            <li key={i}>
              <span className={`legend-swatch ${themeClass(p.theme)}`} />
              {p.theme} — {p.resolved_place || `${p.lat}, ${p.lng}`}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <LoadScript googleMapsApiKey={MAPS_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={10}
          onLoad={onMapLoad}
        >
          {validPoints.map((p, i) => (
            <CircleF
              key={i}
              center={{ lat: p.lat, lng: p.lng }}
              radius={densityRadius(p.urgency)}
              // CircleF's onClick prop doesn't reliably reach the underlying instance in
              // this library version (confirmed: circles render, but the React onClick
              // handler never fires under any pointer sequence). Attaching the listener
              // directly to the native google.maps.Circle via onLoad bypasses that gap.
              onLoad={(circle) => {
                window.google.maps.event.addListener(circle, 'click', () => onMarkerClick?.(p));
              }}
              options={{
                fillColor: themeHex(p.theme),
                fillOpacity: 0.35,
                strokeColor: themeHex(p.theme),
                strokeOpacity: 0.7,
                strokeWeight: 1,
                clickable: true,
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
