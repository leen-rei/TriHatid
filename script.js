// ===================================================
// 1. INITIALIZE MAP (Centered on Aklan)
// ===================================================
const map = L.map('map', {
  zoomControl: false 
}).setView([11.5833, 122.4833], 13); // Default view set to Batan, Aklan

// Load Map Tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Variables to track markers and route
let pickupMarker = null;
let dropoffMarker = null;
let routeLine = null;

let pickupCoords = null;
let destinationCoords = null;

// Track selection state for clicks: 0 = set pickup, 1 = set destination, 2 = reset
let selectionStep = 0;

// Target UI Elements from HTML
const statusHint = document.getElementById('click-status');
const pickupInput = document.getElementById('pickup-input');
const destinationInput = document.getElementById('destination-input');
const bookBtn = document.getElementById('book-btn');
const notif = document.getElementById('app-notification');

// GPS & Permission Modal UI Elements (Updated to match home.html)
const gpsBtn = document.getElementById('gps-btn');
const locationModal = document.getElementById('locationModal');
const permAllowBtn = locationModal ? locationModal.querySelector('.btn-primary') : null;
const permDenyBtn = locationModal ? locationModal.querySelector('.btn-secondary') : null;

// ===================================================
// REVERSE GEOCODING (Convert Map Clicks to Aklan Address)
// ===================================================
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.display_name.split(',').slice(0, 3).join(',');
  } catch (error) {
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }
}

// ===================================================
// 2. MAP CLICK EVENT LISTENER
// ===================================================
map.on('click', async function(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  statusHint.innerText = "Getting location name...";
  const placeName = await reverseGeocode(lat, lng);

  if (selectionStep === 0) {
    // Set Pickup Location
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    if (routeLine) map.removeLayer(routeLine);

    pickupCoords = [lat, lng];
    pickupMarker = L.marker(pickupCoords).addTo(map);
    pickupMarker.bindPopup(`<b>Pickup:</b> ${placeName}`).openPopup();

    pickupInput.value = placeName;
    destinationInput.value = "";
    
    statusHint.innerText = "Great! Now click to set Destination.";
    selectionStep = 1;

  } else if (selectionStep === 1) {
    // Set Destination Location
    if (dropoffMarker) map.removeLayer(dropoffMarker);

    destinationCoords = [lat, lng];
    dropoffMarker = L.marker(destinationCoords).addTo(map);
    dropoffMarker.bindPopup(`<b>Destination:</b> ${placeName}`).openPopup();

    destinationInput.value = placeName;

    // Draw route line
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline([pickupCoords, destinationCoords], {
      color: '#005580',
      weight: 5,
      dashArray: '8, 8'
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    statusHint.innerText = "Locations set! Click map to reset.";
    selectionStep = 2;

  } else {
    // Reset on third click
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    if (routeLine) map.removeLayer(routeLine);

    pickupInput.value = "";
    destinationInput.value = "";
    statusHint.innerText = "Click map or type location in Aklan.";
    selectionStep = 0;
  }
});

// ===================================================
// 3. GEOCODING (STRICTLY RESTRICTED TO AKLAN)
// ===================================================
async function searchLocation(query, type) {
  if (!query || query.trim() === "") return;

  statusHint.innerText = "Searching in Aklan...";

  // Aklan Geographical Bounding Box
  const aklanViewbox = "121.80,11.35,122.60,11.95";
  const localQuery = `${query}, Aklan, Philippines`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(localQuery)}&countrycodes=ph&viewbox=${aklanViewbox}&bounded=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const coords = [lat, lon];
      const displayName = data[0].display_name.split(',').slice(0, 3).join(',');

      if (type === 'pickup') {
        pickupCoords = coords;
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker(coords).addTo(map);
        pickupMarker.bindPopup("<b>Pickup:</b> " + displayName).openPopup();
        pickupInput.value = displayName;
      } else if (type === 'destination') {
        destinationCoords = coords;
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker(coords).addTo(map);
        dropoffMarker.bindPopup("<b>Destination:</b> " + displayName).openPopup();
        destinationInput.value = displayName;
      }

      // Draw route if both locations exist
      if (pickupCoords && destinationCoords) {
        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline([pickupCoords, destinationCoords], {
          color: '#005580',
          weight: 5,
          dashArray: '8, 8'
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        statusHint.innerText = "Route ready! Click Request TriHatid.";
      } else {
        map.setView(coords, 16);
        statusHint.innerText = "Location found in Aklan! Set next point.";
      }
    } else {
      alert("Location not found within Aklan. Please enter a valid Aklan landmark, barangay, or municipality.");
      statusHint.innerText = "Click map or type location in Aklan.";
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    statusHint.innerText = "Error searching location.";
  }
}

// Listen for 'Enter' key presses on inputs
pickupInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchLocation(pickupInput.value, 'pickup');
  }
});

destinationInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchLocation(destinationInput.value, 'destination');
  }
});

// ===================================================
// 4. BOOKING BUTTON CLICK
// ===================================================
bookBtn.addEventListener('click', function() {
  if (!pickupCoords || !destinationCoords) {
    alert("Please set both Pickup and Destination points first.");
    return;
  }

  bookBtn.innerText = "Searching for driver...";
  bookBtn.style.backgroundColor = "#e67e22";

  setTimeout(function() {
    bookBtn.innerText = "Driver Matched!";
    bookBtn.style.backgroundColor = "#27ae60";

    notif.classList.add('show');

    setTimeout(function() {
      notif.classList.remove('show');
    }, 4000);
  }, 2000);
});

// ===================================================
// 5. GPS & IN-APP PERMISSION MODAL FLOW
// ===================================================

// Step 1: Open the modal overlay when "Use My Current Location" button is clicked
if (gpsBtn && locationModal) {
  gpsBtn.addEventListener('click', function() {
    locationModal.classList.add('active');
  });
}

// Step 2: Hide modal overlay if user clicks "Don't Allow"
if (permDenyBtn && locationModal) {
  permDenyBtn.addEventListener('click', function() {
    locationModal.classList.remove('active');
    statusHint.innerText = "Location permission denied. Tap map to set pickup.";
  });
}

// Step 3: Trigger Browser GPS when user clicks "Allow Access"
if (permAllowBtn && locationModal) {
  permAllowBtn.addEventListener('click', function() {
    locationModal.classList.remove('active');

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    statusHint.innerText = "Locating your GPS position...";
    gpsBtn.innerText = "Locating...";

    navigator.geolocation.getCurrentPosition(
      async function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        pickupCoords = [lat, lng];

        const placeName = await reverseGeocode(lat, lng);

        if (pickupMarker) map.removeLayer(pickupMarker);
        if (routeLine) map.removeLayer(routeLine);

        pickupMarker = L.marker(pickupCoords).addTo(map);
        pickupMarker.bindPopup(`<b>Your Location:</b> ${placeName}`).openPopup();

        map.setView(pickupCoords, 16);

        pickupInput.value = placeName;
        gpsBtn.innerText = "Use My Current Location";
        statusHint.innerText = "Current location set! Select destination.";
        
        selectionStep = 1;
      },
      function(error) {
        console.error("GPS Error:", error);
        gpsBtn.innerText = "Use My Current Location";
        statusHint.innerText = "GPS error. Tap map to set pickup.";
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}