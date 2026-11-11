import { useEffect, useState } from "react";
import api from "../api/axios";

export const STORAGE_KEY = "decathlon_delivery_location";
const AUTO_ATTEMPT_KEY = "decathlon_location_auto_attempted";

export const DEFAULT_DELIVERY_LOCATION = {
  label: "Bangalore Central, Bangalore, 560001, Karnataka",
  shortLabel: "Bangalore Central, Bangalore, 560001",
  pincode: "560001",
  city: "Bangalore",
  state: "Karnataka",
  locality: "Bangalore Central",
  source: "default",
};

let activeDetectPromise = null;

export const formatLocationSummary = ({
  locality = "",
  streetLocality = "",
  district = "",
  city = "",
  state = "",
  cityState = "",
  pincode = "",
} = {}) => {
  const cleanPin = String(pincode || "").replace(/\D/g, "").slice(0, 6);

  let resolvedCity = city || district || "";
  let resolvedState = state || "";
  if ((!resolvedCity || !resolvedState) && cityState) {
    const parts = cityState.split(",").map((p) => p.trim()).filter(Boolean);
    if (!resolvedCity && parts[0]) resolvedCity = parts[0];
    if (!resolvedState && parts[1]) resolvedState = parts[1];
  }

  const area = (locality || streetLocality || "")
    .split(",")[0]
    ?.trim() || "";

  const shortParts = [];
  if (area && area.toLowerCase() !== resolvedCity.toLowerCase()) {
    shortParts.push(area);
  }
  if (resolvedCity) shortParts.push(resolvedCity);
  if (cleanPin) shortParts.push(cleanPin);

  const fullParts = [...shortParts];
  if (
    resolvedState &&
    resolvedState.toLowerCase() !== resolvedCity.toLowerCase()
  ) {
    fullParts.push(resolvedState);
  }

  const fallback = cityState || resolvedCity || cleanPin || DEFAULT_DELIVERY_LOCATION.label;
  return {
    label: fullParts.length ? fullParts.join(", ") : fallback,
    shortLabel: shortParts.length ? shortParts.join(", ") : fallback,
    pincode: cleanPin || DEFAULT_DELIVERY_LOCATION.pincode,
    city: resolvedCity,
    state: resolvedState,
    locality: area,
  };
};

export const getStoredDeliveryLocation = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DELIVERY_LOCATION;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.label) {
      return {
        ...DEFAULT_DELIVERY_LOCATION,
        ...parsed,
        shortLabel: parsed.shortLabel || parsed.label,
      };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_DELIVERY_LOCATION;
};

export const setStoredDeliveryLocation = (locationObj) => {
  const normalized = {
    ...DEFAULT_DELIVERY_LOCATION,
    ...locationObj,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("deliveryLocationChanged", { detail: normalized })
    );
  }
  return normalized;
};

export const detectRealtimeLocation = () => {
  if (activeDetectPromise) return activeDetectPromise;

  activeDetectPromise = new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      activeDetectPromise = null;
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await api.get("/location/reverse-geocode", {
            params: { lat: latitude, lon: longitude },
          });

          const data = response.data?.data;
          if (!response.data?.success || !data) {
            throw new Error(
              response.data?.message || "Unable to resolve current address"
            );
          }

          const formatted = formatLocationSummary({
            streetLocality: data.streetLocality,
            locality: data.streetLocality || data.landmark,
            city: data.city,
            state: data.state,
            cityState: data.cityState,
            pincode: data.pincode,
          });

          const saved = setStoredDeliveryLocation({
            ...formatted,
            latitude,
            longitude,
            source: "gps",
          });
          resolve(saved);
        } catch (err) {
          reject(err);
        } finally {
          activeDetectPromise = null;
        }
      },
      (geoErr) => {
        activeDetectPromise = null;
        const msg =
          geoErr?.code === 1
            ? "Location permission denied. Please enter your pincode or enable location access."
            : "Unable to get your current location. Please enter your pincode.";
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });

  return activeDetectPromise;
};

export const applyPincodeLocation = async (pincode) => {
  const cleanPin = String(pincode || "").trim().replace(/\D/g, "");
  if (cleanPin.length !== 6) {
    throw new Error("Please enter a valid 6-digit Indian pincode");
  }

  const response = await api.get(`/location/pincode/${cleanPin}`);
  const data = response.data?.data;
  if (!response.data?.success || !data) {
    throw new Error(response.data?.message || "Pincode not found");
  }

  const formatted = formatLocationSummary({
    locality: Array.isArray(data.localities) ? data.localities[0] : "",
    district: data.district,
    state: data.state,
    cityState: data.cityState,
    pincode: data.pincode || cleanPin,
  });

  return setStoredDeliveryLocation({
    ...formatted,
    source: "pincode",
  });
};

export const applySavedAddressLocation = (address) => {
  if (!address) return getStoredDeliveryLocation();
  const formatted = formatLocationSummary({
    streetLocality: address.streetLocality,
    locality: address.streetLocality || address.landmark || address.houseBuilding,
    cityState: address.cityState,
    pincode: address.pincode,
  });
  return setStoredDeliveryLocation({
    ...formatted,
    source: "address",
  });
};

export const openLocationPickerModal = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("openLocationModal"));
  }
};

export const useDeliveryLocation = ({ autoDetect = false } = {}) => {
  const [location, setLocation] = useState(() => getStoredDeliveryLocation());
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const sync = (event) => {
      if (event?.detail) {
        setLocation(event.detail);
      } else {
        setLocation(getStoredDeliveryLocation());
      }
    };

    window.addEventListener("deliveryLocationChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("deliveryLocationChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!autoDetect) return;
    if (process.env.NODE_ENV === "test") return;

    const current = getStoredDeliveryLocation();
    if (current.source && current.source !== "default") return;

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(AUTO_ATTEMPT_KEY) === "1";
    } catch {
      alreadyTried = false;
    }
    if (alreadyTried) return;

    try {
      sessionStorage.setItem(AUTO_ATTEMPT_KEY, "1");
    } catch {
      // ignore
    }

    let cancelled = false;

    const tryAutoLocation = async () => {
      // 1. Try real-time browser geolocation first
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          if (!cancelled) setDetecting(true);
          await detectRealtimeLocation();
          return;
        } catch {
          // Fall back silently to saved default address if user is logged in
        } finally {
          if (!cancelled) setDetecting(false);
        }
      }

      // 2. Fall back to user's saved default address if logged in
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await api.get("/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data?.addresses;
        if (Array.isArray(list) && list.length > 0 && !cancelled) {
          const defAddr = list.find((a) => a.isDefault) || list[0];
          applySavedAddressLocation(defAddr);
        }
      } catch {
        // Keep default fallback quietly
      }
    };

    tryAutoLocation();

    return () => {
      cancelled = true;
    };
  }, [autoDetect]);

  return { location, detecting };
};
