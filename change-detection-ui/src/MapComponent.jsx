// src/MapComponent.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DrawingHandler = ({ onAreaSelect, selectedArea, onClearArea }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  useMapEvents({
    click: (e) => {
      const newPoint = [e.latlng.lat, e.latlng.lng];
      
      if (!isDrawing) {
        // Start new polygon
        setIsDrawing(true);
        setCurrentPath([newPoint]);
      } else if (currentPath.length < 4) {
        // Add points until we have 4 (rectangle) or user double-clicks
        setCurrentPath([...currentPath, newPoint]);
        
        if (currentPath.length === 3) {
          // Complete the rectangle with 4th point
          const rect = [...currentPath, newPoint];
          completeArea(rect);
        }
      }
    },
    
    dblclick: (e) => {
      if (isDrawing && currentPath.length >= 3) {
        completeArea(currentPath);
      }
    }
  });

  const completeArea = (points) => {
    // Create GeoJSON polygon
    const coordinates = [points.map(point => [point[1], point[0]])]; // [lng, lat] for GeoJSON
    coordinates[0].push(coordinates[0][0]); // Close the polygon
    
    const geoJSON = {
      type: "Polygon",
      coordinates: coordinates
    };
    
    onAreaSelect(geoJSON);
    setIsDrawing(false);
    setCurrentPath([]);
  };

  return (
    <>
      {/* Show current drawing path */}
      {isDrawing && currentPath.length > 2 && (
        <Polygon
          positions={currentPath}
          pathOptions={{
            color: '#ff6b6b',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1,
            dashArray: '5, 5'
          }}
        />
      )}
      
      {/* Show selected area */}
      {selectedArea && (
        <Polygon
          positions={selectedArea.coordinates[0].map(coord => [coord[1], coord[0]])}
          pathOptions={{
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2
          }}
        />
      )}
    </>
  );
};

const MapComponent = ({ setAoi, aoi }) => {
  const handleAreaSelect = (geoJSON) => {
    setAoi(geoJSON);
  };

  const handleClearArea = () => {
    setAoi(null);
  };

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={[40.7128, -74.0060]}
        zoom={10}
        style={{ height: '500px', width: '100%' }}
      >
        {/* Satellite imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={18}
        />
        
        {/* Street overlay for reference */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          opacity={0.3}
        />

        <DrawingHandler 
          onAreaSelect={handleAreaSelect}
          selectedArea={aoi}
          onClearArea={handleClearArea}
        />
      </MapContainer>
      
      {/* Instructions */}
      <div className="map-instructions">
        {!aoi ? (
          <div>
            <div className="instruction-item">
              <span className="instruction-icon">📍</span>
              Click 4 points on the map to create a polygon area
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">💡</span>
              Or double-click after 3 points to complete the shape
            </div>
          </div>
        ) : (
          <div className="instruction-item success">
            <span className="instruction-icon">✅</span>
            Area selected! 
            <button 
              className="btn-secondary" 
              style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              onClick={handleClearArea}
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;
