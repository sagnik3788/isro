// src/App.jsx
import React, { useState } from 'react';
import MapComponent from './MapComponent';
import SimpleMapComponent from './SimpleMapComponent';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

// Error Boundary Component
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-panel">
          <div className="error-icon">!</div>
          <div>
            <strong>Map features failed to load:</strong> {this.state.error?.message || 'Unknown error'}
            <br />
            <button 
              className="btn-secondary mt-4" 
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [selectedOption, setSelectedOption] = useState({ value: 'ndvi', label: 'NDVI (Vegetation Index)' });
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 3)));
  const [endDate, setEndDate] = useState(new Date());
  const [aoi, setAoi] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useAdvancedMap, setUseAdvancedMap] = useState(false); // Default to simple map

  const options = [
    { value: 'ndvi', label: 'NDVI (Vegetation Index)' },
    { value: 'ndbi', label: 'NDBI (Built-up Index)' },
    { value: 'mndwi', label: 'MNDWI (Water Index)' },
  ];

  const handleAnalyze = async () => {
    if (!aoi || !selectedOption) return;
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const res = await fetch('/api/ndvi-timeseries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aoi,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('API call failed:', err.message);
      setError(err.message);
    }
    setLoading(false);
  };

  const resetAnalysis = () => {
    setResult(null);
    setError('');
    setAoi(null);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">EW</div>
            <div>
              <h1 className="logo-text">EarthWatch AI</h1>
              <p className="logo-subtitle">Satellite Change Detection</p>
            </div>
          </div>
          <div className="header-actions">
            <div className="status-badge">
              <div className="status-dot"></div>
              System Online
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Control Panel */}
        <aside className="control-panel">
          <div className="panel-header">
            <h2 className="panel-title">Analysis Configuration</h2>
            <p className="panel-subtitle">Configure your satellite analysis parameters</p>
          </div>

          <div className="form-group">
            <label htmlFor="index-select">Spectral Index</label>
            <Select
              id="index-select"
              options={options}
              value={selectedOption}
              onChange={setSelectedOption}
              className="select-control"
              classNamePrefix="css"
              placeholder="Select an index..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-date">Start Date</label>
              <DatePicker
                id="start-date"
                selected={startDate}
                onChange={setStartDate}
                dateFormat="yyyy-MM-dd"
                maxDate={new Date()}
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={5}
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date">End Date</label>
              <DatePicker
                id="end-date"
                selected={endDate}
                onChange={setEndDate}
                dateFormat="yyyy-MM-dd"
                maxDate={new Date()}
                minDate={startDate}
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={5}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Area of Interest</label>
            <div className="text-sm text-gray-600">
              {aoi ? '✓ Area selected on map' : 'Select an area on the map to analyze'}
            </div>
          </div>

          <button 
            className={`analyze-btn ${loading ? 'loading' : ''}`}
            onClick={handleAnalyze} 
            disabled={!aoi || loading}
          >
            {loading ? 'Analyzing Satellite Data...' : 'Start Analysis'}
          </button>

          {aoi && (
            <button 
              className="btn-secondary w-full mt-4"
              onClick={resetAnalysis}
            >
              Reset & Start Over
            </button>
          )}
        </aside>

        {/* Map and Results Area */}
        <div className="map-results-area">
          {/* Map Container */}
          <section className="map-container">
            <div className="map-header">
              <h3 className="map-title">Interactive Map</h3>
              <div className="map-info">
                <div className="info-icon">i</div>
                {useAdvancedMap ? 
                  'Use drawing tools to create custom shapes' : 
                  'Professional area selection with multiple methods'
                }
              </div>
            </div>
            
            {/* Map Type Toggle */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className={`btn-${useAdvancedMap ? 'secondary' : 'primary'}`}
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: '600' }}
                onClick={() => setUseAdvancedMap(false)}
              >
                ⭐ Professional Selection
              </button>
              <button 
                className={`btn-${useAdvancedMap ? 'primary' : 'secondary'}`}
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: '600' }}
                onClick={() => setUseAdvancedMap(true)}
              >
                🧪 Advanced Drawing (Beta)
              </button>
            </div>
            
            {!useAdvancedMap && (
              <div style={{ 
                padding: '1rem', 
                background: 'linear-gradient(135deg, var(--green-50) 0%, var(--primary-50) 100%)', 
                border: '2px solid var(--primary-300)', 
                borderRadius: 'var(--border-radius)', 
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: 'var(--gray-700)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎯</span>
                  <strong style={{ color: 'var(--primary-700)' }}>SaaS-Grade Area Selection</strong>
                </div>
                <p style={{ margin: '0', lineHeight: '1.4' }}>
                  Multiple professional methods: Click & drag, preset areas (1-25km²), precise coordinates, or one-click 5km zones. 
                  Enterprise-ready with real-time area calculation.
                </p>
              </div>
            )}
            
            {useAdvancedMap && (
              <div style={{ 
                padding: '1rem', 
                background: 'var(--yellow-100)', 
                border: '1px solid var(--yellow-500)', 
                borderRadius: 'var(--border-radius-sm)', 
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: 'var(--gray-700)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <strong>Beta Drawing Tools</strong>
                </div>
                <p style={{ margin: '0', lineHeight: '1.4' }}>
                  Advanced polygon creation. May have compatibility issues with some browsers. 
                  For production use, we recommend the Professional Selection mode above.
                </p>
              </div>
            )}

            {/* Map Component */}
            {useAdvancedMap ? (
              <MapErrorBoundary>
                <MapComponent setAoi={setAoi} aoi={aoi} />
              </MapErrorBoundary>
            ) : (
              <SimpleMapComponent setAoi={setAoi} aoi={aoi} />
            )}
          </section>

          {/* Error Display */}
          {error && (
            <div className="error-panel">
              <div className="error-icon">!</div>
              <div>
                <strong>Analysis Error:</strong> {error}
                <br />
                <button 
                  className="btn-secondary mt-4" 
                  onClick={() => setError('')}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Results Panel */}
          {result && <ResultPanel result={result} selectedIndex={selectedOption} />}
        </div>
      </main>
    </div>
  );
}

function ResultPanel({ result, selectedIndex }) {
  const exportData = (format) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `change_detection_${selectedIndex.value}_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="result-panel">
      <div className="result-header">
        <h3 className="result-title">Analysis Results</h3>
        <div className="result-actions">
          <button className="btn-export" onClick={() => exportData('json')}>
            Export JSON
          </button>
          <button className="btn-export" onClick={() => exportData('csv')}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Time Series Chart */}
      {result.ndvi_timeseries && (
        <div className="chart-container">
          <h4 className="mb-4">
            {selectedIndex.label} Time Series Analysis
            {result.summary?.area_km2 && (
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 'normal', 
                color: 'var(--gray-600)', 
                marginLeft: '0.5rem' 
              }}>
                ({result.summary.area_km2} km²)
              </span>
            )}
          </h4>
          <TimeSeriesChart 
            data={result.ndvi_timeseries} 
            indexName={selectedIndex.label}
            indexKey="ndvi_mean"
          />
        </div>
      )}

      {/* Enhanced Summary Stats */}
      {result.summary && (
        <div className="summary-stats">
          <h4 className="mb-4">Summary Statistics</h4>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Mean {selectedIndex.label}</div>
              <div className="stat-value">{result.summary.mean?.toFixed(4) || 'N/A'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Change Detected</div>
              <div className="stat-value">{result.summary.change_detected ? '✅ Yes' : '❌ No'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confidence</div>
              <div className="stat-value">
                {result.summary.confidence ? `${(result.summary.confidence * 100).toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Observations</div>
              <div className="stat-value">{result.summary.total_observations || result.ndvi_timeseries?.length || 0}</div>
            </div>
            {result.summary.area_km2 && (
              <div className="stat-card">
                <div className="stat-label">Area Analyzed</div>
                <div className="stat-value">{result.summary.area_km2} km²</div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-label">Data Source</div>
              <div className="stat-value" style={{ fontSize: '0.875rem' }}>
                🛰️ Sentinel-2 Satellite
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw Data */}
      <details className="mt-4">
        <summary className="font-semibold text-gray-700 cursor-pointer mb-2">
          View Raw Satellite Data
        </summary>
        <pre className="json-display">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </section>
  );
}

function TimeSeriesChart({ data, indexName, indexKey }) {
  const formatTooltip = (value, name, props) => {
    return [value?.toFixed(4), indexName];
  };

  const formatXAxisLabel = (tickItem) => {
    return new Date(tickItem).toLocaleDateString();
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatXAxisLabel}
          stroke="var(--gray-400)"
          fontSize={12}
        />
        <YAxis 
          domain={['dataMin - 0.1', 'dataMax + 0.1']}
          stroke="var(--gray-400)"
          fontSize={12}
        />
        <Tooltip 
          formatter={formatTooltip}
          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid var(--gray-300)',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: 'var(--shadow)'
          }}
        />
        <Line 
          type="monotone" 
          dataKey={indexKey} 
          stroke="var(--primary-500)"
          strokeWidth={2}
          dot={{ fill: 'var(--primary-500)', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, stroke: 'var(--primary-600)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default App;
