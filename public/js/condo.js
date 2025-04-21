let map;
let originalApiResponse = null; // Store the original API response
let priceRange = { min: 500, max: 5000 };
let currentInfoWindow = null;
let searchBox; // For the Places search box

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
  const filtersPanel = document.querySelector('.filters-panel');
  filtersPanel.innerHTML = '';

  filtersPanel.innerHTML = `
    <h2>FILTER PROPERTIES</h2>

    <!-- Search Bar -->
    <div class="search-section">
      <input type="text" 
             autocomplete="off" 
             aria-autocomplete="list" 
             class="search-input" 
             placeholder="Search for locations..." 
             id="propertySearch">
    </div>
    
    <!-- Price Range Slider -->
    <div class="filter-section">
      <h4>Rent</h4>
      <div class="price-slider-container">
        <div class="price-slider-wrapper">
          <div class="price-slider">
            <div class="slider-bar"></div>
            <div class="slider-track"></div>
            <div class="slider-handle min-handle" tabindex="0">-</div>
            <div class="slider-handle max-handle" tabindex="0">+</div>
          </div>
        </div>
        <div class="price-inputs">
          <input type="number" id="minPrice" value="500" min="500" max="5000">
          <span>to</span>
          <input type="number" id="maxPrice" value="5000" min="500" max="5000">
        </div>
      </div>
    </div>
    
    <!-- Beds, Baths & Size Filter -->
    <div class="filter-section">
      <div class="filter-columns">
        <!-- Beds Column -->
        <div class="filter-column">
          <h4>Beds</h4>
          <div class="filter-options">
            <button class="filter-option active" data-beds="any">Any</button>
            <button class="filter-option" data-beds="0">Studio</button>
            <button class="filter-option" data-beds="1">1BD</button>
            <button class="filter-option" data-beds="1.5">1+1BD</button>
            <button class="filter-option" data-beds="2">2BD</button>
            <button class="filter-option" data-beds="2.5">2+1BD</button>
            <button class="filter-option" data-beds="3">3BD+</button>
          </div>
        </div>
        
        <!-- Baths Column -->
        <div class="filter-column">
          <h4>Baths</h4>
          <div class="bath-controls">
            <button class="bath-minus">-</button>
            <div class="bath-value">Any</div>
            <button class="bath-plus">+</button>
          </div>
        </div>
        
        <!-- Size Column -->
        <div class="filter-column">
          <h4>Size (ft²)</h4>
          <div class="size-controls">
            <input type="range" id="sizeSlider" min="300" max="5000" value="300" class="size-slider">
            <div class="size-value">
              <span>Min:</span>
              <span id="sizeValue">300</span>
              <span>ft²</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="filter-actions">
      <button id="cancelFilters" class="filter-button secondary">Cancel</button>
      <button id="applyFilters" class="filter-button primary">Apply</button>
    </div>
  `;

  // Initialize the search box
  initSearchBox();

  // Initialize price range slider (custom dual-handle)
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  const minHandle = document.querySelector('.min-handle');
  const maxHandle = document.querySelector('.max-handle');
  const sliderTrack = document.querySelector('.slider-track');

  function updatePriceSlider() {
    const minPercent = ((priceRange.min - 500) / (5000 - 500)) * 100;
    const maxPercent = ((priceRange.max - 500) / (5000 - 500)) * 100;
    
    sliderTrack.style.left = `${minPercent}%`;
    sliderTrack.style.right = `${100 - maxPercent}%`;
    
    minHandle.style.left = `${minPercent}%`;
    maxHandle.style.left = `${maxPercent}%`;
    
    minPriceInput.value = priceRange.min;
    maxPriceInput.value = priceRange.max;
  }

  function handleSliderMove(handle, isMin) {
    return function(e) {
      e.preventDefault();
      const sliderRect = document.querySelector('.price-slider').getBoundingClientRect();
      const sliderWidth = sliderRect.width;
      let newX = e.clientX - sliderRect.left;
      newX = Math.max(0, Math.min(newX, sliderWidth));
      const percent = (newX / sliderWidth) * 100;
      const value = Math.round(500 + (percent / 100) * (5000 - 500));
      
      if (isMin) {
        if (value < priceRange.max - 100) {
          priceRange.min = value;
        }
      } else {
        if (value > priceRange.min + 100) {
          priceRange.max = value;
        }
      }
      
      updatePriceSlider();
    };
  }

  function handleSliderStart(handle, isMin) {
    return function(e) {
      e.preventDefault();
      const moveHandler = handleSliderMove(handle, isMin);
      const stopHandler = function() {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', stopHandler);
      };
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', stopHandler);
    };
  }

  minHandle.addEventListener('mousedown', handleSliderStart(minHandle, true));
  maxHandle.addEventListener('mousedown', handleSliderStart(maxHandle, false));

  minPriceInput.addEventListener('change', function() {
    const value = parseInt(this.value);
    if (!isNaN(value) && value >= 500 && value <= priceRange.max - 100) {
      priceRange.min = value;
      updatePriceSlider();
    }
  });

  maxPriceInput.addEventListener('change', function() {
    const value = parseInt(this.value);
    if (!isNaN(value) && value <= 5000 && value >= priceRange.min + 100) {
      priceRange.max = value;
      updatePriceSlider();
    }
  });

  updatePriceSlider();

  // Initialize beds filter
  document.querySelectorAll('[data-beds]').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelector('[data-beds].active')?.classList.remove('active');
      this.classList.add('active');
    });
  });

  // Initialize bath controls
  const bathValue = document.querySelector('.bath-value');
  const bathOptions = ['Any', '1', '2', '3', '3+'];
  let bathIndex = 0;

  document.querySelector('.bath-plus').addEventListener('click', () => {
    if (bathIndex < bathOptions.length - 1) {
      bathIndex++;
      bathValue.textContent = bathOptions[bathIndex];
    }
  });

  document.querySelector('.bath-minus').addEventListener('click', () => {
    if (bathIndex > 0) {
      bathIndex--;
      bathValue.textContent = bathOptions[bathIndex];
    }
  });

  // Initialize size slider
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValue = document.getElementById('sizeValue');
  sizeSlider.addEventListener('input', () => {
    sizeValue.textContent = sizeSlider.value;
  });

  // Apply filters button
  document.getElementById('applyFilters').addEventListener('click', async () => {
    await loadAndDisplayListings();
  });

  // Cancel filters button
  document.getElementById('cancelFilters').addEventListener('click', () => {
    // Reset price
    priceRange.min = 500;
    priceRange.max = 5000;
    updatePriceSlider();
    
    // Reset beds
    document.querySelector('[data-beds].active')?.classList.remove('active');
    document.querySelector('[data-beds="any"]').classList.add('active');
    
    // Reset baths
    bathIndex = 0;
    bathValue.textContent = 'Any';
    
    // Reset size
    sizeSlider.value = 300;
    sizeValue.textContent = '300';
    
    loadAndDisplayListings();
  });

  // Load listings immediately to show all markers by default
  loadAndDisplayListings();
}

function initSearchBox() {
  const input = document.getElementById('propertySearch');
  const searchBox = new google.maps.places.SearchBox(input);

  // Bias search results to map's current viewport
  map.addListener('bounds_changed', () => {
    searchBox.setBounds(map.getBounds());
  });

  searchBox.addListener('places_changed', () => {
    const places = searchBox.getPlaces();
    
    if (places.length === 0) return;

    // Clear existing condo markers (optional - remove if you want to keep them)
    clearMarkers();

    // Create a marker for the searched location
    places.forEach(place => {
      if (!place.geometry) return;

      new google.maps.Marker({
        map,
        position: place.geometry.location,
        title: place.name
      });

      // Zoom to the searched location
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(15);
      }
    });

    // Clear existing markers
    clearMarkers();

    // For each place, get the icon, name and location
    const bounds = new google.maps.LatLngBounds();
    places.forEach(place => {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }

      // Create a marker for each place
      const marker = new google.maps.Marker({
        map,
        title: place.name,
        position: place.geometry.location,
      });

      markers.push(marker);

      if (place.geometry.viewport) {
        // Only geocodes have viewport
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
  });
}

async function loadAndDisplayListings() {
  try {
    const listings = await fetchCondoListings();
    console.log("Complete Zillow API Response:", originalApiResponse);
    
    // Apply filters (will show all when defaults are set)
    const filteredListings = applyFilters(listings);
    console.log("Filtered listings:", filteredListings.length);
    
    // Clear existing markers
    clearMarkers();
    
    // Display filtered listings
    displayListings(filteredListings);
  } catch (error) {
    console.error("Error loading listings:", error);
  }
}

function applyFilters(listings) {
  // Get price range
  const minPrice = priceRange.min || 0;
  const maxPrice = priceRange.max || Infinity;
  
  // Get beds
  const bedsOption = document.querySelector('[data-beds].active');
  const minBedrooms = bedsOption.dataset.beds === 'any' ? null : parseFloat(bedsOption.dataset.beds);
  
  // Get baths
  const bathText = document.querySelector('.bath-value').textContent;
  const minBathrooms = bathText === 'Any' ? null : parseFloat(bathText);
  
  // Get size
  const minSize = parseInt(document.getElementById('sizeSlider').value) || 0;
  
  return listings.filter(listing => {
    // Price filter
    if (listing.price < minPrice || listing.price > maxPrice) {
      return false;
    }
    // Bedrooms filter
    if (minBedrooms !== null && (listing.bedrooms === undefined || listing.bedrooms < minBedrooms)) {
      return false;
    }
    // Bathrooms filter
    if (minBathrooms !== null && (listing.bathrooms === undefined || listing.bathrooms < minBathrooms)) {
      return false;
    }
    // Size filter
    if (minSize > 300 && (listing.livingArea === undefined || listing.livingArea < minSize)) {
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
        // Close the previous info window if one exists
        if (currentInfoWindow) {
          currentInfoWindow.close();
        }
        // Open the new info window and store reference
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
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