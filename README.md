# EarthWatch AI - Satellite Change Detection Backend

A Node.js backend service that processes satellite imagery using Google Earth Engine to detect environmental changes.

## 🚀 Features

- **Google Earth Engine Integration**: Real-time satellite data processing
- **NDVI Analysis**: Vegetation index calculations
- **Time Series Analysis**: Change detection over time
- **RESTful API**: Clean endpoints for frontend integration
- **Error Handling**: Robust error management and recovery

## 📋 Prerequisites

- Node.js 18+ 
- Google Earth Engine account
- Google Cloud Platform service account

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Earth Engine Setup
1. Create a Google Cloud Platform project
2. Enable Earth Engine API
3. Create a service account and download the JSON key
4. Place the key as `service-account.json` in the root directory

### 3. Environment Variables
Create a `.env` file (optional for local development):
```env
NODE_ENV=development
PORT=5000
```

## 🚀 Deployment on Render

### Method 1: Using render.yaml (Recommended)

1. **Push to GitHub**: Upload your code to a GitHub repository
2. **Connect to Render**: 
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

### Method 2: Manual Setup

1. **Create New Web Service**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `earthwatch-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`

4. **Add Service Account**:
   - In Render dashboard, go to your service
   - Navigate to "Environment" tab
   - Add your Google Earth Engine service account JSON as an environment variable

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

### NDVI Analysis
```
POST /api/ndvi
Content-Type: application/json

{
  "aoi": {
    "type": "Polygon",
    "coordinates": [[[...]]]
  },
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### Time Series Analysis
```
POST /api/ndvi-timeseries
Content-Type: application/json

{
  "aoi": {
    "type": "Polygon", 
    "coordinates": [[[...]]]
  },
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

## 🔧 Development

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📊 Health Monitoring

The service includes a health check endpoint that reports:
- Service status
- GEE authentication status
- GEE initialization status
- Timestamp

## 🔒 Security

- CORS enabled for frontend integration
- Service account credentials secured
- Input validation on all endpoints
- Error handling without exposing sensitive data

## 🐛 Troubleshooting

### Common Issues

1. **GEE Authentication Failed**:
   - Check service account permissions
   - Verify Earth Engine API is enabled
   - Ensure service account JSON is valid

2. **No Satellite Data**:
   - Check area selection (too small areas may have no data)
   - Verify date range (ensure data exists for period)
   - Check cloud coverage (high cloud cover may filter out data)

3. **Render Deployment Issues**:
   - Verify all environment variables are set
   - Check build logs for dependency issues
   - Ensure service account JSON is properly configured

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review Render deployment logs
- Verify Google Earth Engine setup 