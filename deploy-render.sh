#!/bin/bash

echo "🚀 EarthWatch AI Backend - Render Deployment Script"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if service account file exists
if [ ! -f "service-account.json" ]; then
    echo "⚠️  Warning: service-account.json not found!"
    echo "   You'll need to add this manually in Render dashboard"
    echo "   Go to Environment Variables and add:"
    echo "   Key: GEE_SERVICE_ACCOUNT"
    echo "   Value: [Your service account JSON content]"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please create it first."
    exit 1
fi

echo "✅ All files ready for deployment!"
echo ""
echo "📋 Next Steps:"
echo "1. Push your code to GitHub:"
echo "   git remote add origin <your-github-repo-url>"
echo "   git push -u origin main"
echo ""
echo "2. Deploy on Render:"
echo "   - Go to https://render.com"
echo "   - Click 'New +' → 'Blueprint'"
echo "   - Connect your GitHub repository"
echo "   - Render will auto-detect render.yaml"
echo ""
echo "3. Configure Environment Variables in Render:"
echo "   - NODE_ENV: production"
echo "   - PORT: 10000"
echo "   - GEE_SERVICE_ACCOUNT: [Your service account JSON]"
echo ""
echo "4. Update frontend API URL:"
echo "   Change localhost:5000 to your Render URL"
echo ""
echo "🎉 Your backend will be live at: https://your-app-name.onrender.com"

# Check if we can help with git setup
if ! git remote -v | grep -q origin; then
    echo ""
    echo "💡 Need help with GitHub setup?"
    echo "   Run these commands:"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
fi 