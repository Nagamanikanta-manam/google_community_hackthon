import { Client } from '@googlemaps/google-maps-services-js';
import { config } from '../config.js';

const client = new Client({});

// Small fixed lookup so the demo has deterministic, sensible coordinates
// even if the Geocoding API key isn't configured yet.
const KNOWN_VILLAGES = {
  ramapuram: { lat: 14.6819, lng: 77.5946, resolved_place: 'Ramapuram, Anantapur' },
  kothapalli: { lat: 14.7205, lng: 77.6402, resolved_place: 'Kothapalli, Anantapur' },
  singanamala: { lat: 14.6102, lng: 77.7561, resolved_place: 'Singanamala, Anantapur' },
  bukkarayasamudram: { lat: 14.5763, lng: 77.5487, resolved_place: 'Bukkarayasamudram, Anantapur' },
};

export async function geocodeLocation(locationText, fallbackLatLng) {
  const key = (locationText || '').toLowerCase().trim();
  const known = Object.entries(KNOWN_VILLAGES).find(([name]) => key.includes(name));
  if (known) return { ...known[1], source: 'known_village' };

  if (config.mockGeocode || !config.mapsApiKey) {
    if (fallbackLatLng) return { ...fallbackLatLng, resolved_place: locationText, source: 'gps_fallback' };
    const fallback = Object.values(KNOWN_VILLAGES)[0];
    return { ...fallback, source: 'mock_default' };
  }

  try {
    const response = await client.geocode({
      params: {
        address: `${locationText}, ${config.districtName}`,
        key: config.mapsApiKey,
      },
    });
    const result = response.data.results?.[0];
    if (result) {
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        resolved_place: result.formatted_address,
        source: 'geocoding_api',
      };
    }
  } catch (err) {
    console.error('Geocoding failed, falling back:', err.message);
  }

  if (fallbackLatLng) return { ...fallbackLatLng, resolved_place: locationText, source: 'gps_fallback' };
  return { ...Object.values(KNOWN_VILLAGES)[0], source: 'default_fallback' };
}

const LIVE_GEO_SOURCES = ['known_village', 'geocoding_api', 'gps_fallback'];

export function isLiveGeoSource(source) {
  return LIVE_GEO_SOURCES.includes(source);
}
