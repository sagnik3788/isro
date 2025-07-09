// src/SimpleMapComponent.jsx
import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const AreaSelector = ({ onAreaSelect, selectedBounds, onClearSelection, selectionMode }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [tempBounds, setTempBounds] = useState(null);
  const map = useMap();

  useMapEvents({
    mousedown: (e) => {
      if (selectionMode === 'drag') {
        e.originalEvent.preventDefault();
        setIsSelecting(true);
        setStartPoint([e.latlng.lat, e.latlng.lng]);
        setTempBounds(null);
        map.dragging.disable();
      }
    },
    
    mousemove: (e) => {
      if (isSelecting && startPoint && selectionMode === 'drag') {
        const currentPoint = [e.latlng.lat, e.latlng.lng];
        const bounds = [
          [Math.min(startPoint[0], currentPoint[0]), Math.min(startPoint[1], currentPoint[1])],
          [Math.max(startPoint[0], currentPoint[0]), Math.max(startPoint[1], currentPoint[1])]
        ];
        setTempBounds(bounds);
      }
    },
    
    mouseup: (e) => {
      if (isSelecting && startPoint && selectionMode === 'drag') {
        const endPoint = [e.latlng.lat, e.latlng.lng];
        
        const latDiff = Math.abs(startPoint[0] - endPoint[0]);
        const lngDiff = Math.abs(startPoint[1] - endPoint[1]);
        
        if (latDiff > 0.001 && lngDiff > 0.001) {
          createGeoJSONFromBounds(startPoint, endPoint);
        }
        
        setIsSelecting(false);
        setStartPoint(null);
        setTempBounds(null);
        map.dragging.enable();
      }
    },

    click: (e) => {
      if (selectionMode === 'preset') {
        const center = [e.latlng.lat, e.latlng.lng];
        createPresetArea(center, 0.05); // 0.05 degree square (~5km)
      }
    }
  });

  const createGeoJSONFromBounds = (start, end) => {
    const minLat = Math.min(start[0], end[0]);
    const maxLat = Math.max(start[0], end[0]);
    const minLng = Math.min(start[1], end[1]);
    const maxLng = Math.max(start[1], end[1]);
    
    const geoJSON = {
      type: "Polygon",
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ]]
    };
    
    onAreaSelect(geoJSON);
  };

  const createPresetArea = (center, size) => {
    const [lat, lng] = center;
    const halfSize = size / 2;
    
    const geoJSON = {
      type: "Polygon",
      coordinates: [[
        [lng - halfSize, lat - halfSize],
        [lng + halfSize, lat - halfSize],
        [lng + halfSize, lat + halfSize],
        [lng - halfSize, lat + halfSize],
        [lng - halfSize, lat - halfSize]
      ]]
    };
    
    onAreaSelect(geoJSON);
  };

  return (
    <>
      {tempBounds && (
        <Rectangle
          bounds={tempBounds}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1,
            dashArray: '5, 5'
          }}
        />
      )}
      
      {selectedBounds && !isSelecting && (
        <Rectangle
          bounds={selectedBounds}
          pathOptions={{
            color: '#3b82f6',
            weight: 3,
            opacity: 0.9,
            fillOpacity: 0.25,
            className: 'selected-area-highlight'
          }}
        />
      )}
    </>
  );
};

const SimpleMapComponent = ({ setAoi, aoi }) => {
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [selectionMode, setSelectionMode] = useState('drag');
  const [showCoordinateInput, setShowCoordinateInput] = useState(false);
  const [coordinateForm, setCoordinateForm] = useState({
    north: '',
    south: '',
    east: '',
    west: ''
  });

  const handleAreaSelect = (geoJSON) => {
    setAoi(geoJSON);
    const coords = geoJSON.coordinates[0];
    setSelectedBounds([
      [coords[0][1], coords[0][0]], // SW corner [lat, lng]
      [coords[2][1], coords[2][0]]  // NE corner [lat, lng]
    ]);
  };

  const clearSelection = () => {
    setAoi(null);
    setSelectedBounds(null);
  };

  const createAreaFromCoordinates = () => {
    const { north, south, east, west } = coordinateForm;
    if (!north || !south || !east || !west) return;

    const n = parseFloat(north);
    const s = parseFloat(south);
    const e = parseFloat(east);
    const w = parseFloat(west);

    if (isNaN(n) || isNaN(s) || isNaN(e) || isNaN(w)) return;

    const geoJSON = {
      type: "Polygon",
      coordinates: [[
        [w, s], [e, s], [e, n], [w, n], [w, s]
      ]]
    };

    handleAreaSelect(geoJSON);
    setShowCoordinateInput(false);
  };

  const createPresetArea = (sizeKm) => {
    // Create area around NYC center
    const centerLat = 40.7128;
    const centerLng = -74.0060;
    const sizeDeg = sizeKm / 111; // Rough conversion km to degrees

    const geoJSON = {
      type: "Polygon",
      coordinates: [[
        [centerLng - sizeDeg/2, centerLat - sizeDeg/2],
        [centerLng + sizeDeg/2, centerLat - sizeDeg/2],
        [centerLng + sizeDeg/2, centerLat + sizeDeg/2],
        [centerLng - sizeDeg/2, centerLat + sizeDeg/2],
        [centerLng - sizeDeg/2, centerLat - sizeDeg/2]
      ]]
    };

    handleAreaSelect(geoJSON);
  };

  return (
    <div className="map-wrapper">
      {/* Selection Mode Controls */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            className={`btn-${selectionMode === 'drag' ? 'primary' : 'secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            onClick={() => setSelectionMode('drag')}
          >
            🖱️ Click & Drag
          </button>
          <button 
            className={`btn-${selectionMode === 'preset' ? 'primary' : 'secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            onClick={() => setSelectionMode('preset')}
          >
            📍 Click for 5km Area
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            onClick={() => setShowCoordinateInput(!showCoordinateInput)}
          >
            🎯 Enter Coordinates
          </button>
        </div>

        {/* Quick Preset Areas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)', alignSelf: 'center' }}>Quick Areas:</span>
          <button 
            className="btn-secondary"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => createPresetArea(1)}
          >
            1km²
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => createPresetArea(5)}
          >
            5km²
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => createPresetArea(10)}
          >
            10km²
          </button>
          <button 
            className="btn-secondary"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => createPresetArea(25)}
          >
            25km²
          </button>
        </div>

        {/* Coordinate Input Form */}
        {showCoordinateInput && (
          <div style={{ 
            padding: '1rem', 
            background: 'white', 
            border: '1px solid var(--gray-300)', 
            borderRadius: 'var(--border-radius-sm)',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Enter Bounding Box Coordinates</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>North (Lat)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  placeholder="40.8"
                  value={coordinateForm.north}
                  onChange={(e) => setCoordinateForm({...coordinateForm, north: e.target.value})}
                  style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>South (Lat)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  placeholder="40.6"
                  value={coordinateForm.south}
                  onChange={(e) => setCoordinateForm({...coordinateForm, south: e.target.value})}
                  style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>East (Lng)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  placeholder="-73.9"
                  value={coordinateForm.east}
                  onChange={(e) => setCoordinateForm({...coordinateForm, east: e.target.value})}
                  style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>West (Lng)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  placeholder="-74.1"
                  value={coordinateForm.west}
                  onChange={(e) => setCoordinateForm({...coordinateForm, west: e.target.value})}
                  style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={createAreaFromCoordinates}
              >
                Create Area
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setShowCoordinateInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <MapContainer 
        center={[40.7128, -74.0060]}
        zoom={10}
        style={{ 
          height: '500px', 
          width: '100%', 
          cursor: selectionMode === 'drag' ? 'crosshair' : 'pointer'
        }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={18}
        />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          opacity={0.3}
        />

        <AreaSelector 
          onAreaSelect={handleAreaSelect}
          selectedBounds={selectedBounds}
          onClearSelection={clearSelection}
          selectionMode={selectionMode}
        />
      </MapContainer>
      
      {/* Enhanced instructions */}
      <div className="map-instructions">
        {!aoi ? (
          <div>
            {selectionMode === 'drag' && (
              <div className="instruction-item">
                <span className="instruction-icon">🖱️</span>
                <strong>Click and drag</strong> on the map to select a rectangular area
              </div>
            )}
            {selectionMode === 'preset' && (
              <div className="instruction-item">
                <span className="instruction-icon">📍</span>
                <strong>Click anywhere</strong> on the map to create a 5km × 5km analysis area
              </div>
            )}
            <div className="instruction-item">
              <span className="instruction-icon">⚡</span>
              Use <strong>Quick Areas</strong> buttons for common sizes, or enter exact coordinates
            </div>
          </div>
        ) : (
          <div className="instruction-item success">
            <span className="instruction-icon">✅</span>
            <strong>Area selected!</strong> {Math.round(((selectedBounds[1][0] - selectedBounds[0][0]) * (selectedBounds[1][1] - selectedBounds[0][1])) * 12100)} km² ready for analysis
            <button 
              className="btn-secondary" 
              style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              onClick={clearSelection}
            >
              Clear & Reselect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleMapComponent; 