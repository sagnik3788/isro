const express = require('express');
const bodyParser = require('body-parser');
const ee = require('@google/earthengine');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const cors = require('cors');
app.use(cors({
  origin: ['https://isro-ui.netlify.app', 'http://localhost:3000']
}));

// Global flag to track GEE authentication status
let geeAuthenticated = false;
let geeInitialized = false;

// Load your service account key
let privateKey;
try {
  // Try to load from environment variable first (for Render deployment)
  if (process.env.GEE_SERVICE_ACCOUNT) {
    privateKey = JSON.parse(process.env.GEE_SERVICE_ACCOUNT);
    console.log('Service account key loaded from environment variable');
  } else {
    // Fallback to local file
    privateKey = require('./service-account.json');
    console.log('Service account key loaded from local file');
  }
} catch (error) {
  console.error('Failed to load service account key:', error.message);
  console.error('Please ensure GEE_SERVICE_ACCOUNT environment variable is set or service-account.json exists');
  process.exit(1);
}

// Improved GEE authentication with retry logic
const initializeGEE = async (retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    console.log(`Attempting GEE authentication (attempt ${retryCount + 1}/${maxRetries + 1})...`);
    
    // Authenticate with GEE
    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(privateKey, () => {
        console.log('GEE authentication successful');
        geeAuthenticated = true;
        resolve();
      }, (error) => {
        console.error('GEE authentication failed:', error.message);
        reject(error);
      });
    });

    // Initialize GEE
    await new Promise((resolve, reject) => {
      ee.initialize(null, null, () => {
        console.log('Earth Engine client initialized successfully');
        geeInitialized = true;
        resolve();
      }, (error) => {
        console.error('GEE initialization failed:', error.message);
        reject(error);
      });
    });

    console.log('✅ GEE setup completed successfully');
    
  } catch (error) {
    console.error(`❌ GEE setup failed (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds...`);
      setTimeout(() => initializeGEE(retryCount + 1), 5000);
    } else {
      console.error('❌ GEE setup failed after all retries. Server will run with limited functionality.');
    }
  }
};

// Start GEE initialization
initializeGEE();

// Helper function to check if GEE is ready
const isGEEReady = () => {
  return geeAuthenticated && geeInitialized;
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gee_authenticated: geeAuthenticated,
    gee_initialized: geeInitialized,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Example endpoint: receive AOI and return NDVI stats
app.post('/api/ndvi', async (req, res) => {
  try {
    const { aoi, startDate, endDate } = req.body;

    if (!isGEEReady()) {
      return res.status(503).json({ 
        error: 'Google Earth Engine is not ready. Please try again later.',
        gee_status: {
          authenticated: geeAuthenticated,
          initialized: geeInitialized
        }
      });
    }

    // Convert GeoJSON to EE geometry
    const geometry = ee.Geometry(aoi);

    // Get Sentinel-2 images
    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

    // Calculate median NDVI
    const ndvi = collection
      .map(img => img.normalizedDifference(['B8', 'B4']).rename('NDVI'))
      .median();

    // Reduce region to get mean NDVI
    const stats = await ndvi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: 10,
      maxPixels: 1e9
    }).getInfo();

    res.json({
      ndvi_mean: stats.NDVI,
      aoi: aoi
    });
  } catch (err) {
    console.error('Error in /api/ndvi:', err.message);
    res.status(500).json({ 
      error: 'Failed to process satellite data: ' + err.message,
      details: 'Please check your area selection and date range, then try again.'
    });
  }
});

app.post('/api/ndvi-timeseries', async (req, res) => {
  try {
    const { aoi, startDate, endDate } = req.body;

    if (!isGEEReady()) {
      return res.status(503).json({ 
        error: 'Google Earth Engine is not ready. Please try again later.',
        gee_status: {
          authenticated: geeAuthenticated,
          initialized: geeInitialized
        }
      });
    }

    const geometry = ee.Geometry(aoi);

    // Get Sentinel-2 images for the period
    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

    // Calculate NDVI for each image and get statistics
    const ndviCollection = collection.map(function(img) {
      const ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
      
      const stats = ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: 10,
        maxPixels: 1e9
      });
      
      // Return a Feature with the NDVI mean and date
      return ee.Feature(null, {
        'ndvi_mean': stats.get('NDVI'),
        'date': ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'),
        'timestamp': img.get('system:time_start')
      });
    });

    // Convert to a FeatureCollection and get the data
    const featureCollection = ee.FeatureCollection(ndviCollection);
    const results = await featureCollection.getInfo();

    // Format the results
    const timeseries = results.features.map(feature => ({
      date: feature.properties.date,
      ndvi_mean: feature.properties.ndvi_mean
    })).filter(item => item.ndvi_mean !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check if we have any data
    if (timeseries.length === 0) {
      return res.status(404).json({
        error: 'No satellite data found for the selected area and date range.',
        details: 'Try selecting a larger area or different date range.'
      });
    }

    // Generate summary statistics
    const ndviValues = timeseries.map(item => item.ndvi_mean).filter(val => val !== null);
    const meanNdvi = ndviValues.length > 0 ? ndviValues.reduce((a, b) => a + b, 0) / ndviValues.length : 0;
    
    // Simple change detection (comparing first half vs second half)
    const midPoint = Math.floor(ndviValues.length / 2);
    const firstHalf = ndviValues.slice(0, midPoint);
    const secondHalf = ndviValues.slice(midPoint);
    
    const firstHalfMean = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondHalfMean = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    
    const changeDetected = Math.abs(firstHalfMean - secondHalfMean) > 0.1;
    const confidence = Math.min(Math.abs(firstHalfMean - secondHalfMean) * 2, 1);

    res.json({
      aoi: aoi,
      ndvi_timeseries: timeseries,
      summary: {
        mean: meanNdvi,
        change_detected: changeDetected,
        confidence: confidence,
        total_observations: timeseries.length,
        date_range: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (err) {
    console.error('Error in /api/ndvi-timeseries:', err.message);
    res.status(500).json({ 
      error: 'Failed to process satellite time series data: ' + err.message,
      details: 'Please check your area selection and date range, then try again.'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 GEE Status: ${geeAuthenticated ? 'Authenticated' : 'Not Authenticated'}`);
});
