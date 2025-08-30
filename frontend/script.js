document.addEventListener('DOMContentLoaded', function() {
    // --- UPGRADE: Define initial map state ---
    const INITIAL_CENTER = [20, 0];
    const INITIAL_ZOOM = 2.5;

    const map = L.map('map').setView(INITIAL_CENTER, INITIAL_ZOOM);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    // --- UPGRADE: Home Button Control -----
    L.Control.Home = L.Control.extend({
        onAdd: function(map) {
            const btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            btn.innerHTML = '&#127968;'; // Home emoji
            btn.title = 'Reset View';
            btn.onclick = function(e) {
                e.stopPropagation(); // prevent map click
                map.flyTo(INITIAL_CENTER, INITIAL_ZOOM);
            }
            return btn;
        },
        onRemove: function(map) {}
    });
    L.control.home = function(opts) { return new L.Control.Home(opts); }
    L.control.home({ position: 'topleft' }).addTo(map);
    // --- End of Upgrade ---

    const icons = {
        'IPv4': L.divIcon({ className: 'custom-div-icon marker-ipv4' }),
        'domain': L.divIcon({ className: 'custom-div-icon marker-domain' }),
        'URL': L.divIcon({ className: 'custom-div-icon marker-url' })
    };

    const markers = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50
    });

    let allIndicators = [];
    let currentPage = 1;
    const rowsPerPage = 100;
    let markerLookup = {};

    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    const svgIcons = {
        total: `<svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
        geo: `<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
        url: `<svg class="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>`,
        domain: `<svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9"></path></svg>`
    };

    fetchData();

    async function fetchData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`Network response error`);
            const data = await response.json();
            
            document.getElementById('last-updated').innerText = new Date(data.last_updated_utc).toLocaleString();
            allIndicators = data.indicators || [];

            renderStatsAndMap(allIndicators);
            renderTablePage();
        } catch (error) {
            console.error("Fetch/Parse Error:", error);
            document.getElementById('last-updated').innerText = "Failed to load data.";
        }
    }

    function renderStatsAndMap(indicators) {
        document.getElementById('total-indicators').innerText = indicators.length;
        document.getElementById('geolocated-iocs').innerText = indicators.filter(ind => ind.geo).length;
        document.getElementById('malicious-urls').innerText = indicators.filter(ind => ind.type === 'URL').length;
        document.getElementById('malicious-domains').innerText = indicators.filter(ind => ind.type === 'domain').length;
        document.getElementById('total-indicators-icon').innerHTML = svgIcons.total;
        document.getElementById('geolocated-iocs-icon').innerHTML = svgIcons.geo;
        document.getElementById('malicious-urls-icon').innerHTML = svgIcons.url;
        document.getElementById('malicious-domains-icon').innerHTML = svgIcons.domain;

        markers.clearLayers();
        markerLookup = {};

        indicators.forEach((indicator) => {
            if (indicator.geo) {
                const icon = icons[indicator.type] || icons['IPv4'];
                const marker = L.marker([indicator.geo.lat, indicator.geo.lon], { icon: icon });
                
                const popupContent = `<b>${indicator.type}:</b> ${escapeHtml(indicator.value)}<br><b>Location:</b> ${indicator.geo.city || 'N/A'}, ${indicator.geo.country || 'N/A'}<br><b>Source:</b> ${indicator.source}<br><b>Description:</b> ${escapeHtml(indicator.description || 'N/A')}`;
                marker.bindPopup(popupContent);
                
                marker.on('click', () => highlightTableRow(indicator.value));
                markerLookup[indicator.value] = marker;

                markers.addLayer(marker);
            }
        });
        map.addLayer(markers);
    }

    function renderTablePage() {
        if (!Array.isArray(allIndicators)) return;
        const tableBody = document.getElementById('indicators-table-body');
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedIndicators = allIndicators.slice(start, end);

        paginatedIndicators.forEach(indicator => {
            if (!indicator) return;
            const row = tableBody.insertRow();
            row.className = 'bg-gray-800/50 border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors duration-150';
            row.dataset.indicatorValue = indicator.value;

            if (indicator.geo) {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    const marker = markerLookup[indicator.value];
                    if (marker) {
                        markers.zoomToShowLayer(marker, () => {
                            marker.openPopup();
                        });
                    }
                    highlightTableRow(indicator.value);
                });
            }

            const typeClass = indicator.type === 'IPv4' ? 'text-red-400' : (indicator.type === 'URL' ? 'text-yellow-400' : 'text-blue-400');
            row.innerHTML = `<td class="px-4 py-2 font-medium ${typeClass}">${indicator.type || 'N/A'}</td><td class="px-4 py-2 font-mono text-xs break-all">${escapeHtml(indicator.value)}</td><td class="px-4 py-2">${indicator.source || 'N/A'}</td><td class="px-4 py-2">${escapeHtml(indicator.description || 'N/A')}</td>`;
        });
        updatePaginationControls();
    }

    function highlightTableRow(indicatorValue) {
        document.querySelectorAll('.highlight-row').forEach(r => r.classList.remove('highlight-row'));
        try {
            const rowToHighlight = document.querySelector(`[data-indicator-value="${CSS.escape(indicatorValue)}"]`);
            if (rowToHighlight) {
                rowToHighlight.classList.add('highlight-row');
                rowToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.error("Could not highlight row:", e);
        }
    }

    function updatePaginationControls() {
        if (!Array.isArray(allIndicators)) return;
        const totalPages = Math.ceil(allIndicators.length / rowsPerPage) || 1;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages;
    }

    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTablePage(); } });
    nextButton.addEventListener('click', () => { if (currentPage < Math.ceil(allIndicators.length / rowsPerPage)) { currentPage++; renderTablePage(); } });
    
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});