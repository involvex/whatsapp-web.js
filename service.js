#!/usr/bin/env node

/**
 * WhatsApp AI Service Management Script
 * Simple commands to start, stop, and manage the WhatsApp AI service
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServiceManager {
    constructor() {
        this.pidFile = path.join(__dirname, '.service.pid');
        this.logFile = path.join(__dirname, '.service.log');
    }

    start() {
        console.log('🚀 Starting WhatsApp AI Service...');

        if (this.isRunning()) {
            console.log('⚠️  Service is already running!');
            return;
        }

        const child = spawn('node', ['app.js'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            detached: false,
        });

        // Save PID
        fs.writeFileSync(this.pidFile, child.pid.toString());

        // Log output
        child.stdout.on('data', (data) => {
            console.log(data.toString());
            this.log(data.toString());
        });

        child.stderr.on('data', (data) => {
            console.error(data.toString());
            this.log('ERROR: ' + data.toString());
        });

        child.on('close', (code) => {
            console.log(`Service stopped with code ${code}`);
            this.cleanup();
        });

        console.log(`✅ Service started with PID: ${child.pid}`);
        console.log('📱 Access your WhatsApp AI at: http://localhost:3000');
        console.log('🌐 Network access: Check console for network IP');
    }

    stop() {
        console.log('🛑 Stopping WhatsApp AI Service...');

        if (!this.isRunning()) {
            console.log('⚠️  Service is not running!');
            return;
        }

        try {
            const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
            process.kill(pid, 'SIGTERM');
            console.log(`✅ Service stopped (PID: ${pid})`);
        } catch (error) {
            console.log('⚠️  Could not stop service gracefully, forcing...');
            exec('taskkill /F /IM node.exe', (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Error stopping service:', error.message);
                } else {
                    console.log('✅ Service force-stopped');
                }
            });
        }

        this.cleanup();
    }

    restart() {
        console.log('🔄 Restarting WhatsApp AI Service...');
        this.stop();
        setTimeout(() => {
            this.start();
        }, 2000);
    }

    status() {
        console.log('📊 WhatsApp AI Service Status:');
        console.log('================================');

        if (this.isRunning()) {
            const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
            console.log(`✅ Running (PID: ${pid})`);
            console.log('📱 Access: http://localhost:3000');
            console.log('🌐 Network: Check console for network IP');
        } else {
            console.log('❌ Not running');
        }

        console.log('================================');
    }

    logs() {
        console.log('📋 Service Logs:');
        console.log('================');

        if (fs.existsSync(this.logFile)) {
            const logs = fs.readFileSync(this.logFile, 'utf8');
            console.log(logs);
        } else {
            console.log('No logs available');
        }

        console.log('================');
    }

    isRunning() {
        if (!fs.existsSync(this.pidFile)) {
            return false;
        }

        try {
            const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
            process.kill(pid, 0); // Check if process exists
            return true;
        } catch (error) {
            this.cleanup();
            return false;
        }
    }

    cleanup() {
        if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
    }
}

// Command line interface
const command = process.argv[2];
const service = new ServiceManager();

switch (command) {
case 'start':
    service.start();
    break;
case 'stop':
    service.stop();
    break;
case 'restart':
    service.restart();
    break;
case 'status':
    service.status();
    break;
case 'logs':
    service.logs();
    break;
default:
    console.log('🤖 WhatsApp AI Service Manager');
    console.log('===============================');
    console.log('');
    console.log('Commands:');
    console.log('  start   - Start the WhatsApp AI service');
    console.log('  stop    - Stop the WhatsApp AI service');
    console.log('  restart - Restart the WhatsApp AI service');
    console.log('  status  - Check service status');
    console.log('  logs    - View service logs');
    console.log('');
    console.log('Examples:');
    console.log('  node service.js start');
    console.log('  node service.js stop');
    console.log('  node service.js status');
    console.log('');
    console.log('Or use npm scripts:');
    console.log('  npm start');
    console.log('  npm run stop');
    console.log('  npm run restart');
    console.log('  npm run status');
    break;
}
