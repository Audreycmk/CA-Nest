let map;
let originalApiResponse = null; // Store the original API response

async function initializeMap() {
  console.log("Initializing map...");
  const mapEl = document.getElementById("map");
  const loadingEl = document.getElementById("loading");

  if (!mapEl) {
    console.error("Map element not found.");
    return;
  }

  try {
    // Initialize map
    map = new google.maps.Map(mapEl, {
      center: { lat: 43.7615, lng: -79.4111 },
      zoom: 13,
      streetViewControl: false
    });

    // Create filter controls
    createFilterControls();

    // Fetch and display listings
    await loadAndDisplayListings();

  } catch (error) {
    console.error("Error:", error);
    if (loadingEl) {
      loadingEl.textContent = "Error loading data";
      loadingEl.style.color = "red";
    }
  } finally {
    if (loadingEl) {
      loadingEl.style.display = "none";
    }
  }
}

function createFilterControls() {
  // Get the existing filters-panel div instead of creating a new one
  const filtersPanel = document.querySelector('.filters-panel');
  
  // Clear any existing content (like the empty h2)
  filtersPanel.innerHTML = '';

  // Add your filter controls to the existing panel
  filtersPanel.innerHTML = `
    <h2>FILTER PROPERTIES</h2>
    <div class="filter-section">
      <label>Max Price: $</label>
      <input type="number" id="maxPrice" placeholder="No limit" class="filter-input">
    </div>
    <div class="filter-section">
      <label>Min Bedrooms:</label>
      <input type="number" id="minBedrooms" min="0" placeholder="Any" class="filter-input">
    </div>
    <div class="filter-section">
      <label>Min Bathrooms:</label>
      <input type="number" id="minBathrooms" min="0" step="0.5" placeholder="Any" class="filter-input">
    </div>
    <button id="applyFilters" class="filter-button">Apply Filters</button>
  `;

  // Add event listener for the apply button
  document.getElementById('applyFilters').addEventListener('click', async () => {
    await loadAndDisplayListings();
  });
}

async function loadAndDisplayListings() {
  const listings = await fetchCondoListings();
  
  // Log the complete original API response
  console.log("Complete Zillow API Response:", originalApiResponse);
  
  // Apply filters
  const filteredListings = applyFilters(listings);
  console.log("Filtered listings:", filteredListings.length);
  
  // Clear existing markers
  clearMarkers();
  
  // Display filtered listings
  displayListings(filteredListings);
}

function applyFilters(listings) {
  const maxPrice = document.getElementById('maxPrice').value;
  const minBedrooms = document.getElementById('minBedrooms').value;
  const minBathrooms = document.getElementById('minBathrooms').value;
  
  return listings.filter(listing => {
    // Price filter
    if (maxPrice && listing.price > parseInt(maxPrice)) {
      return false;
    }
    // Bedrooms filter
    if (minBedrooms && listing.bedrooms < parseInt(minBedrooms)) {
      return false;
    }
    // Bathrooms filter
    if (minBathrooms && listing.bathrooms < parseFloat(minBathrooms)) {
      return false;
    }
    return true;
  });
}

let markers = [];

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function displayListings(listings) {
  listings.forEach((listing) => {
    const lat = listing.latitude;
    const lng = listing.longitude;

    if (lat && lng) {
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: listing.addressStreet || "Condo Listing",
      });

      markers.push(marker);

      const infoWindowContent = generateInfoWindowContent(listing);
      const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });
    }
  });
}

function generateInfoWindowContent(listing) {
  return `
  <h2 class="info-window-title">
    ${listing.buildingName || listing.addressStreet || "Condo Building"}
  </h2>
  <div class="info-window-content">
    ${listing.price ? `<h3 class="info-window-content">$${listing.price.toLocaleString()}</h3>` : ''}
    <p class="info-window-content"><strong>Address:</strong> </br> ${listing.addressStreet || "N/A"}</p>
    ${(listing.bedrooms || listing.bathrooms) ? `
      <p class="info-window-content">
        ${listing.bedrooms ? `<strong>${listing.bedrooms}</strong> Bed` : ''}
        ${listing.bathrooms ? ` <strong>${listing.bathrooms}</strong> Bath` : ''}
      </p>
    ` : ''}
    ${listing.livingArea ? `<p class="info-window-content"><strong>Size:</strong> ${listing.livingArea} sqft</p>` : ''}
    ${listing.yearBuilt ? `<p class="info-window-content"><strong>Year Built:</strong> ${listing.yearBuilt}</p>` : ''}

  </div>
</div>

  `;
}

async function fetchCondoListings() {
  const options = {
    method: "GET",
    url: "https://zillow-com1.p.rapidapi.com/searchByUrl",
    params: {
      url: "https://www.zillow.com/willowdale-east-toronto-on/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A43.795031135365214%2C%22south%22%3A43.74352491061366%2C%22east%22%3A-79.36531252618408%2C%22west%22%3A-79.43732447381592%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsbo%22%3A%7B%22value%22%3Afalse%7D%2C%22nc%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%2C%22sf%22%3A%7B%22value%22%3Afalse%7D%2C%22tow%22%3A%7B%22value%22%3Afalse%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A14%2C%22usersSearchTerm%22%3A%22Willowdale%20East%2C%20Toronto%2C%20ON%22%2C%22regionSelection%22%3A%5B%7B%22regionId%22%3A796813%2C%22regionType%22%3A8%7D%5D%7D"
    },
    headers: {
      "x-rapidapi-key": "3e8e10294bmsh1433339305143dap154fa1jsn292fde323efc",
      "x-rapidapi-host": "zillow-com1.p.rapidapi.com"
    }
  };

  try {
    const response = await axios.request(options);
    originalApiResponse = response.data; // Store the complete original response
    
    // Return enhanced data structure with all available fields
    return (response.data.props || []).map((item) => ({
      // Basic info
      latitude: item.latitude,
      longitude: item.longitude,
      addressStreet: item.streetAddress || item.addressStreet || "No address",
      // buildingName: item.buildingName,
      
      // Pricing
      price: item.price,
      
      // Property details
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      livingArea: item.livingArea,
      yearBuilt: item.yearBuilt,
      // Additional fields from original response
      rawData: item // Include the complete original item data
    }));
  } catch (error) {
    console.error("Error fetching Zillow listings:", error);
    return [];
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.initMap = initializeMap;
  if (window.google && window.google.maps) {
    initializeMap();
  }
});