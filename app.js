document.addEventListener('DOMContentLoaded', () => {

    const kaliboCoords = [11.7079, 122.3636]; 

    // Initialize map
    const map = L.map('map').setView(kaliboCoords, 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Add marker
    L.marker(kaliboCoords).addTo(map)
        .bindPopup("Pastrana Park, Kalibo")
        .openPopup();

    // 🔑 THE FIX: Force Leaflet to recalculate its container size after render
    setTimeout(() => {
        map.invalidateSize();
    }, 300);

});