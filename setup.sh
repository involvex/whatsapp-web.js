#!/bin/bash

echo "🚀 WhatsApp AI Web App Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "📥 Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install express socket.io qrcode @google/generative-ai cors helmet compression dotenv

# Install dev dependencies
echo "📦 Installing development dependencies..."
npm install -D nodemon

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created from template"
    else
        cat > .env << EOF
# WhatsApp AI Web Configuration
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
WHATSAPP_CLIENT_ID=whatsapp-ai-client
EOF
        echo "✅ .env file created"
    fi
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file and add your Gemini API key"
    echo "🔗 Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
fi

# Make start script executable
chmod +x start.js

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your GEMINI_API_KEY"
echo "2. Run: node start.js"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Scan QR code with WhatsApp to connect"
echo ""
echo "📚 For more information, see README-AI-APP.md"
