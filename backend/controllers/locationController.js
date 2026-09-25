/**
 * Location Controller
 * Handles reverse-geocoding coordinates to address details and postal pincode lookups
 */

export const cleanCity = (name) => {
  if (!name) return "";
  return name
    .replace(
      /\s*(City Corporation|Municipal Corporation|Municipality|District|district|Tahsil|Tehsil|Zone\s*\d+|Ward\s*\d+)\b/gi,
      ""
    )
    .trim();
};

export const parseOSMAddress = (addr, displayName = "") => {
  if (!addr) return {};

  // 1. House No / Building / Apartment (strictly residential / door numbers)
  const houseBuildingParts = [];
  if (addr.house_number) houseBuildingParts.push(addr.house_number);
  if (addr.apartment || addr.flat) houseBuildingParts.push(addr.apartment || addr.flat);
  // Only use building if it's not a generic POI / shop / office / amenity
  if (
    addr.building &&
    !addr.amenity &&
    !addr.shop &&
    !addr.office &&
    !addr.tourism &&
    !houseBuildingParts.includes(addr.building)
  ) {
    houseBuildingParts.push(addr.building);
  }
  const houseBuilding = houseBuildingParts.join(", ");

  // 2. Street / Locality
  const streetParts = [];
  if (addr.road) streetParts.push(addr.road);
  if (addr.neighbourhood && !streetParts.includes(addr.neighbourhood)) {
    streetParts.push(addr.neighbourhood);
  }
  if (addr.suburb && !streetParts.includes(addr.suburb)) {
    streetParts.push(addr.suburb);
  }
  if (addr.residential && !streetParts.includes(addr.residential)) {
    streetParts.push(addr.residential);
  }
  if (streetParts.length === 0 && (addr.locality || addr.subdistrict)) {
    streetParts.push(addr.locality || addr.subdistrict);
  }
  const streetLocality = streetParts.join(", ");

  // 3. Landmark (Amenities, shops, quarters, commercial complexes)
  let landmark = "";
  if (addr.landmark) {
    landmark = addr.landmark;
  } else if (addr.amenity) {
    landmark = `Near ${addr.amenity}`;
  } else if (addr.shop) {
    landmark = `Near ${addr.shop}`;
  } else if (addr.office) {
    landmark = `Near ${addr.office}`;
  } else if (addr.quarter) {
    landmark = `Near ${addr.quarter}`;
  } else if (addr.commercial || addr.industrial) {
    landmark = addr.commercial || addr.industrial;
  }

  // 4. Pincode
  let pincode = "";
  if (addr.postcode) {
    pincode = String(addr.postcode).replace(/\D/g, "").slice(0, 6);
  }

  // 5. City / State
  const rawCity =
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.village ||
    addr.city_district ||
    addr.subdistrict ||
    addr.county ||
    addr.state_district ||
    "";
  const city = cleanCity(rawCity);
  const state = addr.state || "";
  const cityStateParts = [];
  if (city) cityStateParts.push(city);
  if (state && state.toLowerCase() !== city.toLowerCase()) cityStateParts.push(state);
  const cityState = cityStateParts.join(", ");

  return {
    houseBuilding,
    streetLocality,
    landmark,
    pincode,
    cityState,
    city,
    state,
    formattedAddress: displayName || "",
  };
};

export const reverseGeocode = async (req, res) => {
  try {
    const lat = req.query.lat || req.query.latitude;
    const lon = req.query.lon || req.query.lng || req.query.longitude;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude query parameters are required",
      });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (
      isNaN(latNum) ||
      isNaN(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude coordinates",
      });
    }

    let parsedResult = null;

    // 1. Try Nominatim OpenStreetMap reverse geocoding API with zoom=18
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&addressdetails=1&zoom=18`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "DecathlonClone-Application/1.0 (support@decathlonclone.com)",
          "Accept-Language": "en",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          parsedResult = parseOSMAddress(data.address, data.display_name);
        }
      }
    } catch (osmErr) {
      console.warn("Nominatim reverse geocode error:", osmErr.message);
    }

    // 2. Fallback to BigDataCloud reverse geocode client if Nominatim didn't return address
    if (!parsedResult || !parsedResult.cityState) {
      try {
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latNum}&longitude=${lonNum}&localityLanguage=en`;
        const bdcController = new AbortController();
        const bdcTimeout = setTimeout(() => bdcController.abort(), 6000);

        const bdcResponse = await fetch(bdcUrl, {
          signal: bdcController.signal,
        }).finally(() => clearTimeout(bdcTimeout));

        if (bdcResponse.ok) {
          const bdcData = await bdcResponse.json();
          const city = cleanCity(bdcData.city || bdcData.locality || "");
          const state = bdcData.principalSubdivision || "";
          const cityStateParts = [];
          if (city) cityStateParts.push(city);
          if (state && state.toLowerCase() !== city.toLowerCase()) cityStateParts.push(state);

          parsedResult = {
            houseBuilding: "",
            streetLocality: bdcData.locality || "",
            landmark: "",
            pincode: bdcData.postcode ? String(bdcData.postcode).replace(/\D/g, "").slice(0, 6) : "",
            cityState: cityStateParts.join(", "),
            city,
            state,
            formattedAddress: `${city}, ${state}, ${bdcData.countryName || "India"}`.trim(),
          };
        }
      } catch (bdcErr) {
        console.warn("BigDataCloud fallback error:", bdcErr.message);
      }
    }

    if (!parsedResult) {
      return res.status(404).json({
        success: false,
        message: "Unable to find your address. Please enter it manually.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...parsedResult,
        latitude: latNum,
        longitude: lonNum,
      },
    });
  } catch (error) {
    console.error("Reverse Geocoding Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to find your address. Please enter it manually.",
      error: error.message,
    });
  }
};

export const lookupPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    const cleanPin = String(pincode || "").trim().replace(/\D/g, "");

    if (cleanPin.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 6-digit Indian pincode",
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response;
    try {
      response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Pincode service temporarily unavailable",
      });
    }

    const data = await response.json();
    if (!data || !Array.isArray(data) || data[0]?.Status !== "Success") {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }

    const postOffices = data[0].PostOffice || [];
    const firstPo = postOffices[0] || {};
    const district = firstPo.District || "";
    const state = firstPo.State || "";
    const cityState = district && state ? `${district}, ${state}` : district || state;

    const localities = [...new Set(postOffices.map((po) => po.Name).filter(Boolean))];

    return res.status(200).json({
      success: true,
      data: {
        pincode: cleanPin,
        district,
        state,
        cityState,
        localities,
      },
    });
  } catch (error) {
    console.error("Pincode Lookup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve pincode",
      error: error.message,
    });
  }
};
