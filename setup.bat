@echo off
echo 🚀 WhatsApp AI Web App Setup
echo ==========================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo 📥 Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

echo.
echo 📦 Installing dependencies...
npm install express socket.io qrcode @google/generative-ai cors helmet compression dotenv

echo 📦 Installing development dependencies...
npm install -D nodemon

echo.
echo 📁 Creating data directory...
if not exist data mkdir data

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    if exist env.example (
        copy env.example .env
        echo ✅ .env file created from template
    ) else (
        echo # WhatsApp AI Web Configuration > .env
        echo GEMINI_API_KEY=your_gemini_api_key_here >> .env
        echo PORT=3000 >> .env
        echo WHATSAPP_CLIENT_ID=whatsapp-ai-client >> .env
        echo ✅ .env file created
    )
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file and add your Gemini API key
    echo 🔗 Get your API key from: https://makersuite.google.com/app/apikey
    echo.
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file and add your GEMINI_API_KEY
echo 2. Run: node start.js
echo 3. Open http://localhost:3000 in your browser
echo 4. Scan QR code with WhatsApp to connect
echo.
echo 📚 For more information, see README-AI-APP.md
pause
