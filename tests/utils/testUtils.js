/**
 * Test utilities for optimizing test execution
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after the specified time
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 * @param {Function} conditionFn - Function that returns a boolean or Promise<boolean>
 * @param {Object} options - Options
 * @param {number} options.timeout - Maximum time to wait in ms (default: 10000)
 * @param {number} options.interval - Check interval in ms (default: 100)
 * @param {string} options.timeoutMessage - Message to show on timeout
 * @returns {Promise} - Resolves when condition is true, rejects on timeout
 */
async function waitFor(conditionFn, options = {}) {
    const {
        timeout = 10000,
        interval = 100,
        timeoutMessage = 'Condition not met within timeout period'
    } = options;

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const result = await Promise.resolve(conditionFn());
        if (result) return result;
        await sleep(interval);
    }
    
    throw new Error(timeoutMessage);
}

/**
 * Creates a promise that resolves when an event is emitted
 * @param {EventEmitter} emitter - The event emitter
 * @param {string} eventName - Name of the event to wait for
 * @param {Object} options - Options
 * @param {number} options.timeout - Maximum time to wait in ms (default: 10000)
 * @param {Function} options.filter - Optional filter function for the event data
 * @returns {Promise} - Resolves with event data when event is emitted
 */
function waitForEvent(emitter, eventName, options = {}) {
    const { timeout = 10000, filter = null } = options;
    
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Event ${eventName} not emitted within timeout period`));
        }, timeout);
        
        function handler(...args) {
            if (filter && !filter(...args)) return;
            cleanup();
            resolve(args);
        }
        
        function cleanup() {
            clearTimeout(timer);
            emitter.removeListener(eventName, handler);
        }
        
        emitter.on(eventName, handler);
    });
}

module.exports = {
    sleep,
    waitFor,
    waitForEvent
};
