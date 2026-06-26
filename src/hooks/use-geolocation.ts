"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: GeolocationPositionError | null;
}

interface UseGeolocationOptions extends GeolocationOptions {
  enableOnMount?: boolean;
}

export function useGeolocation(options?: UseGeolocationOptions): GeolocationState {
  const { enableOnMount = true, enableHighAccuracy, timeout, maximumAge } = options || {};
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: enableOnMount,
    error: null,
  });

  useEffect(() => {
    if (!enableOnMount || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
        }));
      },
      { enableHighAccuracy, timeout, maximumAge }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enableOnMount, enableHighAccuracy, timeout, maximumAge]);

  return state;
}
