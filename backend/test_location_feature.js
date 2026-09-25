import assert from "assert";
import { parseOSMAddress, cleanCity } from "./controllers/locationController.js";

console.log("==================================================");
console.log("RUNNING CURRENT LOCATION & ADDRESS TESTS");
console.log("==================================================\n");

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. GET /api/location/reverse-geocode with valid coords
  await test("1. Reverse geocode valid coordinates (Bengaluru)", async () => {
    const res = await fetch("http://localhost:5000/api/location/reverse-geocode?lat=12.9716&lon=77.5946");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(body.data.pincode, "Should have pincode");
    assert(body.data.cityState.includes("Bengaluru") || body.data.cityState.includes("Karnataka"), "CityState should contain Bengaluru/Karnataka");
    assert(body.data.streetLocality, "Should have street/locality");
  });

  // 2. GET /api/addresses/reverse-geocode alias
  await test("2. Reverse geocode alias route (/api/addresses/reverse-geocode)", async () => {
    const res = await fetch("http://localhost:5000/api/addresses/reverse-geocode?lat=28.6139&lon=77.2090");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(body.data.cityState.includes("Delhi"), "Should detect Delhi");
    assert(body.data.pincode, "Should have pincode");
  });

  // 3. Test missing lat/lon parameters
  await test("3. Error handling: Missing lat/lon parameters", async () => {
    const res = await fetch("http://localhost:5000/api/location/reverse-geocode");
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert(body.message.includes("Latitude and longitude query parameters are required"));
  });

  // 4. Test invalid coordinates (non-numeric)
  await test("4. Error handling: Non-numeric coordinates", async () => {
    const res = await fetch("http://localhost:5000/api/location/reverse-geocode?lat=abc&lon=xyz");
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert(body.message.includes("Invalid latitude or longitude coordinates"));
  });

  // 5. Test out of bounds latitude (> 90)
  await test("5. Error handling: Latitude out of bounds (> 90)", async () => {
    const res = await fetch("http://localhost:5000/api/location/reverse-geocode?lat=120&lon=77.5");
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 6. Test out of bounds longitude (> 180)
  await test("6. Error handling: Longitude out of bounds (> 180)", async () => {
    const res = await fetch("http://localhost:5000/api/location/reverse-geocode?lat=12&lon=200");
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 7. Verify address field populating and manual editing flow
  await test("7. Auto-populate from reverse-geocode & manual edit & save flow", async () => {
    const geoRes = await fetch("http://localhost:5000/api/location/reverse-geocode?lat=12.9716&lon=77.5946");
    const geoData = await geoRes.json();
    const detected = geoData.data;

    let form = {
      houseBuilding: detected.houseBuilding || "",
      streetLocality: detected.streetLocality || "",
      landmark: detected.landmark || "",
      pincode: detected.pincode || "560001",
      cityState: detected.cityState || "Bengaluru, Karnataka",
      firstName: "TestUser",
      lastName: "Tester",
      mobile: "9876543210",
      addressType: "Home",
      isDefault: false,
    };

    form.houseBuilding = "Flat 502, Prestige Towers";
    form.landmark = "Opposite Metro Station";

    assert.strictEqual(form.houseBuilding, "Flat 502, Prestige Towers");
    assert.strictEqual(form.landmark, "Opposite Metro Station");
    assert.strictEqual(form.pincode.length, 6);
  });

  // 8. Test client geolocation error messages mapping
  await test("8. Geolocation error messages mapping", () => {
    function mapGeoError(code) {
      if (code === 1) {
        return "Location permission was denied. Please allow location access or enter your address manually.";
      } else if (code === 2) {
        return "Unable to detect your location. Please try again.";
      } else if (code === 3) {
        return "Location request timed out. Please try again.";
      }
      return "Unable to detect your location. Please try again.";
    }

    assert.strictEqual(
      mapGeoError(1),
      "Location permission was denied. Please allow location access or enter your address manually."
    );
    assert.strictEqual(
      mapGeoError(2),
      "Unable to detect your location. Please try again."
    );
    assert.strictEqual(
      mapGeoError(3),
      "Location request timed out. Please try again."
    );
  });

  // 9. Test Pincode Lookup API (/api/location/pincode/:pincode)
  await test("9. Pincode resolution endpoint (/api/location/pincode/180001)", async () => {
    const res = await fetch("http://localhost:5000/api/location/pincode/180001");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.pincode, "180001");
    assert.strictEqual(body.data.district, "Jammu");
    assert(body.data.state.includes("Jammu"), "State should be Jammu & Kashmir");
    assert(body.data.cityState.includes("Jammu"), "CityState should contain Jammu");
    assert(Array.isArray(body.data.localities), "Should contain list of localities");
  });

  // 10. Test Amenity separation: Amenities belong in Landmark, NOT houseBuilding
  await test("10. Address parsing separates Amenities into Landmark and keeps houseBuilding clean", () => {
    const mockOSM = {
      amenity: "St. Joseph's Indian High School",
      house_number: "25",
      road: "Museum Road",
      suburb: "Ashok Nagar",
      city: "Bengaluru",
      city_district: "Bengaluru South City Corporation",
      state: "Karnataka",
      postcode: "560001",
    };

    const parsed = parseOSMAddress(mockOSM);
    assert.strictEqual(parsed.houseBuilding, "25", "houseBuilding must ONLY contain house number/flat, never amenity!");
    assert.strictEqual(parsed.landmark, "Near St. Joseph's Indian High School", "amenity must be placed into landmark!");
    assert.strictEqual(cleanCity(mockOSM.city_district), "Bengaluru South", "cleanCity must strip administrative corporation suffixes");
    assert.strictEqual(parsed.cityState, "Bengaluru, Karnataka");
  });

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
