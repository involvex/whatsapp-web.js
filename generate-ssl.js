#!/usr/bin/env node

/**
 * SSL Certificate Generator for WhatsApp AI
 * Generates self-signed certificates for HTTPS development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SSLGenerator {
    constructor() {
        this.certDir = path.join(__dirname, 'ssl');
        this.keyPath = path.join(this.certDir, 'key.pem');
        this.certPath = path.join(this.certDir, 'cert.pem');
    }

    generateCertificates() {
        console.log('🔐 Generating SSL certificates for HTTPS...');

        // Create SSL directory
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir, { recursive: true });
            console.log('📁 Created SSL directory');
        }

        // Check if certificates already exist
        if (fs.existsSync(this.keyPath) && fs.existsSync(this.certPath)) {
            console.log('✅ SSL certificates already exist');
            return;
        }

        try {
            // Generate private key
            console.log('🔑 Generating private key...');
            execSync(`openssl genrsa -out "${this.keyPath}" 2048`, {
                stdio: 'inherit',
            });

            // Generate certificate
            console.log('📜 Generating certificate...');
            const subject =
                '/C=US/ST=State/L=City/O=WhatsApp AI/OU=Development/CN=localhost';
            execSync(
                `openssl req -new -x509 -key "${this.keyPath}" -out "${this.certPath}" -days 365 -subj "${subject}"`,
                { stdio: 'inherit' },
            );

            console.log('✅ SSL certificates generated successfully!');
            console.log(`📁 Certificates saved to: ${this.certDir}`);
            console.log('🔒 You can now use HTTPS with the application');
        } catch (error) {
            console.error(
                '❌ Error generating SSL certificates:',
                error.message,
            );
            console.log('💡 Make sure OpenSSL is installed on your system');
            console.log(
                '   Windows: Download from https://slproweb.com/products/Win32OpenSSL.html',
            );
            console.log('   macOS: brew install openssl');
            console.log('   Linux: sudo apt-get install openssl');
        }
    }

    getCertificates() {
        if (fs.existsSync(this.keyPath) && fs.existsSync(this.certPath)) {
            return {
                key: fs.readFileSync(this.keyPath),
                cert: fs.readFileSync(this.certPath),
            };
        }
        return null;
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new SSLGenerator();
    generator.generateCertificates();
}

module.exports = SSLGenerator;
