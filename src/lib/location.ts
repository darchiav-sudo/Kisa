import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import type { Area, Coords } from '@/src/models/types';

export type LocationStatus = 'idle' | 'detecting' | 'ready' | 'denied' | 'error';

export type DetectedLocation = { label: string; coords: Coords; area?: Area };

function areaFrom(place: Location.LocationGeocodedAddress | undefined): Area | undefined {
  if (!place) return undefined;
  const area: Area = {
    countryCode: place.isoCountryCode?.toUpperCase() || undefined,
    city: place.city ?? place.subregion ?? undefined,
    region: place.region ?? undefined,
  };
  return area.countryCode || area.city ? area : undefined;
}

function labelFrom(place: Location.LocationGeocodedAddress | undefined, coords: Coords) {
  const parts = [place?.district, place?.city ?? place?.subregion, place?.region, place?.country]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .filter((p, i, all) => all.indexOf(p) === i);
  return parts.length > 0 ? parts.join(', ') : `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
}

export function useDeviceLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (): Promise<DetectedLocation | null> => {
    setStatus('detecting');
    setError(null);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const coords = {
        lat: Number(latitude.toFixed(2)),
        lng: Number(longitude.toFixed(2)),
      };
      let place: Location.LocationGeocodedAddress | undefined;
      if (Platform.OS !== 'web') {
        [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      }
      setStatus('ready');
      return { label: labelFrom(place, coords), coords, area: areaFrom(place) };
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
      return null;
    }
  }, []);

  return { status, error, detect };
}
