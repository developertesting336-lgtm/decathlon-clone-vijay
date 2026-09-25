import React, { useEffect, useState } from "react";
import { FiArrowLeft, FiMapPin, FiX, FiEdit2, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/AddressDrawer.css";

const initialForm = {
  houseBuilding: "",
  streetLocality: "",
  landmark: "",
  pincode: "",
  cityState: "",
  firstName: "",
  lastName: "",
  mobile: "",
};

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

const AddressDrawer = ({
  isOpen,
  onClose,
  onAddressSaved,
  selectedAddress,
  initialShowForm = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAddressObj, setEditingAddressObj] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [addressType, setAddressType] = useState("Home");
  const [isDefault, setIsDefault] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [accuracyNotice, setAccuracyNotice] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      setShowForm(false);
      setEditingAddressObj(null);
      setDetectingLocation(false);
      setLocationDetected(false);
      setAccuracyNotice(null);
      return;
    }

    document.body.style.overflow = "hidden";

    if (initialShowForm) {
      setShowForm(true);
      if (selectedAddress) {
        setEditingAddressObj(selectedAddress);
        setForm({
          houseBuilding: selectedAddress.houseBuilding || "",
          streetLocality: selectedAddress.streetLocality || "",
          landmark: selectedAddress.landmark || "",
          pincode: selectedAddress.pincode || "",
          cityState: selectedAddress.cityState || "",
          firstName: selectedAddress.firstName || "",
          lastName: selectedAddress.lastName || "",
          mobile: selectedAddress.mobile || "",
        });
        setAddressType(selectedAddress.addressType || "Home");
        setIsDefault(Boolean(selectedAddress.isDefault));
        setSelectedId(selectedAddress._id);
      } else {
        setForm(initialForm);
        setAddressType("Home");
        setIsDefault(false);
      }
    } else {
      setShowForm(false);
      if (selectedAddress?._id) {
        setSelectedId(selectedAddress._id);
      }
    }

    const fetchDrawerAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const response = await api.get("/addresses", getAuthConfig());
        const data = response.data?.addresses || [];
        setAddresses(Array.isArray(data) ? data : []);

        if (data.length > 0) {
          const defaultAddress = data.find((address) => address.isDefault === true);
          if (selectedAddress?._id) {
            setSelectedId(selectedAddress._id);
          } else if (defaultAddress) {
            setSelectedId(defaultAddress._id);
          } else {
            setSelectedId(data[0]._id);
          }
        } else {
          setSelectedId("");
        }
      } catch (error) {
        console.error("Fetch Addresses Error:", error);
        if (error.response?.status === 401) {
          toast.error("Please login first");
        } else {
          toast.error(
            error.response?.data?.message || "Failed to load addresses"
          );
        }
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchDrawerAddresses();

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, selectedAddress, initialShowForm]);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const response = await api.get("/addresses", getAuthConfig());
      const data = response.data?.addresses || [];
      setAddresses(Array.isArray(data) ? data : []);

      if (data.length > 0) {
        const defaultAddress = data.find((address) => address.isDefault === true);
        if (selectedId) {
          // Keep current selection
        } else if (defaultAddress) {
          setSelectedId(defaultAddress._id);
        } else {
          setSelectedId(data[0]._id);
        }
      } else {
        setSelectedId("");
      }
    } catch (error) {
      console.error("Fetch Addresses Error:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    if (locationDetected) {
      setLocationDetected(false);
    }
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-resolve City & State when a valid 6-digit Indian pincode is entered
    if (name === "pincode") {
      const cleanPin = value.trim().replace(/\D/g, "");
      if (cleanPin.length === 6) {
        try {
          const pinRes = await api.get(`/location/pincode/${cleanPin}`);
          if (pinRes.data?.success && pinRes.data?.data) {
            const pinData = pinRes.data.data;
            setForm((prev) => ({
              ...prev,
              cityState: pinData.cityState || prev.cityState,
            }));
            setAccuracyNotice(null);
            toast.success(`Location set: ${pinData.cityState}`, {
              id: "pincode-detected",
            });
          }
        } catch (pinErr) {
          console.warn("Pincode auto-lookup error:", pinErr.message);
        }
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (detectingLocation) return;

    if (!navigator.geolocation) {
      toast.error(
        "Geolocation is not supported by your browser. Please enter your address manually."
      );
      return;
    }

    setDetectingLocation(true);
    setLocationDetected(false);
    setAccuracyNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          console.info(
            `📍 Geolocation detected: lat=${latitude}, lon=${longitude}, accuracy=${Math.round(
              accuracy || 0
            )}m`
          );

          // If accuracy is coarse (> 3000m), it's likely an ISP/network IP fallback
          if (accuracy && accuracy > 3000) {
            const km = Math.max(1, Math.round(accuracy / 1000));
            setAccuracyNotice(
              `Detected approximate network location (±${km} km). Please verify your Pincode and Street.`
            );
          } else {
            setAccuracyNotice(null);
          }

          const response = await api.get("/location/reverse-geocode", {
            params: { lat: latitude, lon: longitude },
            ...getAuthConfig(),
          });

          if (response.data?.success && response.data?.data) {
            const data = response.data.data;
            setForm((prev) => ({
              ...prev,
              // Only fill houseBuilding if detected, else keep user's manual entry
              houseBuilding: data.houseBuilding || prev.houseBuilding || "",
              streetLocality: data.streetLocality || prev.streetLocality || "",
              landmark: data.landmark || prev.landmark || "",
              pincode: data.pincode || prev.pincode || "",
              cityState: data.cityState || prev.cityState || "",
            }));

            setLocationDetected(true);
            toast.success("✓ Location detected");

            setTimeout(() => {
              setLocationDetected(false);
            }, 4000);
          } else {
            toast.error(
              response.data?.message ||
                "Unable to find your address. Please enter it manually."
            );
          }
        } catch (error) {
          console.error("Reverse Geocoding Error:", error);
          toast.error(
            error.response?.data?.message ||
              "Unable to find your address. Please enter it manually."
          );
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);
        console.error("Geolocation Error:", error);

        if (error.code === error.PERMISSION_DENIED || error.code === 1) {
          toast.error(
            "Location permission was denied. Please allow location access or enter your address manually."
          );
        } else if (
          error.code === error.POSITION_UNAVAILABLE ||
          error.code === 2
        ) {
          toast.error("Unable to detect your location. Please try again.");
        } else if (error.code === error.TIMEOUT || error.code === 3) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Unable to detect your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (
      !form.houseBuilding.trim() ||
      !form.streetLocality.trim() ||
      !form.pincode.trim() ||
      !form.cityState.trim() ||
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.mobile.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      toast.error("Enter a valid 6 digit pincode");
      return;
    }

    if (!/^\d{10}$/.test(form.mobile.trim())) {
      toast.error("Enter a valid 10 digit mobile number");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobile: form.mobile.trim(),
        houseBuilding: form.houseBuilding.trim(),
        streetLocality: form.streetLocality.trim(),
        landmark: form.landmark.trim(),
        pincode: form.pincode.trim(),
        cityState: form.cityState.trim(),
        addressType,
        isDefault,
      };

      let response;
      const targetId = editingAddressObj?._id;
      if (targetId) {
        response = await api.put(`/addresses/${targetId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        response = await api.post("/addresses", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      const savedAddress = response.data?.address || payload;
      toast.success(
        response.data?.message ||
          (targetId ? "Address updated successfully" : "Address added successfully")
      );

      await fetchAddresses();

      if (savedAddress?._id) {
        setSelectedId(savedAddress._id);
      }

      if (onAddressSaved) {
        onAddressSaved(savedAddress);
      }

      setForm(initialForm);
      setEditingAddressObj(null);
      setAddressType("Home");
      setIsDefault(false);
      setShowForm(false);
      if (initialShowForm) {
        onClose();
      }
    } catch (error) {
      console.error("Save Address Error:", error);
      if (error.response?.status === 401) {
        toast.error("Please login first");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    const address = addresses.find((item) => item._id === selectedId);
    if (!address) {
      toast.error("Please select an address");
      return;
    }
    if (onAddressSaved) {
      onAddressSaved(address);
    }
    onClose();
  };

  const handleBack = () => {
    if (saving) return;

    if (showForm && !initialShowForm) {
      setShowForm(false);
      setEditingAddressObj(null);
      return;
    }

    onClose();
  };

  const handleEdit = (e, address) => {
    e.stopPropagation();

    setEditingAddressObj(address);
    setForm({
      houseBuilding: address.houseBuilding || "",
      streetLocality: address.streetLocality || "",
      landmark: address.landmark || "",
      pincode: address.pincode || "",
      cityState: address.cityState || "",
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      mobile: address.mobile || "",
    });

    setAddressType(address.addressType || "Home");
    setIsDefault(Boolean(address.isDefault));
    setSelectedId(address._id);
    setShowForm(true);
  };

  const handleAddNewFromList = () => {
    setEditingAddressObj(null);
    setForm(initialForm);
    setAddressType("Home");
    setIsDefault(false);
    setDetectingLocation(false);
    setLocationDetected(false);
    setShowForm(true);
  };

  if (!isOpen) return null;

  return (
    <div className="address-drawer-overlay">
      <div className={`address-drawer ${showForm ? "form-drawer" : ""}`}>
        <div className="address-drawer-header">
          <button
            type="button"
            className="address-drawer-back"
            onClick={handleBack}
          >
            <FiArrowLeft />
          </button>

          <h2>
            {showForm
              ? editingAddressObj?._id
                ? "Edit Address"
                : "Add New Address"
              : "Edit Address"}
          </h2>

          <div className="address-drawer-header-space" />
        </div>

        {!showForm ? (
          <>
            <div className="address-drawer-content">
              {loadingAddresses ? (
                <div className="address-loading">Loading addresses...</div>
              ) : addresses.length === 0 ? (
                <div className="address-empty-state">
                  <div className="address-empty-icon">
                    <div className="address-map-circle">
                      <FiMapPin />
                    </div>
                  </div>

                  <div className="address-empty-text">
                    <h3>You haven't added any addresses yet.</h3>
                    <p>Add a new address to get started.</p>
                  </div>
                </div>
              ) : (
                <div className="saved-address-list">
                  {addresses.map((address) => {
                    const selected = selectedId === address._id;

                    return (
                      <div
                        key={address._id}
                        className={`saved-address-card ${
                          selected ? "selected" : ""
                        }`}
                        onClick={() => setSelectedId(address._id)}
                      >
                        <div className="saved-address-info">
                          <strong>
                            {(address.addressType || "HOME").toUpperCase()}
                          </strong>

                          <p>
                            {address.houseBuilding}, {address.streetLocality}
                            {address.landmark ? `, ${address.landmark}` : ""},{" "}
                            {address.cityState}, {address.pincode}
                          </p>
                        </div>

                        <div className="saved-address-actions">
                          <button
                            type="button"
                            className="address-edit-btn"
                            title="Edit Address"
                            onClick={(e) => handleEdit(e, address)}
                          >
                            <FiEdit2 />
                          </button>

                          <span
                            className={`address-selected-check ${
                              selected ? "active" : ""
                            }`}
                          >
                            <FiCheck />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="address-drawer-footer">
              {addresses.length === 0 ? (
                <button
                  type="button"
                  className="address-add-btn"
                  onClick={handleAddNewFromList}
                >
                  Add a new address
                </button>
              ) : (
                <button
                  type="button"
                  className="address-add-btn"
                  onClick={handleConfirm}
                >
                  Confirm Selection
                </button>
              )}
            </div>
          </>
        ) : (
          <form className="address-form" onSubmit={handleSave}>
            <div className="address-form-content">
              <div className="address-form-section">
                <div className="address-section-header-row">
                  <h3>Address details</h3>
                  <button
                    type="button"
                    className={`btn-current-location ${
                      detectingLocation
                        ? "loading"
                        : locationDetected
                        ? "detected"
                        : ""
                    }`}
                    onClick={handleUseCurrentLocation}
                    disabled={detectingLocation}
                    title="Detect and fill address from current GPS location"
                  >
                    {detectingLocation ? (
                      <>
                        <span className="location-btn-spinner" />
                        <span>📍 Detecting your location...</span>
                      </>
                    ) : locationDetected ? (
                      <>
                        <FiCheck className="location-btn-icon detected" />
                        <span>✓ Location detected</span>
                      </>
                    ) : (
                      <>
                        <FiMapPin className="location-btn-icon" />
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                {accuracyNotice && (
                  <div className="location-accuracy-notice">
                    <div className="location-notice-content">
                      <span className="location-notice-icon">⚠️</span>
                      <div className="location-notice-texts">
                        <span className="location-notice-msg">{accuracyNotice}</span>
                        <span className="location-notice-hint">
                          Tip: Entering your 6-digit Pincode will automatically set your City & State.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="location-notice-dismiss"
                      onClick={() => setAccuracyNotice(null)}
                      title="Dismiss notice"
                    >
                      <FiX />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  name="houseBuilding"
                  placeholder="House No / Building / Apartment*"
                  value={form.houseBuilding}
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="streetLocality"
                  placeholder="Street / Locality*"
                  value={form.streetLocality}
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="landmark"
                  placeholder="Landmark (optional)"
                  value={form.landmark}
                  onChange={handleChange}
                />

                <div className="address-form-row">
                  <input
                    type="text"
                    name="pincode"
                    placeholder="Pincode*"
                    value={form.pincode}
                    onChange={handleChange}
                    maxLength={6}
                    inputMode="numeric"
                  />

                  <input
                    type="text"
                    name="cityState"
                    placeholder="City / State*"
                    value={form.cityState}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="address-form-section">
                <h3>Save address as</h3>

                <div className="address-type">
                  {["Home", "Work", "Other"].map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={addressType === type ? "active" : ""}
                      onClick={() => setAddressType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="default-address">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />

                  <span>Make this my default address</span>
                </label>
              </div>

              <div className="address-form-section">
                <h3>Contact Details</h3>

                <div className="address-form-row">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First name*"
                    value={form.firstName}
                    onChange={handleChange}
                  />

                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last name*"
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>

                <div className="mobile-input">
                  <span>+91</span>

                  <input
                    type="tel"
                    name="mobile"
                    placeholder="Mobile number*"
                    value={form.mobile}
                    onChange={handleChange}
                    maxLength={10}
                    inputMode="numeric"
                  />

                  {form.mobile && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          mobile: "",
                        }))
                      }
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="address-save-footer">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingAddressObj?._id
                  ? "Update address"
                  : "Save address"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddressDrawer;
