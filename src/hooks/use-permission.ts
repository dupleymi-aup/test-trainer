"use client";

import { useState, useEffect } from "react";

interface UsePermissionReturn {
  state: PermissionState | "unsupported";
  status: "granted" | "denied" | "prompt" | "unsupported";
}

export function usePermission(
  permissionName: PermissionName
): UsePermissionReturn {
  const [state, setState] = useState<PermissionState | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      return;
    }

    let cancelled = false;
    let result: PermissionStatus | null = null;
    const handleChange = () => {
      if (!cancelled && result) setState(result.state);
    };

    navigator.permissions
      .query({ name: permissionName })
      .then((r) => {
        if (cancelled) return;
        result = r;
        setState(r.state);
        // eslint-disable-next-line @eslint-react/web-api-no-leaked-event-listener
        r.addEventListener("change", handleChange);
      })
      .catch(() => {
        if (!cancelled) setState("unsupported");
      });

    return () => {
      cancelled = true;
      if (result) {
        result.removeEventListener("change", handleChange);
      }
    };
  }, [permissionName]);

  return {
    state,
    status: state as UsePermissionReturn["status"],
  };
}
