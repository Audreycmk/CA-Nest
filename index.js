require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Set Pug as the view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Serve static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/components', express.static(path.join(__dirname, 'components'))); // optional if you have components folder

// Route: Render the map page with Google Maps API key
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Google Maps Demo',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY // <-- from .env file
  });
});

const axios = require('axios'); // ← Make sure this is at the top

app.get('/api/condos', async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: "https://zillow-com1.p.rapidapi.com/searchByUrl",
      params: {
        url: "https://www.zillow.com/willowdale-east-toronto-on/rentals/?searchQueryState=%7B%22isMapVisible%22%3Atrue%2C%22mapBounds%22%3A%7B%22north%22%3A43.795031%2C%22south%22%3A43.743525%2C%22east%22%3A-79.365313%2C%22west%22%3A-79.437324%7D%2C%22filterState%22%3A%7B%22fr%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22mapZoom%22%3A14%7D"
      },
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "zillow-com1.p.rapidapi.com"
      }
    };

    const response = await axios.request(options);
    console.log("Zillow API response:", response.data); // Add this for debugging
    
    if (!response.data.props) {
      return res.status(500).json({ error: "Invalid data structure from Zillow API" });
    }

    const listings = response.data.props.map(item => ({
      addressStreet: item.addressStreet || "No address",
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      price: item.price,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      imgSrc: item.imgSrc || "https://via.placeholder.com/200",
      yearBuilt: item.yearBuilt
    })).filter(item => item.latitude && item.longitude); // Filter out items without coordinates

    res.json(listings);
  } catch (err) {
    console.error('Zillow API error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to fetch listings",
      details: err.response?.data || err.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
