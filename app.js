const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const path = require('path');
const { Client, LocalAuth } = require('./index'); // Use local whatsapp-web.js
const qrcode = require('qrcode');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const SSLGenerator = require('./generate-ssl');
require('dotenv').config();

class WhatsAppAIClient {
    constructor() {
        this.app = express();
        this.sslGenerator = new SSLGenerator();
        this.sslOptions = this.getSSLOptions();

        // Create server (HTTP or HTTPS)
        if (this.sslOptions) {
            this.server = https.createServer(this.sslOptions, this.app);
            console.log('🔒 HTTPS server created');
        } else {
            this.server = http.createServer(this.app);
            console.log('🌐 HTTP server created');
        }

        // Configure CORS for Express
        this.app.use(
            cors({
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: true,
            }),
        );

        this.io = socketIo(this.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        this.client = null;
        this.isReady = false;
        this.chatHistory = new Map(); // Store chat histories
        this.aiClient = null;

        // Caching system
        this.cache = {
            chats: new Map(),
            messages: new Map(),
            contacts: new Map(),
            images: new Map(),
            lastUpdated: new Map(),
        };

        this.setupExpress();
        this.setupSocketIO();
        this.initializeWhatsApp();
        this.initializeAI();
    }

    getSSLOptions() {
        // Force HTTP mode for development
        if (process.env.DISABLE_HTTPS === 'true') {
            console.log('🌐 HTTPS disabled, using HTTP');
            return null;
        }

        try {
            const sslOptions = this.sslGenerator.getCertificates();
            if (sslOptions) {
                console.log('🔐 SSL certificates found');
                return sslOptions;
            } else {
                console.log('⚠️  No SSL certificates found, using HTTP');
                return null;
            }
        } catch (error) {
            console.log(
                '⚠️  SSL setup failed, falling back to HTTP:',
                error.message,
            );
            return null;
        }
    }

    setupExpress() {
        // Security and performance middleware
        this.app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ['\'self\''],
                        styleSrc: [
                            '\'self\'',
                            '\'unsafe-inline\'',
                            'https://cdnjs.cloudflare.com',
                            'https://fonts.googleapis.com',
                        ],
                        scriptSrc: [
                            '\'self\'',
                            '\'unsafe-inline\'',
                            '\'unsafe-hashes\'',
                            'https://cdnjs.cloudflare.com',
                        ],
                        imgSrc: ['\'self\'', 'data:', 'blob:'],
                        mediaSrc: ['\'self\'', 'data:', 'blob:'],
                        connectSrc: ['\'self\'', 'ws:', 'wss:'],
                        fontSrc: [
                            '\'self\'',
                            'https://cdnjs.cloudflare.com',
                            'https://fonts.gstatic.com',
                            'https://fonts.googleapis.com',
                        ],
                        objectSrc: ['\'none\''],
                        // Removed upgradeInsecureRequests to allow HTTP access
                    },
                },
                crossOriginEmbedderPolicy: false,
                crossOriginOpenerPolicy: false,
                crossOriginResourcePolicy: false,
            }),
        );
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json());

        // Add headers to prevent HTTPS upgrade and improve network access
        this.app.use((req, res, next) => {
            // Prevent browser from upgrading to HTTPS
            res.setHeader('Strict-Transport-Security', '');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });
        // Serve static files with proper MIME types
        this.app.use(
            express.static(path.join(__dirname, 'public'), {
                setHeaders: (res, path) => {
                    if (path.endsWith('.html')) {
                        res.setHeader(
                            'Content-Type',
                            'text/html; charset=utf-8',
                        );
                    } else if (path.endsWith('.css')) {
                        res.setHeader(
                            'Content-Type',
                            'text/css; charset=utf-8',
                        );
                    } else if (path.endsWith('.js')) {
                        res.setHeader(
                            'Content-Type',
                            'application/javascript; charset=utf-8',
                        );
                    }
                },
            }),
        );

        // Serve the main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API endpoint to get chat history
        this.app.get('/api/chat/:chatId', async (req, res) => {
            try {
                const chatId = req.params.chatId;
                const messages = await this.getChatMessages(chatId);
                res.json(messages);
            } catch (error) {
                console.error('Error getting chat messages:', error);
                res.status(500).json({ error: 'Failed to get chat messages' });
            }
        });

        // API endpoint to generate AI responses
        this.app.post('/api/generate-ai', async (req, res) => {
            try {
                const { chatId, message, context, language } = req.body;
                console.log('AI generation request:', {
                    chatId,
                    message: message?.substring(0, 50) + '...',
                    language,
                });
                const responses = await this.generateAIResponses(
                    chatId,
                    message,
                    context,
                    language,
                );
                res.json({ responses });
            } catch (error) {
                console.error('AI generation error:', error);
                res.status(500).json({
                    error: 'Failed to generate AI responses',
                });
            }
        });

        // API endpoint to send messages
        this.app.post('/api/send-message', async (req, res) => {
            try {
                const {
                    chatId,
                    message,
                    type = 'text',
                    mediaData,
                    filename,
                } = req.body;
                const success = await this.sendMessage(
                    chatId,
                    message,
                    type,
                    mediaData,
                    filename,
                );
                res.json({ success });
            } catch (error) {
                console.error('Send message error:', error);
                res.status(500).json({ error: 'Failed to send message' });
            }
        });

        // API endpoint to get chats
        this.app.get('/api/chats', async (req, res) => {
            try {
                const chats = await this.getChats();
                res.json(chats);
            } catch (error) {
                console.error('Get chats error:', error);
                res.status(500).json({ error: 'Failed to get chats' });
            }
        });

        // API endpoint to get contacts
        this.app.get('/api/contacts', async (req, res) => {
            try {
                const contacts = await this.getContacts();
                res.json(contacts);
            } catch (error) {
                console.error('Get contacts error:', error);
                res.status(500).json({ error: 'Failed to get contacts' });
            }
        });

        // API endpoint to sync with Google Contacts
        this.app.post('/api/sync-google-contacts', async (req, res) => {
            try {
                const { accessToken } = req.body;
                const result = await this.syncGoogleContacts(accessToken);
                res.json(result);
            } catch (error) {
                console.error('Google Contacts sync error:', error);
                res.status(500).json({
                    error: 'Failed to sync Google Contacts',
                });
            }
        });

        // API endpoint to get cache statistics
        this.app.get('/api/cache/stats', (req, res) => {
            try {
                const stats = this.getCacheStats();
                res.json(stats);
            } catch (error) {
                console.error('Error getting cache stats:', error);
                res.status(500).json({ error: 'Failed to get cache stats' });
            }
        });

        // API endpoint to clear cache
        this.app.post('/api/cache/clear', (req, res) => {
            try {
                const { type } = req.body;
                this.clearCache(type);
                res.json({
                    success: true,
                    message: `Cache cleared for ${type || 'all'}`,
                });
            } catch (error) {
                console.error('Error clearing cache:', error);
                res.status(500).json({ error: 'Failed to clear cache' });
            }
        });

        // API endpoint to get contact groups
        this.app.get('/api/contact-groups/:contactId', async (req, res) => {
            try {
                const contactId = req.params.contactId;
                const groups = await this.getContactGroups(contactId);
                res.json(groups);
            } catch (error) {
                console.error('Error getting contact groups:', error);
                res.status(500).json({ error: 'Failed to get contact groups' });
            }
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('get-status', () => {
                socket.emit('status', {
                    isReady: this.isReady,
                    qrCode: this.qrCode,
                });
            });

            socket.on('generate-more-ai', async (data) => {
                try {
                    const { chatId, message, context } = data;
                    const responses = await this.generateAIResponses(
                        chatId,
                        message,
                        context,
                    );
                    socket.emit('ai-responses', { responses });
                } catch (error) {
                    socket.emit('ai-error', { error: error.message });
                }
            });
        });
    }

    async initializeAI() {
        try {
            // Initialize Gemini AI
            this.aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            console.log('AI client initialized');
        } catch (error) {
            console.error('Failed to initialize AI:', error);
        }
    }

    async initializeWhatsApp() {
        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId:
                        process.env.WHATSAPP_CLIENT_ID || 'whatsapp-ai-client',
                    dataPath: './data',
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                    ],
                },
                webVersionCache: {
                    type: 'local',
                    path: './data/web-version-cache',
                },
            });

            this.client.on('qr', async (qr) => {
                console.log('QR Code received');
                this.qrCode = await qrcode.toDataURL(qr);
                this.io.emit('qr', this.qrCode);
            });

            this.client.on('ready', async () => {
                console.log('WhatsApp client is ready!');
                this.isReady = true;
                this.io.emit('ready');

                // Load and emit chats to all connected clients
                try {
                    const chats = await this.getChats();
                    this.io.emit('chats-loaded', chats);
                    console.log(`Emitted ${chats.length} chats to clients`);
                } catch (error) {
                    console.error('Error loading chats on ready:', error);
                }
            });

            this.client.on('authenticated', () => {
                console.log('WhatsApp client authenticated');
                this.io.emit('authenticated');
            });

            this.client.on('auth_failure', (msg) => {
                console.error('Authentication failed:', msg);
                this.io.emit('auth_failure', msg);
            });

            this.client.on('message', async (message) => {
                await this.handleIncomingMessage(message);
            });

            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp client disconnected:', reason);
                this.isReady = false;
                this.io.emit('disconnected', reason);
            });

            await this.client.initialize();
        } catch (error) {
            console.error('Failed to initialize WhatsApp client:', error);
        }
    }

    async handleIncomingMessage(message) {
        try {
            const chatId = message.from;
            const chat = await message.getChat();

            // Store message in chat history
            if (!this.chatHistory.has(chatId)) {
                this.chatHistory.set(chatId, []);
            }

            const messageData = {
                id: message.id._serialized,
                body: message.body,
                from: message.from,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
                type: message.type,
                chatName: chat.name || chatId,
            };

            this.chatHistory.get(chatId).push(messageData);

            // Emit to connected clients
            this.io.emit('new-message', {
                chatId,
                message: messageData,
                chatName: chat.name || chatId,
            });

            // Auto-generate AI responses for non-bot messages
            if (
                !message.fromMe &&
                message.body &&
                !message.body.startsWith('/ai')
            ) {
                setTimeout(async () => {
                    await this.generateAndSendAIResponse(chatId, message);
                }, 2000); // Delay to avoid immediate response
            }
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    async generateAIResponses(
        chatId,
        message,
        context = '',
        language = 'English',
    ) {
        if (!this.aiClient) {
            throw new Error('AI client not initialized');
        }

        try {
            const chatHistory = this.chatHistory.get(chatId) || [];
            const recentMessages = chatHistory.slice(-10); // Last 10 messages for context

            const prompt = this.buildAIPrompt(
                message,
                recentMessages,
                context,
                language,
            );

            const model = this.aiClient.getGenerativeModel({
                model: 'gemini-flash-latest',
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse multiple responses (split by newlines or numbered lists)
            const responses = this.parseAIResponses(text);

            return responses;
        } catch (error) {
            console.error('AI generation error:', error);
            return ['Sorry, I encountered an error generating responses.'];
        }
    }

    buildAIPrompt(message, chatHistory, context, language = 'English') {
        const historyText = chatHistory
            .map((msg) => `${msg.fromMe ? 'You' : 'User'}: ${msg.body}`)
            .join('\n');

        const languageInstruction =
            language !== 'English'
                ? `\n\nIMPORTANT: Respond in ${language}. All response options should be in ${language}.`
                : '';

        return `You are a helpful WhatsApp AI assistant. Based on the chat history and the current message, provide 3 different response options that are helpful, relevant, and conversational.

Chat History:
${historyText}

Current Message: ${message}

Context: ${context}${languageInstruction}

Please provide 3 different response options, each on a new line starting with "Option 1:", "Option 2:", "Option 3:". Make them varied in tone and approach but all helpful and appropriate for WhatsApp conversation.`;
    }

    parseAIResponses(text) {
        const responses = [];
        const lines = text.split('\n');

        for (const line of lines) {
            if (line.match(/^Option \d+:/i)) {
                const response = line.replace(/^Option \d+:\s*/i, '').trim();
                if (response) {
                    responses.push(response);
                }
            }
        }

        // If no structured responses found, split by lines and take first 3
        if (responses.length === 0) {
            const lines = text.split('\n').filter((line) => line.trim());
            responses.push(...lines.slice(0, 3));
        }

        return responses.length > 0
            ? responses
            : ['I understand. How can I help you further?'];
    }

    async generateAndSendAIResponse(chatId, message) {
        try {
            const responses = await this.generateAIResponses(
                chatId,
                message.body,
            );

            // Send the first response automatically
            if (responses.length > 0) {
                await this.client.sendMessage(chatId, responses[0]);

                // Store the AI response in chat history
                const aiMessage = {
                    id: `ai_${Date.now()}`,
                    body: responses[0],
                    from: chatId,
                    fromMe: true,
                    timestamp: Math.floor(Date.now() / 1000),
                    type: 'chat',
                    isAI: true,
                };

                if (!this.chatHistory.has(chatId)) {
                    this.chatHistory.set(chatId, []);
                }
                this.chatHistory.get(chatId).push(aiMessage);
            }

            // Emit AI responses to connected clients
            this.io.emit('ai-responses', {
                chatId,
                responses,
                originalMessage: message.body,
            });
        } catch (error) {
            console.error('Error generating AI response:', error);
        }
    }

    async sendMessage(
        chatId,
        message,
        type = 'text',
        mediaData = null,
        filename = null,
    ) {
        if (this.isReady && this.client) {
            try {
                if (type === 'audio' && mediaData) {
                    // Handle voice message
                    const { MessageMedia } = require('whatsapp-web.js');
                    const audioBuffer = Buffer.from(mediaData, 'base64');
                    const media = new MessageMedia(
                        'audio/ogg',
                        audioBuffer.toString('base64'),
                        filename || 'voice.ogg',
                    );
                    await this.client.sendMessage(chatId, media);
                } else if (type === 'image' && mediaData) {
                    // Handle image
                    const { MessageMedia } = require('whatsapp-web.js');
                    const imageBuffer = Buffer.from(mediaData, 'base64');
                    const media = new MessageMedia(
                        'image/jpeg',
                        imageBuffer.toString('base64'),
                        filename,
                    );
                    await this.client.sendMessage(chatId, media);
                } else if (type === 'video' && mediaData) {
                    // Handle video
                    const { MessageMedia } = require('whatsapp-web.js');
                    const videoBuffer = Buffer.from(mediaData, 'base64');
                    const media = new MessageMedia(
                        'video/mp4',
                        videoBuffer.toString('base64'),
                        filename,
                    );
                    await this.client.sendMessage(chatId, media);
                } else if (type === 'document' && mediaData) {
                    // Handle document
                    const { MessageMedia } = require('whatsapp-web.js');
                    const docBuffer = Buffer.from(mediaData, 'base64');
                    const media = new MessageMedia(
                        'application/pdf',
                        docBuffer.toString('base64'),
                        filename,
                    );
                    await this.client.sendMessage(chatId, media);
                } else {
                    // Handle text message
                    await this.client.sendMessage(chatId, message);
                }

                return true;
            } catch (error) {
                console.error('Error sending message:', error);
                return false;
            }
        }
        return false;
    }

    async getChats() {
        if (this.isReady && this.client) {
            try {
                // Check cache first
                const cacheKey = 'all_chats';
                const cached = this.getFromCache('chats', cacheKey);
                if (cached && this.isCacheValid('chats', cacheKey, 120000)) {
                    // 2 minutes
                    console.log('Returning cached chats');
                    return cached;
                }

                const chats = await this.client.getChats();
                console.log(`Loaded ${chats.length} chats`);

                // Sort chats: unread first, then by message history (most recent)
                const sortedChats = chats.sort((a, b) => {
                    // First priority: unread messages (unread chats first)
                    const aHasUnread = (a.unreadCount || 0) > 0;
                    const bHasUnread = (b.unreadCount || 0) > 0;

                    if (aHasUnread !== bHasUnread) {
                        return bHasUnread - aHasUnread; // unread first
                    }

                    // If both have unread or both don't have unread, sort by unread count
                    if (aHasUnread && bHasUnread) {
                        const unreadDiff =
                            (b.unreadCount || 0) - (a.unreadCount || 0);
                        if (unreadDiff !== 0) {
                            return unreadDiff;
                        }
                    }

                    // Second priority: last message timestamp (most recent first)
                    const aTime = a.lastMessage
                        ? a.lastMessage.timestamp
                        : a.timestamp || 0;
                    const bTime = b.lastMessage
                        ? b.lastMessage.timestamp
                        : b.timestamp || 0;

                    // If timestamps are equal, sort by chat name alphabetically
                    if (aTime === bTime) {
                        return (a.name || '').localeCompare(b.name || '');
                    }

                    return bTime - aTime; // newest first
                });

                const chatData = sortedChats.map((chat) => ({
                    id: chat.id._serialized,
                    name: chat.name,
                    isGroup: chat.isGroup,
                    unreadCount: chat.unreadCount,
                    lastMessage: chat.lastMessage
                        ? {
                            body: chat.lastMessage.body,
                            timestamp: chat.lastMessage.timestamp,
                            fromMe: chat.lastMessage.fromMe,
                            type: chat.lastMessage.type,
                        }
                        : null,
                    timestamp: chat.timestamp,
                }));

                // Log sorting results
                const unreadChats = chatData.filter(
                    (chat) => chat.unreadCount > 0,
                );
                const readChats = chatData.filter(
                    (chat) => chat.unreadCount === 0,
                );
                console.log(
                    `Chat sorting: ${unreadChats.length} unread chats, ${readChats.length} read chats`,
                );

                if (unreadChats.length > 0) {
                    console.log(
                        'Top unread chats:',
                        unreadChats
                            .slice(0, 3)
                            .map(
                                (chat) =>
                                    `${chat.name} (${chat.unreadCount} unread)`,
                            ),
                    );
                }

                // Cache the results
                this.setCache('chats', cacheKey, chatData);
                return chatData;
            } catch (error) {
                console.error('Error getting chats:', error);
                return [];
            }
        }
        return [];
    }

    async getContacts() {
        if (this.isReady && this.client) {
            try {
                // Check cache first
                const cacheKey = 'all_contacts';
                const cached = this.getFromCache('contacts', cacheKey);
                if (cached && this.isCacheValid('contacts', cacheKey, 300000)) {
                    // 5 minutes
                    console.log('Returning cached contacts');
                    return cached;
                }

                const contacts = await this.client.getContacts();
                console.log(`Loaded ${contacts.length} contacts`);

                // Sort contacts alphabetically by name
                const sortedContacts = contacts.sort((a, b) => {
                    const nameA = a.name || a.pushname || a.number || '';
                    const nameB = b.name || b.pushname || b.number || '';
                    return nameA.localeCompare(nameB);
                });

                const contactData = sortedContacts.map((contact) => ({
                    id: contact.id._serialized,
                    name: contact.name,
                    pushname: contact.pushname,
                    number: contact.number,
                    isUser: contact.isUser,
                    isGroup: contact.isGroup,
                    isWAContact: contact.isWAContact,
                    profilePicUrl: contact.profilePicUrl,
                    status: contact.status,
                    lastSeen: contact.lastSeen,
                }));

                // Cache the results
                this.setCache('contacts', cacheKey, contactData);
                return contactData;
            } catch (error) {
                console.error('Error getting contacts:', error);
                return [];
            }
        }
        return [];
    }

    async getChatMessages(chatId) {
        if (this.isReady && this.client) {
            try {
                // Check cache first
                const cached = this.getFromCache('messages', chatId);
                if (cached && this.isCacheValid('messages', chatId, 60000)) {
                    // 1 minute
                    console.log(`Returning cached messages for ${chatId}`);
                    return cached;
                }

                console.log(`Loading messages for chat: ${chatId}`);
                const chat = await this.client.getChatById(chatId);
                const messages = await chat.fetchMessages({ limit: 50 });

                console.log(
                    `Loaded ${messages.length} messages for chat ${chatId}`,
                );

                const messageData = await Promise.all(
                    messages.map(async (message) => {
                        const baseMessage = {
                            id: message.id._serialized,
                            body: message.body,
                            from: message.from,
                            fromMe: message.fromMe,
                            timestamp: message.timestamp,
                            type: message.type,
                            hasMedia: message.hasMedia,
                            media: null,
                        };

                        // Handle media messages (including voice messages)
                        if (message.hasMedia) {
                            try {
                                const media = await message.downloadMedia();
                                baseMessage.media = {
                                    mimetype: media.mimetype,
                                    filename: media.filename,
                                    data: media.data, // Base64 encoded media data
                                    type: media.mimetype,
                                };

                                // For voice messages, store the audio data in body for easy access
                                if (
                                    message.type === 'ptt' ||
                                    message.type === 'audio' ||
                                    media.mimetype.startsWith('audio/')
                                ) {
                                    baseMessage.body = media.data; // Store base64 audio data
                                    baseMessage.type = 'audio';
                                }
                            } catch (error) {
                                console.error(
                                    'Error downloading media:',
                                    error,
                                );
                                baseMessage.media = {
                                    mimetype: message._data.mimetype,
                                    filename: message._data.filename,
                                    error: 'Failed to download media',
                                };
                            }
                        }

                        return baseMessage;
                    }),
                );

                // Cache the messages
                this.setCache('messages', chatId, messageData);

                // Also store in chat history
                this.chatHistory.set(chatId, messageData);

                return messageData;
            } catch (error) {
                console.error(
                    `Error getting messages for chat ${chatId}:`,
                    error,
                );
                return [];
            }
        }
        return [];
    }

    async syncGoogleContacts(accessToken) {
        try {
            if (!accessToken) {
                throw new Error('Google access token is required');
            }

            // Fetch Google Contacts
            const response = await fetch(
                'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`Google API error: ${response.status}`);
            }

            const data = await response.json();
            const googleContacts = data.connections || [];

            console.log(`Fetched ${googleContacts.length} Google contacts`);

            // Get WhatsApp contacts for comparison
            const whatsappContacts = await this.getContacts();

            // Find matches and create sync report
            const syncReport = {
                totalGoogleContacts: googleContacts.length,
                totalWhatsAppContacts: whatsappContacts.length,
                matches: [],
                unmatched: [],
            };

            // Simple matching by phone number
            for (const googleContact of googleContacts) {
                const phoneNumbers = googleContact.phoneNumbers || [];
                const names = googleContact.names || [];
                const name = names[0]?.displayName || 'Unknown';

                for (const phoneNumber of phoneNumbers) {
                    const cleanNumber = phoneNumber.value.replace(/\D/g, '');

                    // Find matching WhatsApp contact
                    const whatsappContact = whatsappContacts.find((contact) => {
                        const contactNumber = contact.number.replace(/\D/g, '');
                        return (
                            contactNumber.includes(cleanNumber) ||
                            cleanNumber.includes(contactNumber)
                        );
                    });

                    if (whatsappContact) {
                        syncReport.matches.push({
                            googleName: name,
                            whatsappName:
                                whatsappContact.name ||
                                whatsappContact.pushname,
                            phoneNumber: phoneNumber.value,
                            whatsappId: whatsappContact.id,
                        });
                    } else {
                        syncReport.unmatched.push({
                            name: name,
                            phoneNumber: phoneNumber.value,
                        });
                    }
                }
            }

            return syncReport;
        } catch (error) {
            console.error('Google Contacts sync error:', error);
            throw error;
        }
    }

    // Caching utility methods
    setCache(type, key, data) {
        this.cache[type].set(key, data);
        this.cache.lastUpdated.set(`${type}_${key}`, Date.now());
    }

    getFromCache(type, key) {
        return this.cache[type].get(key);
    }

    isCacheValid(type, key, maxAge) {
        const lastUpdated = this.cache.lastUpdated.get(`${type}_${key}`);
        if (!lastUpdated) return false;
        return Date.now() - lastUpdated < maxAge;
    }

    clearCache(type = null) {
        if (type) {
            this.cache[type].clear();
            // Clear related timestamps
            for (const [key] of this.cache.lastUpdated) {
                if (key.startsWith(`${type}_`)) {
                    this.cache.lastUpdated.delete(key);
                }
            }
        } else {
            // Clear all caches
            Object.keys(this.cache).forEach((key) => {
                this.cache[key].clear();
            });
        }
        console.log(`Cache cleared for ${type || 'all'}`);
    }

    getCacheStats() {
        const stats = {};
        Object.keys(this.cache).forEach((type) => {
            if (type !== 'lastUpdated') {
                stats[type] = this.cache[type].size;
            }
        });
        return stats;
    }

    async getContactGroups(contactId) {
        if (this.isReady && this.client) {
            try {
                const chats = await this.client.getChats();
                const groups = chats.filter((chat) => chat.isGroup);

                const contactGroups = [];
                for (const group of groups) {
                    try {
                        const participants = await group.participants;
                        const isParticipant = participants.some(
                            (participant) =>
                                participant.id._serialized === contactId,
                        );

                        if (isParticipant) {
                            contactGroups.push({
                                id: group.id._serialized,
                                name: group.name,
                                participants: participants.length,
                            });
                        }
                    } catch (error) {
                        console.error(
                            `Error checking group ${group.id._serialized}:`,
                            error,
                        );
                    }
                }

                return contactGroups;
            } catch (error) {
                console.error('Error getting contact groups:', error);
                return [];
            }
        }
        return [];
    }

    start(port = 3000) {
        this.server.listen(port, '0.0.0.0', () => {
            console.log('AI client initialized');
            const protocol = this.sslOptions ? 'https' : 'http';
            console.log(`WhatsApp AI Client running on port ${port}`);
            console.log(`🌐 Protocol: ${protocol.toUpperCase()}`);
            console.log(`Open ${protocol}://localhost:${port} in your browser`);
            console.log('Or access from other devices using your network IP');
            this.logNetworkInfo(port, protocol);
        });
    }

    logNetworkInfo(port, protocol = 'http') {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();

        console.log('\n🌐 Network Access Information:');
        console.log('================================');

        // Get local IP addresses
        const addresses = [];
        Object.keys(networkInterfaces).forEach((interfaceName) => {
            networkInterfaces[interfaceName].forEach((netInterface) => {
                if (netInterface.family === 'IPv4' && !netInterface.internal) {
                    addresses.push(netInterface.address);
                }
            });
        });

        if (addresses.length > 0) {
            console.log('📱 Access from other devices:');
            addresses.forEach((ip) => {
                console.log(`   ${protocol}://${ip}:${port}`);
            });
        } else {
            console.log('⚠️  No network interfaces found for external access');
        }

        console.log(`💻 Local access: ${protocol}://localhost:${port}`);
        if (protocol === 'https') {
            console.log('🔒 HTTPS enabled - secure connection');
            console.log(
                '⚠️  Browser may show security warning for self-signed certificate',
            );
            console.log(
                '💡 Click "Advanced" and "Proceed to localhost" to continue',
            );
        }
        console.log('================================\n');
    }
}

// Start the application
const app = new WhatsAppAIClient();
app.start(process.env.PORT || 3000);

module.exports = WhatsAppAIClient;
