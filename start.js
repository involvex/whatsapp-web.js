#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting WhatsApp AI Web App...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.log('⚠️  .env file not found. Creating from template...');
    if (fs.existsSync('env.example')) {
        fs.copyFileSync('env.example', '.env');
        console.log('✅ Created .env file from template');
        console.log('📝 Please edit .env file and add your GEMINI_API_KEY\n');
    } else {
        console.log(
            '❌ env.example file not found. Please create .env file manually.',
        );
        process.exit(1);
    }
}

// Check if data directory exists
if (!fs.existsSync('data')) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync('data', { recursive: true });
    console.log('✅ Data directory created');
}

// Check if public directory exists
if (!fs.existsSync('public')) {
    console.log(
        '❌ Public directory not found. Please ensure all files are in place.',
    );
    process.exit(1);
}

// Check for required environment variables
require('dotenv').config();

if (
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY === 'your_gemini_api_key_here'
) {
    console.log('❌ GEMINI_API_KEY not set in .env file');
    console.log('📝 Please edit .env file and add your Gemini API key');
    console.log(
        '🔗 Get your API key from: https://makersuite.google.com/app/apikey\n',
    );
    process.exit(1);
}

console.log('✅ Environment configuration valid');
console.log('🌐 Starting server...\n');

// Start the application
const app = spawn('node', ['app.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
});

app.on('error', (err) => {
    console.error('❌ Failed to start application:', err);
    process.exit(1);
});

app.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ Application exited with code ${code}`);
        process.exit(code);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    app.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    app.kill('SIGTERM');
    process.exit(0);
});
