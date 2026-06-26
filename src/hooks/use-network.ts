"use client";

import { useState, useEffect } from "react";

interface NetworkInfo {
  online: boolean;
  offline: boolean;
  rtt: number | null;
  downlink: number | null;
  effectiveType: string | null;
  saveData: boolean | null;
}

interface NetworkInformation {
  rtt?: number;
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

function getNetworkInfo(): NetworkInfo {
  if (typeof navigator === "undefined") {
    return { online: true, offline: false, rtt: null, downlink: null, effectiveType: null, saveData: null };
  }
  const online = navigator.onLine;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return {
    online,
    offline: !online,
    rtt: conn?.rtt ?? null,
    downlink: conn?.downlink ?? null,
    effectiveType: conn?.effectiveType ?? null,
    saveData: conn?.saveData ?? null,
  };
}

export function useNetwork(): NetworkInfo {
  const [info, setInfo] = useState<NetworkInfo>(getNetworkInfo);

  useEffect(() => {
    const handleOnline = () => setInfo(getNetworkInfo());
    const handleOffline = () => setInfo(getNetworkInfo());
    const handleChange = () => setInfo(getNetworkInfo());

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (conn) {
      conn.addEventListener("change", handleChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) {
        conn.removeEventListener("change", handleChange);
      }
    };
  }, []);

  return info;
}
