/**
 * Error handling utilities for tests
 */

/**
 * Safely runs a test function with proper error handling
 * @param {Function} testFn - The test function to run
 * @param {Object} options - Options for error handling
 * @param {Function} options.onError - Optional callback for error handling
 * @param {boolean} options.rethrow - Whether to rethrow the error (default: true)
 * @returns {Function} - A wrapped test function with error handling
 */
function withErrorHandling(testFn, options = {}) {
    const { onError, rethrow = true } = options;
    
    return async function(...args) {
        try {
            return await testFn.apply(this, args);
        } catch (err) {
            console.error('Test error:', err);
            
            if (onError) {
                await onError(err, this);
            }
            
            if (rethrow) {
                throw err;
            }
        }
    };
}

/**
 * Creates a screenshot of the current page state when a test fails
 * @param {Client} client - The WhatsApp client instance
 * @param {string} testName - Name of the test for the screenshot filename
 * @returns {Promise} - Resolves when screenshot is saved
 */
async function captureScreenshot(client, testName) {
    if (!client || !client.pupPage) return;
    
    try {
        const sanitizedName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `error_${sanitizedName}_${timestamp}.png`;
        
        await client.pupPage.screenshot({ 
            path: `./tests/screenshots/${filename}`,
            fullPage: true
        });
        
        console.log(`Screenshot saved as ${filename}`);
    } catch (err) {
        console.error('Failed to capture screenshot:', err);
    }
}

/**
 * Creates a test wrapper that handles common cleanup tasks
 * @param {Function} testFn - The test function to wrap
 * @returns {Function} - A wrapped test function with cleanup
 */
function withCleanup(testFn) {
    return async function(...args) {
        let client = null;
        
        try {
            const result = await testFn.apply(this, args);
            
            // Extract client if it was created in the test
            if (this.currentTest && this.currentTest.ctx) {
                client = this.currentTest.ctx.client;
            }
            
            return result;
        } catch (err) {
            // Try to extract client from test context
            if (this.currentTest && this.currentTest.ctx) {
                client = this.currentTest.ctx.client;
            }
            
            if (client) {
                await captureScreenshot(client, this.currentTest ? this.currentTest.title : 'unknown_test');
            }
            
            throw err;
        } finally {
            // Always try to clean up the client if it exists
            if (client) {
                try {
                    await client.destroy().catch(() => {});
                } catch (e) {
                    console.error('Error during client cleanup:', e);
                }
            }
        }
    };
}

/**
 * Wraps a test suite with setup and teardown for client
 * @param {Function} describeFn - The describe function
 * @param {string} title - The test suite title
 * @param {Function} fn - The test suite function
 * @returns {Function} - The wrapped describe function
 */
function describeWithClient(title, fn) {
    return describe(title, function() {
        let client;
        
        before(async function() {
            this.timeout(35000);
            const helper = require('../helper');
            client = helper.createClient({ authenticated: true });
            this.client = client;
            await client.initialize();
        });
        
        after(async function() {
            if (client) {
                await client.destroy().catch(() => {});
            }
        });
        
        fn.call(this);
    });
}

module.exports = {
    withErrorHandling,
    captureScreenshot,
    withCleanup,
    describeWithClient
};
