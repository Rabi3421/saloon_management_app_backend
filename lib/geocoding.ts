export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  lat?: string;
  lon?: string;
}

function toCoordinate(value?: string) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

export async function geocodeSalonAddress(
  address: string,
): Promise<GeocodedLocation | null> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress) {
    return null;
  }

  const params = new URLSearchParams({
    q: normalizedAddress,
    format: 'jsonv2',
    limit: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'SalonOS/1.0 location-geocoder',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as NominatimResult[];
  const firstResult = results[0];

  const latitude = toCoordinate(firstResult?.lat);
  const longitude = toCoordinate(firstResult?.lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {latitude, longitude};
}