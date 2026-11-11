import React, { useEffect, useState } from "react";
import { FiMapPin, FiNavigation, FiX, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api/axios";
import {
  applyPincodeLocation,
  applySavedAddressLocation,
  detectRealtimeLocation,
} from "../utils/deliveryLocation";

const LocationPickerModal = ({ isOpen, onClose, currentLocation }) => {
  const [pincode, setPincode] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [applyingPin, setApplyingPin] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPincode(currentLocation?.pincode || "");

    const token = localStorage.getItem("token");
    if (!token) {
      setSavedAddresses([]);
      return;
    }

    let cancelled = false;
    setLoadingAddresses(true);
    api
      .get("/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (!cancelled) {
          setSavedAddresses(
            Array.isArray(res.data?.addresses) ? res.data.addresses : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSavedAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAddresses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentLocation?.pincode]);

  if (!isOpen) return null;

  const handleDetectCurrent = async () => {
    if (detecting) return;
    try {
      setDetecting(true);
      const loc = await detectRealtimeLocation();
      toast.success(`Location set to ${loc.shortLabel}`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to detect current location");
    } finally {
      setDetecting(false);
    }
  };

  const handleApplyPincode = async (e) => {
    e.preventDefault();
    if (applyingPin) return;
    try {
      setApplyingPin(true);
      const loc = await applyPincodeLocation(pincode);
      toast.success(`Location set to ${loc.shortLabel}`);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Please enter a valid 6-digit pincode"
      );
    } finally {
      setApplyingPin(false);
    }
  };

  const handleSelectAddress = (addr) => {
    const loc = applySavedAddressLocation(addr);
    toast.success(`Location set to ${loc.shortLabel}`);
    onClose();
  };

  return (
    <div
      className="location-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose delivery location"
    >
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <h3>Choose your delivery location</h3>
          <button
            type="button"
            className="location-modal-close"
            onClick={onClose}
            aria-label="Close location picker"
          >
            <FiX />
          </button>
        </div>

        <p className="location-modal-subtitle">
          Delivery availability and speeds depend on your location.
        </p>

        <button
          type="button"
          className="location-gps-btn"
          onClick={handleDetectCurrent}
          disabled={detecting}
        >
          <FiNavigation />
          <span>
            {detecting
              ? "Detecting real-time location..."
              : "Use my current location"}
          </span>
        </button>

        <form className="location-pin-form" onSubmit={handleApplyPincode}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit pincode"
            aria-label="Enter 6-digit pincode"
          />
          <button
            type="submit"
            disabled={applyingPin || pincode.replace(/\D/g, "").length !== 6}
          >
            {applyingPin ? "Applying..." : "Apply"}
          </button>
        </form>

        {loadingAddresses && (
          <div className="location-saved-loading">Loading saved addresses...</div>
        )}

        {!loadingAddresses && savedAddresses.length > 0 && (
          <div className="location-saved-section">
            <span className="location-saved-title">Saved addresses</span>
            <div className="location-saved-list">
              {savedAddresses.map((addr) => {
                const isActive =
                  currentLocation?.pincode === String(addr.pincode || "");
                return (
                  <button
                    type="button"
                    key={addr._id}
                    className={`location-saved-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectAddress(addr)}
                  >
                    <FiMapPin className="location-saved-pin" />
                    <div className="location-saved-text">
                      <strong>
                        {addr.addressType || "Address"} • {addr.pincode}
                      </strong>
                      <span>
                        {addr.streetLocality || addr.houseBuilding},{" "}
                        {addr.cityState}
                      </span>
                    </div>
                    {isActive && <FiCheck className="location-saved-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPickerModal;
