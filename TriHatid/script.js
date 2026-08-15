// GLOBAL STATE & CONTAINER VARIABLES
let map;
let pickupMarker = null;
let dropoffMarker = null;
let routeLine = null;
let pickupCoords = null;
let destinationCoords = null;
let selectionStep = 0; 

// Convert Map Clicks to Aklan Address
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',');
    }
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  } catch (error) {
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }
}

// ROUTE FETCHING VIA OSRM API 
async function drawRoadRoute(startCoords, endCoords) {
  if (routeLine) map.removeLayer(routeLine);

  const startLngLat = `${startCoords[1]},${startCoords[0]}`;
  const endLngLat = `${endCoords[1]},${endCoords[0]}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${startLngLat};${endLngLat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const routeCoordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);

      routeLine = L.polyline(routeCoordinates, {
        color: '#214329',
        weight: 5,
        dashArray: '8, 8'
      }).addTo(map);

      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
  } catch (error) {
    console.error("Failed to fetch road route:", error);
  }
}

// GEOCODING VIA NOMINATIM (STRICTLY RESTRICTED TO AKLAN)
async function searchLocation(query, type) {
  if (!query || query.trim() === "") return;
  const statusHint = document.getElementById('click-status');
  if (statusHint) statusHint.innerText = "Searching in Aklan...";

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
        pickupMarker._icon?.classList.add("pickup-style");
        pickupMarker.bindPopup("<b>Pickup:</b> " + displayName).openPopup();
        document.getElementById('pickup-input').value = displayName;
      } else if (type === 'destination') {
        destinationCoords = coords;
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker(coords).addTo(map);
        dropoffMarker._icon?.classList.add("pickup-style");
        dropoffMarker.bindPopup("<b>Destination:</b> " + displayName).openPopup();
        document.getElementById('destination-input').value = displayName;
      }

      if (pickupCoords && destinationCoords) {
        await drawRoadRoute(pickupCoords, destinationCoords);
        if (statusHint) statusHint.innerText = "Route ready! Click Request TriHatid.";
      } else {
        map.setView(coords, 16);
        if (statusHint) statusHint.innerText = "Location found in Aklan! Set next point.";
      }
    } else {
      alert("Location not found within Aklan. Please enter a valid municipality or landmark.");
      if (statusHint) statusHint.innerText = "Click map or type location in Aklan.";
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    if (statusHint) statusHint.innerText = "Error searching location.";
  }
}

// NAVIGATION VIEW SWITCHER
function switchView(viewName) {
  const views = ['home', 'history', 'profile'];
  views.forEach(v => {
    const viewEl = document.getElementById(`view-${v}`);
    const navEl = document.getElementById(`nav-${v}`);
    if (viewEl) viewEl.classList.remove('active');
    if (navEl) navEl.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
  
  if (viewName === 'home' && map) {
    setTimeout(() => map.invalidateSize(), 150);
  }
}

// INITIAL DOM HANDLER
document.addEventListener('DOMContentLoaded', () => {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return; 

  map = L.map('map', { zoomControl: false }).setView([11.5833, 122.4833], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 200);

  const statusHint = document.getElementById('click-status');
  const pickupInput = document.getElementById('pickup-input');
  const destinationInput = document.getElementById('destination-input');
  const gpsBtn = document.getElementById('gps-btn');
  const locationModal = document.getElementById('locationModal');
  const modalAllow = document.getElementById('modal-allow');
  const modalDeny = document.getElementById('modal-deny');
  const bookBtn = document.getElementById('book-btn');

  map.on('click', async function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (statusHint) statusHint.innerText = "Getting location name...";
    
    const placeName = await reverseGeocode(lat, lng);

    if (selectionStep === 0) {
      if (pickupMarker) map.removeLayer(pickupMarker);
      if (dropoffMarker) map.removeLayer(dropoffMarker);
      if (routeLine) map.removeLayer(routeLine);

      pickupCoords = [lat, lng];
      pickupMarker = L.marker(pickupCoords).addTo(map);
      pickupMarker._icon?.classList.add("pickup-style");
      pickupMarker.bindPopup(`<b>Pickup:</b> ${placeName}`).openPopup();
      if (pickupInput) pickupInput.value = placeName;
      if (destinationInput) destinationInput.value = "";
      if (statusHint) statusHint.innerText = "Great! Now click to set Destination.";
      selectionStep = 1;
    } else if (selectionStep === 1) {
      if (dropoffMarker) map.removeLayer(dropoffMarker);

      destinationCoords = [lat, lng];
      dropoffMarker = L.marker(destinationCoords).addTo(map);
      dropoffMarker._icon?.classList.add("pickup-style");
      dropoffMarker.bindPopup(`<b>Destination:</b> ${placeName}`).openPopup();
      if (destinationInput) destinationInput.value = placeName;

      await drawRoadRoute(pickupCoords, destinationCoords);
      if (statusHint) statusHint.innerText = "Locations set! Click map to reset.";
      selectionStep = 2;
    } else {
      if (pickupMarker) map.removeLayer(pickupMarker);
      if (dropoffMarker) map.removeLayer(dropoffMarker);
      if (routeLine) map.removeLayer(routeLine);

      if (pickupInput) pickupInput.value = "";
      if (destinationInput) destinationInput.value = "";
      if (statusHint) statusHint.innerText = "Click map or type location in Aklan.";
      selectionStep = 0;
    }
  });

  if (gpsBtn) {
    gpsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('locationModal');
      if (modal) {
        modal.style.display = 'flex';
      } else {
        alert("Modal element not found in DOM.");
      }
    });
  }

  if (modalDeny) {
    modalDeny.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('locationModal');
      if (modal) modal.style.display = 'none';
      if (statusHint) statusHint.innerText = "Location permission denied. Tap map to set pickup.";
    });
  }

  if (modalAllow) {
    modalAllow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('locationModal');
      if (modal) modal.style.display = 'none';
      executeSystemGeolocation();
    });
  }

  function executeSystemGeolocation() {
    if (!navigator.geolocation) {
      alert('Geolocation feature not supported by this browser runtime environment.');
      return;
    }
    if (statusHint) statusHint.innerText = "Locating your GPS position...";
    if (gpsBtn) gpsBtn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        pickupCoords = [lat, lng];
        const placeName = await reverseGeocode(lat, lng);

        if (pickupMarker) map.removeLayer(pickupMarker);
        if (routeLine) map.removeLayer(routeLine);

        pickupMarker = L.marker(pickupCoords).addTo(map);
        pickupMarker._icon?.classList.add("pickup-style");
        pickupMarker.bindPopup(`<b>Your Location:</b> ${placeName}`).openPopup();
        map.setView(pickupCoords, 16);

        if (pickupInput) pickupInput.value = placeName;
        if (gpsBtn) gpsBtn.textContent = 'Use My Current Location';
        if (statusHint) statusHint.innerText = "Current location set! Select destination.";
        selectionStep = 1;
      },
      (err) => {
        alert('Location data fetch permission denied or timed out.');
        if (gpsBtn) gpsBtn.textContent = 'Use My Current Location';
        if (statusHint) statusHint.innerText = "GPS error. Tap map to set pickup.";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (bookBtn) {
    bookBtn.addEventListener('click', () => {
      if (!pickupCoords || !destinationCoords) {
        alert("Please set both Pickup and Destination points first.");
        return;
      }
      const title = document.getElementById('booking-title');
      if (title) title.textContent = 'Searching...';
      if (statusHint) statusHint.textContent = 'Finding close drivers in your local area...';
      bookBtn.textContent = 'Connecting...';
      bookBtn.disabled = true;

      setTimeout(() => {
        localStorage.setItem('trihatid_booking_state', 'searching');
        window.location.href = 'searching.html';
      }, 1000);
    });
  }
});