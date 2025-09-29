const path = require('path');
const { Client, LegacySessionAuth, LocalAuth } = require('..');
const { sleep, waitFor, waitForEvent } = require('./utils/testUtils');

require('dotenv').config();

const remoteId = process.env.WWEBJS_TEST_REMOTE_ID || '1234567890@c.us';

// Default timeouts for different operations
const DEFAULT_TIMEOUTS = {
    initialization: 15000,
    authentication: 20000,
    messageSend: 5000,
    messageReceive: 5000,
    qrCodeGeneration: 10000
};

function isUsingLegacySession() {
    return Boolean(
        process.env.WWEBJS_TEST_SESSION || process.env.WWEBJS_TEST_SESSION_PATH,
    );
}

function isMD() {
    return Boolean(process.env.WWEBJS_TEST_MD);
}

if (isUsingLegacySession() && isMD())
    throw 'Cannot use legacy sessions with WWEBJS_TEST_MD=true';

function getSessionFromEnv() {
    if (!isUsingLegacySession()) return null;

    const envSession = process.env.WWEBJS_TEST_SESSION;
    if (envSession) return JSON.parse(envSession);

    const envSessionPath = process.env.WWEBJS_TEST_SESSION_PATH;
    if (envSessionPath) {
        const absPath = path.resolve(process.cwd(), envSessionPath);
        return require(absPath);
    }
}

function createClient({ authenticated, options: additionalOpts } = {}) {
    const options = {};

    if (authenticated) {
        const legacySession = getSessionFromEnv();
        if (legacySession) {
            options.authStrategy = new LegacySessionAuth({
                session: legacySession,
            });
        } else {
            const clientId = process.env.WWEBJS_TEST_CLIENT_ID || 'test-client';
            options.authStrategy = new LocalAuth({
                clientId,
            });
        }
    }

    const allOpts = { ...options, ...(additionalOpts || {}) };
    return new Client(allOpts);
}

/**
 * Wait for client to be ready
 * @param {Client} client - WhatsApp client instance
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - Resolves when client is ready
 */
async function waitForClientReady(client, timeout = DEFAULT_TIMEOUTS.initialization) {
    return waitForEvent(client, 'ready', { timeout });
}

/**
 * Wait for a message to be sent
 * @param {Client} client - WhatsApp client instance
 * @param {Object} options - Options
 * @returns {Promise<Message>} - Resolves with the sent message
 */
async function waitForMessageSent(client, options = {}) {
    const { timeout = DEFAULT_TIMEOUTS.messageSend, chatId = null } = options;
    
    return waitForEvent(client, 'message_create', {
        timeout,
        filter: ([msg]) => !chatId || msg.to === chatId
    }).then(([msg]) => msg);
}

module.exports = {
    sleep,
    waitFor,
    waitForEvent,
    waitForClientReady,
    waitForMessageSent,
    createClient,
    isUsingLegacySession,
    isMD,
    remoteId,
    DEFAULT_TIMEOUTS
};
