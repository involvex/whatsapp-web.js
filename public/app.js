// WhatsApp AI Web Frontend Application
class WhatsAppAIApp {
    constructor() {
        this.socket = null;
        this.currentChatId = null;
        this.chats = new Map();
        this.messages = new Map();
        this.isConnected = false;
        this.pinnedChats = new Set(JSON.parse(localStorage.getItem('pinnedChats') || '[]'));

        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.connectToServer();
        this.requestNotificationPermission();
        this.updateStatus('Connecting to server...');

        // Add periodic data check
        this.startDataCheck();

        // Add page load event listener
        window.addEventListener('load', () => {
            console.log('Page loaded, checking connection...');
            setTimeout(() => {
                if (this.isConnected) {
                    this.autoLoadData();
                }
            }, 1000);
        });
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            const hasText = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasText || !this.isConnected;
        });

        sendBtn.addEventListener('click', () => this.sendMessage());

        // Back to chats button (mobile)
        const backToChatsBtn = document.getElementById('back-to-chats');
        backToChatsBtn.addEventListener('click', () => {
            const chatArea = document.querySelector('.chat-area');
            chatArea.classList.remove('active');
        });

        // AI modal
        const aiModal = document.getElementById('ai-modal');
        const closeAiModal = document.getElementById('close-ai-modal');
        const generateMoreBtn = document.getElementById('generate-more-btn');

        closeAiModal.addEventListener('click', () => this.hideAIModal());
        generateMoreBtn.addEventListener('click', () => this.generateMoreAI());

        // Close modal on background click
        aiModal.addEventListener('click', (e) => {
            if (e.target === aiModal) {
                this.hideAIModal();
            }
        });

        // Search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });

        // Refresh chats button
        const refreshChatsBtn = document.getElementById('refresh-chats-btn');
        refreshChatsBtn.addEventListener('click', () => {
            this.refreshChats();
        });

        // Cache management button
        const cacheBtn = document.getElementById('cache-btn');
        cacheBtn.addEventListener('click', () => {
            this.showCacheSection();
        });

        // Tab switching
        const chatsTab = document.getElementById('chats-tab');
        const contactsTab = document.getElementById('contacts-tab');

        chatsTab.addEventListener('click', () => {
            this.switchTab('chats');
        });

        contactsTab.addEventListener('click', () => {
            this.switchTab('contacts');
        });

        // Google sync
        const googleAuthBtn = document.getElementById('google-auth-btn');
        const manualTokenBtn = document.getElementById('manual-token-btn');
        const closeSyncBtn = document.getElementById('close-sync-btn');

        googleAuthBtn.addEventListener('click', () => {
            this.showGoogleAuth();
        });

        manualTokenBtn.addEventListener('click', () => {
            this.showManualTokenInput();
        });

        closeSyncBtn.addEventListener('click', () => {
            this.hideGoogleSync();
        });

        // Google sync button in contacts
        const syncGoogleBtn = document.getElementById('sync-google-btn');
        syncGoogleBtn.addEventListener('click', () => {
            this.showGoogleSync();
        });

        // Cache management
        const closeCacheBtn = document.getElementById('close-cache-btn');
        const refreshCacheBtn = document.getElementById('refresh-cache-btn');
        const clearAllCacheBtn = document.getElementById('clear-all-cache-btn');

        closeCacheBtn.addEventListener('click', () => {
            this.hideCacheSection();
        });

        refreshCacheBtn.addEventListener('click', () => {
            this.loadCacheStats();
        });

        clearAllCacheBtn.addEventListener('click', () => {
            this.clearAllCache();
        });

        // Voice recording
        const voiceBtn = document.getElementById('voice-btn');
        const voiceCancelBtn = document.getElementById('voice-cancel-btn');
        const voiceSendBtn = document.getElementById('voice-send-btn');

        voiceBtn.addEventListener('click', () => {
            this.startVoiceRecording();
        });

        voiceCancelBtn.addEventListener('click', () => {
            this.cancelVoiceRecording();
        });

        voiceSendBtn.addEventListener('click', () => {
            this.sendVoiceMessage();
        });

        // AI Prompts
        const aiPromptsBtn = document.getElementById('ai-prompts-btn');
        const closeAiPromptsBtn = document.getElementById('close-ai-prompts');

        aiPromptsBtn.addEventListener('click', () => {
            this.toggleAIPrompts();
        });

        closeAiPromptsBtn.addEventListener('click', () => {
            this.hideAIPrompts();
        });

        // Voice message play buttons (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.voice-play-btn')) {
                const button = e.target.closest('.voice-play-btn');
                const messageId = button.getAttribute('data-message-id');
                if (messageId) {
                    this.playVoiceMessage(messageId);
                }
            }

            // AI prompt button clicks
            if (e.target.closest('.ai-prompt-btn')) {
                const button = e.target.closest('.ai-prompt-btn');
                const prompt = button.textContent;
                this.useAIPrompt(prompt);
            }

            // Image preview clicks
            if (e.target.closest('.message-image')) {
                const img = e.target.closest('.message-image');
                const imageUrl = img.src;
                this.openImagePreview(imageUrl);
            }
        });

        // Emoji button
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                this.toggleEmojiPicker();
            });
        }

        // Export/Import
        const exportImportBtn = document.getElementById('export-import-btn');
        const closeExportImportBtn = document.getElementById(
            'close-export-import-btn',
        );
        const importFilesBtn = document.getElementById('import-files-btn');
        const importFilesInput = document.getElementById('import-files-input');

        exportImportBtn.addEventListener('click', () => {
            this.showExportImportSection();
        });

        closeExportImportBtn.addEventListener('click', () => {
            this.hideExportImportSection();
        });

        importFilesBtn.addEventListener('click', () => {
            importFilesInput.click();
        });

        importFilesInput.addEventListener('change', (e) => {
            this.handleFileImport(e.target.files);
        });

        // Export buttons
        document
            .getElementById('export-chats-btn')
            .addEventListener('click', () => this.exportData('chats'));
        document
            .getElementById('export-messages-btn')
            .addEventListener('click', () => this.exportData('messages'));
        document
            .getElementById('export-contacts-btn')
            .addEventListener('click', () => this.exportData('contacts'));
        document
            .getElementById('export-media-btn')
            .addEventListener('click', () => this.exportData('media'));
        document
            .getElementById('export-all-btn')
            .addEventListener('click', () => this.exportData('all'));

        // Contact details
        const closeContactDetailsBtn = document.getElementById(
            'close-contact-details-btn',
        );
        closeContactDetailsBtn.addEventListener('click', () => {
            this.hideContactDetails();
        });
    }

    connectToServer() {
        if (typeof io === 'undefined') {
            console.error('Socket.io client library is not loaded.');
            this.updateStatus('Connection Error');
            return;
        }
        if (typeof io !== 'function') {
            console.error('Socket.io client library is not loaded or "io" is not a function.');
            this.updateStatus('Connection Error');
            return;
        }
        this.socket = window.io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateStatus('Connected');
            this.socket.emit('get-status');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('Disconnected');
            this.isConnected = false;
        });

        this.socket.on('status', (status) => {
            this.handleStatusUpdate(status);
        });

        this.socket.on('qr', (qrCode) => {
            this.showQRCode(qrCode);
        });

        this.socket.on('ready', () => {
            this.hideQRCode();
            this.showMainApp();
            this.isConnected = true;
            this.updateStatus('WhatsApp Connected');
            // Auto-load data when connected
            this.autoLoadData();

            // Restore last opened chat
            this.restoreLastChat();
        });

        this.socket.on('authenticated', () => {
            this.updateStatus('Authenticated');
        });

        this.socket.on('auth_failure', (msg) => {
            this.updateStatus('Authentication failed');
            console.error('Auth failure:', msg);
        });

        this.socket.on('new-message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('ai-responses', (data) => {
            this.handleAIResponses(data);
        });

        this.socket.on('ai-error', (error) => {
            console.error('AI error:', error);
            this.showNotification('AI Error: ' + error.error, 'error');
        });

        this.socket.on('chats-loaded', (chats) => {
            console.log('Received chats:', chats.length);
            this.renderChatList(chats);
        });
    }

    handleStatusUpdate(status) {
        if (status.qrCode) {
            this.showQRCode(status.qrCode);
        }

        if (status.isReady) {
            this.hideQRCode();
            this.showMainApp();
            this.isConnected = true;
            this.updateStatus('WhatsApp Connected');
            this.loadChats();
        }
    }

    showQRCode(qrCode) {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('qr-screen').classList.remove('hidden');
        document.getElementById('qr-code').innerHTML =
            `<img src="${qrCode}" alt="QR Code">`;
    }

    hideQRCode() {
        document.getElementById('qr-screen').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }


    renderChatList(chats = []) {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';

        if (chats.length === 0) {
            chatList.innerHTML = `
                <div class="no-chats">
                    <p>No chats found</p>
                </div>
            `;
            return;
        }

        // Add each chat to the list
        chats.forEach((chat) => {
            this.addChatToList(chat);
        });

        console.log(`Rendered ${chats.length} chats`);
    }

    addChatToList(chat) {
        const chatList = document.getElementById('chat-list');
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;

        // Check if chat is pinned
        const isPinned = this.pinnedChats.has(chat.id);
        if (isPinned) {
            chatItem.classList.add('pinned');
        }

        // Get last message preview
        const messagePreview = this.getLastMessagePreview(chat);

        // Format timestamp
        const timestamp = chat.lastMessage
            ? chat.lastMessage.timestamp * 1000
            : chat.timestamp;

        chatItem.innerHTML = `
            <div class="chat-avatar">
                <i class="fas ${chat.isGroup ? 'fa-users' : 'fa-user'}"></i>
                ${chat.unreadCount > 0 ? '<div class="unread-dot"></div>' : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name ${chat.unreadCount > 0 ? 'unread-name' : ''}">${chat.name || 'Unknown'}</div>
                <div class="chat-preview ${chat.unreadCount > 0 ? 'unread-message' : ''}">${this.escapeHtml(messagePreview)}</div>
            </div>
            <div class="chat-meta">
                <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-chat-id="${chat.id}" title="${isPinned ? 'Unpin' : 'Pin'} chat">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <div class="chat-time ${chat.unreadCount > 0 ? 'unread-time' : ''}">${this.formatTime(timestamp)}</div>
                ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
            </div>
        `;

        // Add unread styling
        if (chat.unreadCount > 0) {
            chatItem.classList.add('unread');
        }

        // Pin button click handler
        const pinBtn = chatItem.querySelector('.pin-btn');
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePinChat(chat.id);
        });

        chatItem.addEventListener('click', () => {
            this.selectChat(chat.id);
        });

        // Insert pinned chats at the top
        if (isPinned) {
            const firstUnpinned = chatList.querySelector('.chat-item:not(.pinned)');
            if (firstUnpinned) {
                chatList.insertBefore(chatItem, firstUnpinned);
            } else {
                chatList.appendChild(chatItem);
            }
        } else {
            chatList.appendChild(chatItem);
        }
    }

    selectChat(chatId) {
        // Store current chat in localStorage
        localStorage.setItem('currentChatId', chatId);

        // Update active chat
        document.querySelectorAll('.chat-item').forEach((item) => {
            item.classList.remove('active');
        });

        document
            .querySelector(`[data-chat-id="${chatId}"]`)
            .classList.add('active');

        this.currentChatId = chatId;
        this.loadChatMessages(chatId);
        this.updateChatHeader(chatId);

        // Mark chat as read
        this.markChatAsRead(chatId);

        // Enable message input
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        messageInput.disabled = false;
        sendBtn.disabled = messageInput.value.trim().length === 0;

        // Show chat area on mobile
        if (window.innerWidth <= 768) {
            const chatArea = document.querySelector('.chat-area');
            chatArea.classList.add('active');
        }
    }

    async loadChatMessages(chatId) {
        try {
            console.log(`Loading messages for chat: ${chatId}`);
            this.showLoadingState();

            const response = await fetch(`/api/chat/${chatId}`);
            const messages = await response.json();

            console.log(
                `Loaded ${messages.length} messages for chat ${chatId}`,
            );
            this.messages.set(chatId, messages);
            this.renderMessages(messages);
            this.hideLoadingState();
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages.set(chatId, []);
            this.renderMessages([]);
            this.hideLoadingState();
            this.showNotification('Failed to load messages', 'error');
        }
    }

    renderMessages(messages) {
        const messagesArea = document.getElementById('messages-area');
        messagesArea.innerHTML = '';

        if (messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i class="fab fa-whatsapp"></i>
                        <h2>Start a conversation</h2>
                        <p>Send a message to begin chatting with AI assistance</p>
                    </div>
                </div>
            `;
            return;
        }

        messages.forEach((message) => {
            this.renderMessage(message);
        });

        this.scrollToBottom();
    }

    addMessageToChat(message) {
        const messagesArea = document.getElementById('messages-area');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.fromMe ? 'sent' : 'received'} fade-in`;

        if (message.isAI) {
            messageElement.classList.add('ai-message');
        }

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                ${message.isAI ? '<div class="ai-indicator">🤖 AI Assistant</div>' : ''}
                <div class="message-text">${this.escapeHtml(message.body)}</div>
                <div class="message-time">${this.formatTime(message.timestamp * 1000)}</div>
            </div>
        `;

        messagesArea.appendChild(messageElement);
        this.scrollToBottom();
    }

    handleNewMessage(data) {
        const { chatId, message, chatName } = data;

        // Update chat list if this is a new chat
        if (!this.chats.has(chatId)) {
            this.addChatToList({
                id: chatId,
                name: chatName,
                lastMessage: message.body,
                timestamp: message.timestamp * 1000,
                unreadCount: 0,
            });
            this.chats.set(chatId, { name: chatName });
        }

        // Add message to current chat if it's the active one
        if (this.currentChatId === chatId) {
            this.addMessageToChat(message);
        }

        // Update chat history
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        this.messages.get(chatId).push(message);
    }

    async sendMessage(
        text = '',
        type = 'text',
        mediaData = null,
        filename = null,
    ) {
        if (!text && !mediaData) {
            const messageInput = document.getElementById('message-input');
            text = messageInput.value.trim();
        }

        if ((!text && !mediaData) || !this.currentChatId || !this.isConnected) {
            return;
        }

        // Add message to UI immediately
        const messageData = {
            id: `temp_${Date.now()}`,
            body: text || this.getMediaPreview(type, filename),
            from: this.currentChatId,
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000),
            type: type,
            mediaData: mediaData,
            filename: filename,
        };

        this.addMessageToChat(messageData);

        // Store in local history
        if (!this.messages.has(this.currentChatId)) {
            this.messages.set(this.currentChatId, []);
        }
        this.messages.get(this.currentChatId).push(messageData);

        // Clear input for text messages
        if (type === 'text') {
            const messageInput = document.getElementById('message-input');
            messageInput.value = '';
            messageInput.dispatchEvent(new Event('input'));
        }

        // Send to server
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: text,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
        }
    }

    async generateAIResponses(message, context = '') {
        try {
            const response = await fetch('/api/generate-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: message,
                    context: context,
                }),
            });

            const data = await response.json();
            return data.responses;
        } catch (error) {
            console.error('Error generating AI responses:', error);
            return ['Sorry, I encountered an error generating responses.'];
        }
    }

    showAIModal(responses) {
        const modal = document.getElementById('ai-modal');
        const responsesContainer = document.getElementById('ai-responses');

        responsesContainer.innerHTML = '';

        responses.forEach((response, index) => {
            const responseElement = document.createElement('div');
            responseElement.className = 'ai-response';
            responseElement.innerHTML = `
                <div class="ai-response-header">
                    <div class="ai-response-title">Option ${index + 1}</div>
                </div>
                <div class="ai-response-text">${this.escapeHtml(response)}</div>
            `;

            responseElement.addEventListener('click', () => {
                this.useAIResponse(response);
            });

            responsesContainer.appendChild(responseElement);
        });

        modal.classList.remove('hidden');
    }

    hideAIModal() {
        document.getElementById('ai-modal').classList.add('hidden');
    }

    useAIResponse(response) {
        if (this.currentChatId) {
            // Send the AI response as a message
            const messageInput = document.getElementById('message-input');
            messageInput.value = response;
            this.sendMessage();
        }
        this.hideAIModal();
    }

    async generateMoreAI() {
        const generateMoreBtn = document.getElementById('generate-more-btn');
        generateMoreBtn.disabled = true;
        generateMoreBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            this.socket.emit('generate-more-ai', {
                chatId: this.currentChatId,
                message: 'Generate more responses',
                context: '',
            });
        } catch (error) {
            console.error('Error generating more AI:', error);
        }
    }

    handleAIResponses(data) {
        const { responses } = data;
        this.showAIModal(responses, data.originalMessage);

        // Reset generate more button
        const generateMoreBtn = document.getElementById('generate-more-btn');
        generateMoreBtn.disabled = false;
        generateMoreBtn.innerHTML =
            '<i class="fas fa-refresh"></i> Generate More';
    }

    updateChatHeader(chatId) {
        const chat = this.chats.get(chatId);
        const chatNameEl = document.getElementById('chat-name');
        const chatStatusEl = document.getElementById('chat-status');
        
        if (chat) {
            chatNameEl.textContent = chat.name;
            // Show actual status instead of always "Online"
            chatStatusEl.textContent = this.getChatStatus(chat);
            
            // Make chat name clickable to show details
            chatNameEl.style.cursor = 'pointer';
            chatNameEl.onclick = () => this.showChatDetails(chatId);
        } else {
            // Try to find chat in the current chat list
            const chatItem = document.querySelector(
                `[data-chat-id="${chatId}"]`,
            );
            if (chatItem) {
                const chatName =
                    chatItem.querySelector('.chat-name').textContent;
                chatNameEl.textContent = chatName;
                chatStatusEl.textContent = 'Click name for details';
                chatNameEl.style.cursor = 'pointer';
                chatNameEl.onclick = () => this.showChatDetails(chatId);
            }
        }
    }

    getChatStatus(chat) {
        // Don't show everyone as online - show last seen or typing status
        if (chat.isGroup) {
            return `${chat.participants || 0} participants`;
        }
        
        if (chat.isTyping) {
            return 'typing...';
        }
        
        if (chat.lastSeen) {
            const lastSeenTime = new Date(chat.lastSeen * 1000);
            const now = new Date();
            const diff = now - lastSeenTime;
            
            // Only show online if very recent (within 2 minutes)
            if (diff < 120000) {
                return 'Online';
            } else if (diff < 3600000) { // Within 1 hour
                return `Last seen ${Math.floor(diff / 60000)}m ago`;
            } else if (diff < 86400000) { // Within 24 hours
                return `Last seen ${Math.floor(diff / 3600000)}h ago`;
            } else {
                return `Last seen ${lastSeenTime.toLocaleDateString()}`;
            }
        }
        
        return 'Click name for details';
    }

    togglePinChat(chatId) {
        if (this.pinnedChats.has(chatId)) {
            this.pinnedChats.delete(chatId);
        } else {
            this.pinnedChats.add(chatId);
        }
        
        // Save to localStorage
        localStorage.setItem('pinnedChats', JSON.stringify([...this.pinnedChats]));
        
        // Refresh chat list to reorder
        this.refreshChats();
    }

    async showChatDetails(chatId) {
        try {
            const response = await fetch(`/api/chat-details/${chatId}`);
            const chatDetails = await response.json();
            
            // Create modal for chat details
            const modal = document.createElement('div');
            modal.className = 'chat-details-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="background: #2a3942; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="color: #e9edef; margin: 0;">Chat Details</h2>
                        <button class="close-btn" style="background: #3b4a54; border: none; color: #e9edef; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="width: 100px; height: 100px; background: #25d366; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; margin-bottom: 1rem;">
                            <i class="fas ${chatDetails.isGroup ? 'fa-users' : 'fa-user'}"></i>
                        </div>
                        <h3 style="color: #e9edef; margin: 0.5rem 0;">${chatDetails.name || 'Unknown'}</h3>
                        <p style="color: #8696a0; font-size: 0.9rem;">${chatDetails.number || chatId}</p>
                    </div>
                    
                    <div style="background: #202c33; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="color: #e9edef; margin: 0 0 1rem 0;">Information</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #8696a0;">Type:</span>
                                <span style="color: #e9edef;">${chatDetails.isGroup ? 'Group' : 'Contact'}</span>
                            </div>
                            ${chatDetails.participants ? `
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #8696a0;">Participants:</span>
                                    <span style="color: #e9edef;">${chatDetails.participants}</span>
                                </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #8696a0;">Messages:</span>
                                <span style="color: #e9edef;">${chatDetails.messageCount || 0}</span>
                            </div>
                            ${chatDetails.sharedChats && chatDetails.sharedChats.length > 0 ? `
                                <div>
                                    <span style="color: #8696a0; display: block; margin-bottom: 0.5rem;">Shared Chats:</span>
                                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                        ${chatDetails.sharedChats.map(chat => `
                                            <span style="color: #e9edef; padding: 0.25rem 0.5rem; background: #3b4a54; border-radius: 4px;">${chat.name}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <button class="btn-primary" onclick="window.open('tel:${chatDetails.number}')" style="flex: 1; background: #25d366; color: white; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-phone"></i> Call
                        </button>
                        <button class="btn-secondary" style="flex: 1; background: #3b4a54; color: #e9edef; border: none; padding: 0.75rem; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-search"></i> Search Messages
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal handlers
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.closest('.close-btn')) {
                    document.body.removeChild(modal);
                }
            });
            
        } catch (error) {
            console.error('Error loading chat details:', error);
            this.showNotification('Failed to load chat details', 'error');
        }
    }

    async refreshChats() {
        if (this.isConnected) {
            try {
                console.log('Manually refreshing chats...');
                const response = await fetch('/api/chats');
                const chats = await response.json();
                this.renderChatList(chats);
                this.showNotification(
                    `Loaded ${chats.length} chats`,
                    'success',
                );
            } catch (error) {
                console.error('Error refreshing chats:', error);
                this.showNotification('Failed to refresh chats', 'error');
            }
        } else {
            this.showNotification('Not connected to WhatsApp', 'error');
        }
    }

    switchTab(tab) {
        const chatsTab = document.getElementById('chats-tab');
        const contactsTab = document.getElementById('contacts-tab');
        const chatList = document.getElementById('chat-list');
        const contactsList = document.getElementById('contacts-list');

        // Update tab buttons
        chatsTab.classList.toggle('active', tab === 'chats');
        contactsTab.classList.toggle('active', tab === 'contacts');

        // Show/hide content
        chatList.classList.toggle('hidden', tab !== 'chats');
        contactsList.classList.toggle('hidden', tab !== 'contacts');

        // Load contacts if switching to contacts tab
        if (tab === 'contacts') {
            this.loadContacts();
        }
    }


    renderContactsList(contacts) {
        const contactsList = document.getElementById('contacts-list');
        contactsList.innerHTML = '';

        if (contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="no-contacts">
                    <p>No contacts found</p>
                </div>
            `;
            return;
        }

        // Add each contact to the list
        contacts.forEach((contact) => {
            this.addContactToList(contact);
        });

        console.log(`Rendered ${contacts.length} contacts`);
    }

    addContactToList(contact) {
        const contactsList = document.getElementById('contacts-list');
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.dataset.contactId = contact.id;

        const displayName =
            contact.name || contact.pushname || contact.number || 'Unknown';
        const status = contact.status || 'Available';

        contactItem.innerHTML = `
            <div class="contact-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="contact-info">
                <div class="contact-name">${this.escapeHtml(displayName)}</div>
                <div class="contact-number">${contact.number}</div>
                <div class="contact-status">${status}</div>
            </div>
        `;

        contactItem.addEventListener('click', () => {
            this.showContactDetails(contact);
        });

        contactsList.appendChild(contactItem);
    }

    startChatWithContact(contact) {
        // Switch back to chats tab
        this.switchTab('chats');

        // Find or create chat with this contact
        const chatId = contact.id;
        this.selectChat(chatId);

        this.showNotification(
            `Starting chat with ${contact.name || contact.number}`,
            'info',
        );
    }

    showGoogleSync() {
        document
            .getElementById('google-sync-section')
            .classList.remove('hidden');
    }

    hideGoogleSync() {
        document.getElementById('google-sync-section').classList.add('hidden');
    }

    showGoogleAuth() {
        // For now, show manual token input
        this.showManualTokenInput();
    }

    showManualTokenInput() {
        const token = prompt('Enter your Google access token:');
        if (token) {
            this.syncWithGoogleContacts(token);
        }
    }

    async syncWithGoogleContacts(accessToken) {
        try {
            this.showNotification('Syncing with Google Contacts...', 'info');

            const response = await fetch('/api/sync-google-contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken }),
            });

            const result = await response.json();
            this.showSyncResults(result);
        } catch (error) {
            console.error('Google sync error:', error);
            this.showNotification(
                'Failed to sync with Google Contacts',
                'error',
            );
        }
    }

    showSyncResults(result) {
        const syncResults = document.getElementById('sync-results');
        syncResults.classList.remove('hidden');

        syncResults.innerHTML = `
            <div class="sync-stats">
                <div class="stat-item">
                    <div class="stat-number">${result.totalGoogleContacts}</div>
                    <div class="stat-label">Google Contacts</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${result.totalWhatsAppContacts}</div>
                    <div class="stat-label">WhatsApp Contacts</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${result.matches.length}</div>
                    <div class="stat-label">Matches Found</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${result.unmatched.length}</div>
                    <div class="stat-label">Unmatched</div>
                </div>
            </div>
            
            <div class="matches-list">
                <h4>Matches (${result.matches.length})</h4>
                ${result.matches
        .slice(0, 10)
        .map(
            (match) => `
                    <div class="match-item">
                        <strong>${match.googleName}</strong> ↔ ${match.whatsappName}<br>
                        <small>${match.phoneNumber}</small>
                    </div>
                `,
        )
        .join('')}
                ${result.matches.length > 10 ? `<p>... and ${result.matches.length - 10} more matches</p>` : ''}
            </div>
            
            <div class="unmatched-list">
                <h4>Unmatched Google Contacts (${result.unmatched.length})</h4>
                ${result.unmatched
        .slice(0, 10)
        .map(
            (unmatched) => `
                    <div class="unmatched-item">
                        <strong>${unmatched.name}</strong><br>
                        <small>${unmatched.phoneNumber}</small>
                    </div>
                `,
        )
        .join('')}
                ${result.unmatched.length > 10 ? `<p>... and ${result.unmatched.length - 10} more unmatched</p>` : ''}
            </div>
        `;

        this.showNotification(
            `Sync complete: ${result.matches.length} matches found`,
            'success',
        );
    }

    showCacheSection() {
        document.getElementById('cache-section').classList.remove('hidden');
        this.loadCacheStats();
    }

    hideCacheSection() {
        document.getElementById('cache-section').classList.add('hidden');
    }

    async loadCacheStats() {
        try {
            const response = await fetch('/api/cache/stats');
            const stats = await response.json();
            this.displayCacheStats(stats);
        } catch (error) {
            console.error('Error loading cache stats:', error);
            this.showNotification('Failed to load cache stats', 'error');
        }
    }

    displayCacheStats(stats) {
        const cacheStats = document.getElementById('cache-stats');
        cacheStats.innerHTML = `
            <h4>Cache Statistics</h4>
            <div class="cache-stat-item">
                <span>Cached Chats:</span>
                <span>${stats.chats || 0}</span>
            </div>
            <div class="cache-stat-item">
                <span>Cached Messages:</span>
                <span>${stats.messages || 0}</span>
            </div>
            <div class="cache-stat-item">
                <span>Cached Contacts:</span>
                <span>${stats.contacts || 0}</span>
            </div>
            <div class="cache-stat-item">
                <span>Cached Images:</span>
                <span>${stats.images || 0}</span>
            </div>
        `;
    }

    async clearAllCache() {
        try {
            const response = await fetch('/api/cache/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: null }),
            });

            const result = await response.json();
            this.showNotification(result.message, 'success');
            this.loadCacheStats();
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showNotification('Failed to clear cache', 'error');
        }
    }

    filterChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const lowerQuery = query.toLowerCase();

        chatItems.forEach((item) => {
            const chatName = item
                .querySelector('.chat-name')
                .textContent.toLowerCase();
            const chatPreview = item
                .querySelector('.chat-preview')
                .textContent.toLowerCase();

            if (
                chatName.includes(lowerQuery) ||
                chatPreview.includes(lowerQuery)
            ) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    scrollToBottom() {
        const messagesArea = document.getElementById('messages-area');
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    updateStatus(text) {
        const statusText = document.getElementById('status-text');
        const statusDot = document.querySelector('.status-dot');

        statusText.textContent = text;

        if (text.includes('Connected')) {
            statusDot.classList.add('connected');
        } else {
            statusDot.classList.remove('connected');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff6b6b' : '#25d366'};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showLoadingState() {
        const messagesArea = document.getElementById('messages-area');
        messagesArea.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;
    }

    hideLoadingState() {
        // Loading state will be replaced by actual messages
    }

    getLastMessagePreview(chat) {
        if (!chat.lastMessage) {
            return 'No messages';
        }

        const message = chat.lastMessage;
        let preview = message.body || '';

        // Handle different message types
        if (message.type === 'image') {
            preview = '📷 Image';
        } else if (message.type === 'video') {
            preview = '🎥 Video';
        } else if (message.type === 'audio') {
            preview = '🎵 Audio';
        } else if (message.type === 'document') {
            preview = '📄 Document';
        } else if (message.type === 'sticker') {
            preview = '😀 Sticker';
        } else if (message.type === 'location') {
            preview = '📍 Location';
        } else if (message.type === 'contact') {
            preview = '👤 Contact';
        }

        // Add sender info for group chats
        if (chat.isGroup && !message.fromMe) {
            const senderName = message.fromName || 'Unknown';
            preview = `${senderName}: ${preview}`;
        }

        // Add "You:" prefix for sent messages
        if (message.fromMe) {
            preview = `You: ${preview}`;
        }

        // Truncate long messages
        if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
        }

        return this.escapeHtml(preview);
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
        }
    }

    showBrowserNotification(title, body, icon = null) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'whatsapp-ai',
                requireInteraction: false,
                silent: false,
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    handleNewMessageNotification(message) {
        // Show notification for new messages (not from current user)
        if (!message.fromMe && this.currentChatId !== message.chatId) {
            const chatName =
                this.chats.get(message.chatId)?.name || 'Unknown Chat';
            const senderName = message.fromName || 'Someone';
            const messagePreview = message.body
                ? message.body.length > 50
                    ? message.body.substring(0, 50) + '...'
                    : message.body
                : 'New message';

            this.showBrowserNotification(
                `${senderName} in ${chatName}`,
                messagePreview,
            );
        }
    }

    // Voice Recording Methods
    startVoiceRecording() {
        if (!this.isConnected) {
            this.showNotification('Not connected to WhatsApp', 'error');
            return;
        }

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, {
                        type: 'audio/wav',
                    });
                    this.recordedAudio = audioBlob;
                    this.showVoiceRecordingOverlay();
                };

                this.mediaRecorder.start();
                this.showVoiceRecordingOverlay();
            })
            .catch((error) => {
                console.error('Error accessing microphone:', error);
                this.showNotification('Microphone access denied', 'error');
            });
    }

    showVoiceRecordingOverlay() {
        document
            .getElementById('voice-recording-overlay')
            .classList.remove('hidden');
    }

    hideVoiceRecordingOverlay() {
        document
            .getElementById('voice-recording-overlay')
            .classList.add('hidden');
    }

    cancelVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream
                .getTracks()
                .forEach((track) => track.stop());
        }
        this.recordedAudio = null;
        this.hideVoiceRecordingOverlay();
    }

    sendVoiceMessage() {
        if (!this.recordedAudio || !this.currentChatId) {
            this.showNotification('No voice message to send', 'error');
            return;
        }

        // Convert audio to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            this.sendMessage('', 'audio', base64Audio);
        };
        reader.readAsDataURL(this.recordedAudio);

        this.hideVoiceRecordingOverlay();
        this.recordedAudio = null;
    }

    // Export/Import Methods
    showExportImportSection() {
        document
            .getElementById('export-import-section')
            .classList.remove('hidden');
    }

    hideExportImportSection() {
        document
            .getElementById('export-import-section')
            .classList.add('hidden');
    }

    async exportData(type) {
        try {
            let data = {};
            let filename = '';

            switch (type) {
            case 'chats':
                data = await this.fetchAllChats();
                filename = 'whatsapp-chats.json';
                break;
            case 'messages':
                data = await this.fetchAllMessages();
                filename = 'whatsapp-messages.json';
                break;
            case 'contacts':
                data = await this.fetchAllContacts();
                filename = 'whatsapp-contacts.json';
                break;
            case 'media':
                data = await this.fetchAllMedia();
                filename = 'whatsapp-media.json';
                break;
            case 'all':
                data = {
                    chats: await this.fetchAllChats(),
                    messages: await this.fetchAllMessages(),
                    contacts: await this.fetchAllContacts(),
                    media: await this.fetchAllMedia(),
                    exportDate: new Date().toISOString(),
                };
                filename = 'whatsapp-export-all.json';
                break;
            }

            this.downloadJSON(data, filename);
            this.showNotification(`${type} exported successfully`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    async fetchAllChats() {
        const response = await fetch('/api/chats');
        return await response.json();
    }

    async fetchAllMessages() {
        const chats = await this.fetchAllChats();
        const allMessages = {};

        for (const chat of chats) {
            try {
                const response = await fetch(`/api/chat/${chat.id}`);
                const messages = await response.json();
                allMessages[chat.id] = messages;
            } catch (error) {
                console.error(
                    `Error fetching messages for chat ${chat.id}:`,
                    error,
                );
            }
        }

        return allMessages;
    }

    async fetchAllContacts() {
        const response = await fetch('/api/contacts');
        return await response.json();
    }

    async fetchAllMedia() {
        // This would need backend implementation to fetch media files
        return { message: 'Media export not yet implemented' };
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleFileImport(files) {
        const preview = document.getElementById('import-preview');
        preview.innerHTML = '';

        Array.from(files).forEach((file) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-preview-item';

            const icon = this.getFileIcon(file.type);
            const size = this.formatFileSize(file.size);

            fileItem.innerHTML = `
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${size}</div>
                </div>
            `;

            preview.appendChild(fileItem);
        });

        // Send files to current chat
        if (this.currentChatId && files.length > 0) {
            this.sendFilesToChat(files);
        }
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('document')) return '📝';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async sendFilesToChat(files) {
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                this.sendMessage('', file.type, base64, file.name);
            };
            reader.readAsDataURL(file);
        }
    }

    getMediaPreview(type, filename) {
        switch (type) {
        case 'audio':
            return '🎵 Voice message';
        case 'image':
            return '📷 Image';
        case 'video':
            return '🎥 Video';
        case 'document':
            return `📄 ${filename || 'Document'}`;
        default:
            return '📎 File';
        }
    }

    renderMessage(message) {
        const messagesArea = document.getElementById('messages-area');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.fromMe ? 'sent' : 'received'}`;

        let messageContent = '';

        // Debug logging
        console.log('Rendering message:', {
            type: message.type,
            hasMedia: message.hasMedia,
            body: message.body?.substring(0, 50) + '...',
            media: message.media,
        });

        // Check for voice messages by type or body content
        if (
            message.type === 'audio' ||
            message.type === 'ptt' ||
            (message.body && message.body.includes('voice'))
        ) {
            console.log('Rendering as voice message');
            messageContent = this.renderVoiceMessage(message);
        } else if (message.type === 'image' || message.type === 'video') {
            messageContent = this.renderMediaMessage(message);
        } else if (message.type === 'document') {
            messageContent = this.renderDocumentMessage(message);
        } else {
            messageContent = `<div class="message-text">${this.escapeHtml(message.body)}</div>`;
        }

        // Add timestamp and status
        const timestamp = this.formatTime(message.timestamp * 1000);
        const status = message.fromMe
            ? '<span class="message-status delivered">✓</span>'
            : '';

        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${messageContent}
                <div class="message-time">
                    ${timestamp}
                    ${status}
                </div>
            </div>
        `;

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    renderVoiceMessage(message) {
        const messageId = message.id || message.id._serialized || 'unknown';
        const audioData =
            message.body || (message.media && message.media.data) || '';
        const mimeType =
            (message.media && message.media.mimetype) || 'audio/ogg';

        console.log('Rendering voice message:', {
            messageId,
            hasAudioData: !!audioData,
            mimeType,
        });

        return `
            <div class="voice-message" data-message-id="${messageId}">
                <button class="voice-play-btn" data-message-id="${messageId}">
                    <i class="fas fa-play"></i>
                </button>
                <div class="voice-info">
                    <div class="voice-duration">Voice message</div>
                    <div class="voice-timestamp">${this.formatTime(message.timestamp * 1000)}</div>
                </div>
                <audio id="voice-audio-${messageId}" preload="none" controls style="display: none;">
                    <source src="data:${mimeType};base64,${audioData}" type="${mimeType}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `;
    }

    renderMediaMessage(message) {
        const mediaUrl = message.mediaData
            ? `data:${message.type};base64,${message.mediaData}`
            : '';
        const isImage =
            message.type === 'image' ||
            message.media?.mimetype?.startsWith('image/');

        if (isImage) {
            return `
                <div class="image-preview-container">
                    <img src="${mediaUrl}" alt="Image" class="message-image">
                    <div class="image-overlay">
                        <i class="fas fa-expand"></i>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="media-message">
                    <div class="media-preview">
                        <i class="fas fa-file-video" style="font-size: 48px; color: #8696a0;"></i>
                    </div>
                    <div class="media-info">
                        <div class="media-filename">${message.media?.filename || 'Video'}</div>
                        <div class="media-size">${this.getMediaPreview(message.type, message.media?.filename)}</div>
                    </div>
                </div>
            `;
        }
    }

    renderDocumentMessage(message) {
        return `
            <div class="document-message">
                <div class="document-icon">📄</div>
                <div class="document-info">
                    <div class="document-filename">${message.filename || 'Document'}</div>
                    <div class="document-size">Document</div>
                </div>
                <button class="download-btn" onclick="this.downloadDocument('${message.id}')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
    }

    // Contact Details Methods
    showContactDetails(contact) {
        document
            .getElementById('contact-details-section')
            .classList.remove('hidden');
        this.renderContactDetails(contact);
    }

    hideContactDetails() {
        document
            .getElementById('contact-details-section')
            .classList.add('hidden');
    }

    async renderContactDetails(contact) {
        const content = document.getElementById('contact-details-content');

        // Get contact's groups
        const groups = await this.getContactGroups(contact.id);

        const status = this.getContactStatus(contact);
        const lastSeen = contact.lastSeen
            ? this.formatLastSeen(contact.lastSeen)
            : 'Unknown';

        content.innerHTML = `
            <div class="contact-profile">
                <div class="contact-avatar-large">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-name-large">${this.escapeHtml(contact.name || contact.pushname || contact.number)}</div>
                <div class="contact-status-large">${status}</div>
            </div>
            
            <div class="contact-info-grid">
                <div class="contact-info-item">
                    <div class="contact-info-icon">
                        <i class="fas fa-phone"></i>
                    </div>
                    <div class="contact-info-text">
                        <div class="contact-info-label">Phone Number</div>
                        <div class="contact-info-value">${contact.number}</div>
                    </div>
                </div>
                
                <div class="contact-info-item">
                    <div class="contact-info-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="contact-info-text">
                        <div class="contact-info-label">Last Seen</div>
                        <div class="contact-info-value">${lastSeen}</div>
                    </div>
                </div>
                
                <div class="contact-info-item">
                    <div class="contact-info-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="contact-info-text">
                        <div class="contact-info-label">WhatsApp Contact</div>
                        <div class="contact-info-value">${contact.isWAContact ? 'Yes' : 'No'}</div>
                    </div>
                </div>
                
                <div class="contact-info-item">
                    <div class="contact-info-icon">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="contact-info-text">
                        <div class="contact-info-label">Status</div>
                        <div class="contact-info-value">${status}</div>
                    </div>
                </div>
            </div>
            
            ${
    groups.length > 0
        ? `
                <div class="contact-groups">
                    <h4>Groups in Common (${groups.length})</h4>
                    ${groups
        .map(
            (group) => `
                        <div class="group-item" onclick="this.selectGroup('${group.id}')">
                            <div class="group-avatar">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="group-info">
                                <div class="group-name">${this.escapeHtml(group.name)}</div>
                                <div class="group-participants">${group.participants} participants</div>
                            </div>
                        </div>
                    `,
        )
        .join('')}
                </div>
            `
        : ''
}
            
            <div class="contact-actions" style="margin-top: 2rem; text-align: center;">
                <button class="btn-primary" onclick="this.startChatWithContact('${contact.id}')">
                    <i class="fas fa-comment"></i> Start Chat
                </button>
            </div>
        `;
    }

    getContactStatus(contact) {
        // More conservative online status detection
        if (contact.isUser) {
            return 'Online';
        } else if (contact.lastSeen) {
            const lastSeenTime = new Date(contact.lastSeen * 1000);
            const now = new Date();
            const diff = now - lastSeenTime;

            // Only show as online if very recent (within 1 minute)
            if (diff < 60000) {
                // 1 minute
                return 'Online';
            } else if (diff < 300000) {
                // 5 minutes
                return 'Recently online';
            } else if (diff < 3600000) {
                // 1 hour
                return `${Math.floor(diff / 60000)}m ago`;
            } else if (diff < 86400000) {
                // 24 hours
                return `${Math.floor(diff / 3600000)}h ago`;
            } else {
                return 'Offline';
            }
        } else {
            return 'Unknown';
        }
    }

    formatLastSeen(timestamp) {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) {
            // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400000) {
            // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    async getContactGroups(contactId) {
        try {
            const response = await fetch(`/api/contact-groups/${contactId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching contact groups:', error);
            return [];
        }
    }

    // Auto-load data methods
    autoLoadData() {
        console.log('Auto-loading data...');
        this.loadChats();
        this.loadContacts();
    }

    async loadChats() {
        if (this.isConnected) {
            try {
                console.log('Loading chats...');
                const response = await fetch('/api/chats');
                const chats = await response.json();
                this.renderChatList(chats);
                console.log(`Auto-loaded ${chats.length} chats`);
            } catch (error) {
                console.error('Error auto-loading chats:', error);
            }
        }
    }

    async loadContacts() {
        if (this.isConnected) {
            try {
                console.log('Loading contacts...');
                const response = await fetch('/api/contacts');
                const contacts = await response.json();
                this.renderContactsList(contacts);
                console.log(`Auto-loaded ${contacts.length} contacts`);
            } catch (error) {
                console.error('Error auto-loading contacts:', error);
            }
        }
    }

    // Improved connection handling
    handleConnectionState() {
        if (this.isConnected) {
            this.updateStatus('Connected to WhatsApp');
            this.hideLoadingScreen();
            this.showMainApp();
            // Auto-load data if not already loaded
            if (document.getElementById('chat-list').children.length === 0) {
                this.autoLoadData();
            }
        } else {
            this.updateStatus('Connecting to WhatsApp...');
            this.showLoadingScreen();
        }
    }

    startDataCheck() {
        // Check every 2 seconds if data needs to be loaded
        setInterval(() => {
            if (this.isConnected) {
                const chatList = document.getElementById('chat-list');
                const contactsList = document.getElementById('contacts-list');

                // Auto-load chats if not loaded
                if (chatList && chatList.children.length === 0) {
                    console.log('Auto-loading chats (periodic check)');
                    this.loadChats();
                }

                // Auto-load contacts if not loaded
                if (contactsList && contactsList.children.length === 0) {
                    console.log('Auto-loading contacts (periodic check)');
                    this.loadContacts();
                }
            }
        }, 2000);
    }

    // Voice message playback
    playVoiceMessage(messageId) {
        console.log('Playing voice message:', messageId);
        const audioElement = document.getElementById(
            `voice-audio-${messageId}`,
        );
        const playBtn = document.querySelector(
            `[data-message-id="${messageId}"] .voice-play-btn i`,
        );

        if (!audioElement) {
            console.error('Audio element not found for message:', messageId);
            this.showNotification('Voice message not available', 'error');
            return;
        }

        console.log('Audio element found:', audioElement);
        console.log('Audio source:', audioElement.querySelector('source')?.src);

        if (audioElement.paused) {
            console.log('Starting playback...');
            audioElement
                .play()
                .then(() => {
                    console.log('Voice message started playing');
                    if (playBtn) {
                        playBtn.className = 'fas fa-pause';
                    }
                    this.showNotification('Playing voice message', 'success');
                })
                .catch((error) => {
                    console.error('Error playing voice message:', error);
                    this.showNotification(
                        `Error playing voice message: ${error.message}`,
                        'error',
                    );

                    // Try to show the audio element for debugging
                    audioElement.style.display = 'block';
                    audioElement.controls = true;
                });
        } else {
            console.log('Pausing playback...');
            audioElement.pause();
            if (playBtn) {
                playBtn.className = 'fas fa-play';
            }
            this.showNotification('Voice message paused', 'info');
        }

        // Update button when audio ends
        audioElement.addEventListener('ended', () => {
            console.log('Voice message ended');
            if (playBtn) {
                playBtn.className = 'fas fa-play';
            }
        });

        // Handle audio errors
        audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showNotification('Audio playback error', 'error');
        });
    }

    // AI Prompts functionality
    toggleAIPrompts() {
        const container = document.getElementById('ai-prompts-container');

        if (container.style.display === 'none') {
            this.showAIPrompts();
        } else {
            this.hideAIPrompts();
        }
    }

    showAIPrompts() {
        const container = document.getElementById('ai-prompts-container');
        const btn = document.getElementById('ai-prompts-btn');

        container.style.display = 'block';
        btn.classList.add('active');

        // Generate AI prompts based on current chat
        this.generateAIPrompts();
    }

    hideAIPrompts() {
        const container = document.getElementById('ai-prompts-container');
        const btn = document.getElementById('ai-prompts-btn');

        container.style.display = 'none';
        btn.classList.remove('active');
    }

    async generateAIPrompts() {
        if (!this.currentChatId) {
            this.showNotification('Please select a chat first', 'info');
            return;
        }

        try {
            // Get recent messages for context
            const response = await fetch(`/api/chat/${this.currentChatId}`);
            const messages = await response.json();

            if (messages.length === 0) {
                this.showDefaultPrompts();
                return;
            }

            // Detect language from recent messages
            const detectedLanguage = this.detectLanguage(messages);
            console.log('Detected chat language:', detectedLanguage);

            // Limit context to prevent payload too large error
            // Only use last 5 messages and truncate each message to 100 characters
            const context = messages
                .slice(-5)
                .map((msg) => {
                    const body = msg.body ? msg.body.substring(0, 100) : '';
                    return `${msg.fromMe ? 'You' : 'Other'}: ${body}`;
                })
                .join('\n');

            const promptRequest = {
                chatId: this.currentChatId,
                message: `Generate 5 helpful response suggestions in ${detectedLanguage}`,
                context: context,
                language: detectedLanguage,
            };

            const aiResponse = await fetch('/api/generate-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promptRequest),
            });

            if (!aiResponse.ok) {
                console.error('AI response error:', aiResponse.status, aiResponse.statusText);
                this.showDefaultPrompts(detectedLanguage);
                return;
            }

            const data = await aiResponse.json();

            if (data.responses && data.responses.length > 0) {
                this.displayAIPrompts(data.responses.slice(0, 5));
            } else {
                this.showDefaultPrompts(detectedLanguage);
            }
        } catch (error) {
            console.error('Error generating AI prompts:', error);
            this.showDefaultPrompts();
        }
    }

    // Language detection
    detectLanguage(messages) {
        const text = messages
            .slice(-5)
            .map((msg) => msg.body)
            .join(' ');

        // Simple language detection based on common words
        const languagePatterns = {
            German: [
                'der',
                'die',
                'das',
                'und',
                'ist',
                'ich',
                'du',
                'er',
                'sie',
                'es',
                'wir',
                'ihr',
                'sie',
                'haben',
                'sein',
                'werden',
                'können',
                'müssen',
                'sollen',
                'wollen',
                'dürfen',
            ],
            Spanish: [
                'el',
                'la',
                'los',
                'las',
                'de',
                'del',
                'en',
                'con',
                'por',
                'para',
                'que',
                'como',
                'cuando',
                'donde',
                'porque',
                'si',
                'no',
                'sí',
                'muy',
                'más',
                'menos',
                'todo',
                'nada',
                'algo',
            ],
            French: [
                'le',
                'la',
                'les',
                'de',
                'du',
                'des',
                'en',
                'avec',
                'pour',
                'que',
                'comme',
                'quand',
                'où',
                'pourquoi',
                'si',
                'non',
                'oui',
                'très',
                'plus',
                'moins',
                'tout',
                'rien',
                'quelque',
            ],
            Italian: [
                'il',
                'la',
                'lo',
                'gli',
                'le',
                'di',
                'del',
                'della',
                'dei',
                'delle',
                'in',
                'con',
                'per',
                'che',
                'come',
                'quando',
                'dove',
                'perché',
                'se',
                'no',
                'sì',
                'molto',
                'più',
                'meno',
                'tutto',
                'niente',
                'qualcosa',
            ],
            Portuguese: [
                'o',
                'a',
                'os',
                'as',
                'de',
                'do',
                'da',
                'dos',
                'das',
                'em',
                'com',
                'por',
                'para',
                'que',
                'como',
                'quando',
                'onde',
                'porque',
                'se',
                'não',
                'sim',
                'muito',
                'mais',
                'menos',
                'tudo',
                'nada',
                'algo',
            ],
            Dutch: [
                'de',
                'het',
                'een',
                'van',
                'in',
                'op',
                'met',
                'voor',
                'door',
                'over',
                'onder',
                'tussen',
                'naast',
                'achter',
                'voor',
                'bij',
                'aan',
                'uit',
                'naar',
                'tot',
                'vanaf',
                'sinds',
                'tijdens',
                'gedurende',
            ],
            Russian: [
                'и',
                'в',
                'на',
                'с',
                'по',
                'для',
                'от',
                'до',
                'из',
                'к',
                'у',
                'о',
                'об',
                'за',
                'под',
                'над',
                'между',
                'через',
                'без',
                'против',
                'вокруг',
                'около',
                'возле',
                'рядом',
            ],
            Chinese: [
                '的',
                '了',
                '在',
                '是',
                '我',
                '你',
                '他',
                '她',
                '它',
                '我们',
                '你们',
                '他们',
                '这',
                '那',
                '什么',
                '怎么',
                '为什么',
                '哪里',
                '什么时候',
                '谁',
                '多少',
                '几个',
                '一些',
                '很多',
                '没有',
                '有',
            ],
            Japanese: [
                'は',
                'が',
                'を',
                'に',
                'で',
                'と',
                'から',
                'まで',
                'より',
                'へ',
                'の',
                'も',
                'か',
                'や',
                'ね',
                'よ',
                'な',
                'だ',
                'です',
                'である',
                'いる',
                'ある',
                'する',
                'なる',
                'できる',
                'わかる',
                '知る',
                '見る',
                '聞く',
                '言う',
                '思う',
            ],
            Korean: [
                '은',
                '는',
                '이',
                '가',
                '을',
                '를',
                '에',
                '에서',
                '와',
                '과',
                '의',
                '도',
                '만',
                '부터',
                '까지',
                '보다',
                '처럼',
                '같이',
                '위해',
                '대해',
                '관해',
                '대한',
                '대해서',
                '위해서',
                '때문에',
                '덕분에',
                '통해',
                '통해서',
            ],
        };

        let maxScore = 0;
        let detectedLang = 'English';

        for (const [lang, patterns] of Object.entries(languagePatterns)) {
            let score = 0;
            patterns.forEach((pattern) => {
                const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });

            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
            }
        }

        return detectedLang;
    }

    showDefaultPrompts(language = 'English') {
        const defaultPrompts = {
            English: [
                'How are you?',
                'What\'s up?',
                'Thanks!',
                'See you later',
                '👍',
            ],
            German: [
                'Wie geht\'s?',
                'Was ist los?',
                'Danke!',
                'Bis später',
                '👍',
            ],
            Spanish: [
                '¿Cómo estás?',
                '¿Qué tal?',
                '¡Gracias!',
                'Hasta luego',
                '👍',
            ],
            French: [
                'Comment ça va?',
                'Quoi de neuf?',
                'Merci!',
                'À plus tard',
                '👍',
            ],
            Italian: ['Come stai?', 'Che succede?', 'Grazie!', 'A dopo', '👍'],
            Portuguese: [
                'Como vai?',
                'O que há?',
                'Obrigado!',
                'Até logo',
                '👍',
            ],
            Dutch: [
                'Hoe gaat het?',
                'Wat is er?',
                'Bedankt!',
                'Tot later',
                '👍',
            ],
            Russian: [
                'Как дела?',
                'Что нового?',
                'Спасибо!',
                'До свидания',
                '👍',
            ],
            Chinese: ['你好吗？', '怎么样？', '谢谢！', '再见', '👍'],
            Japanese: [
                '元気ですか？',
                'どうですか？',
                'ありがとう！',
                'また後で',
                '👍',
            ],
            Korean: [
                '어떻게 지내세요?',
                '뭐해요?',
                '감사합니다!',
                '나중에 봐요',
                '👍',
            ],
        };

        const prompts = defaultPrompts[language] || defaultPrompts['English'];
        this.displayAIPrompts(prompts);
    }

    displayAIPrompts(prompts) {
        const container = document.getElementById('ai-prompts-list');
        container.innerHTML = '';

        prompts.forEach((prompt) => {
            const button = document.createElement('button');
            button.className = 'ai-prompt-btn';
            button.textContent = prompt;
            container.appendChild(button);
        });
    }

    useAIPrompt(prompt) {
        const messageInput = document.getElementById('message-input');
        messageInput.value = prompt;
        messageInput.focus();
        this.hideAIPrompts();

        // Enable send button
        const sendBtn = document.getElementById('send-btn');
        sendBtn.disabled = false;
    }

    // Image preview functionality
    openImagePreview(imageUrl) {
        // Create modal for image preview
        const modal = document.createElement('div');
        modal.className = 'image-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            border: none;
            color: white;
            font-size: 24px;
            padding: 10px;
            border-radius: 50%;
            cursor: pointer;
        `;

        modal.appendChild(img);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);

        // Close modal on click
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.removeChild(modal);
        });
    }

    // Emoji picker functionality
    toggleEmojiPicker() {
        const messageInput = document.getElementById('message-input');
        const emojis = [
            '😀',
            '😃',
            '😄',
            '😁',
            '😆',
            '😅',
            '😂',
            '🤣',
            '😊',
            '😇',
            '🙂',
            '🙃',
            '😉',
            '😌',
            '😍',
            '🥰',
            '😘',
            '😗',
            '😙',
            '😚',
            '😋',
            '😛',
            '😝',
            '😜',
            '🤪',
            '🤨',
            '🧐',
            '🤓',
            '😎',
            '🤩',
            '🥳',
            '😏',
            '😒',
            '😞',
            '😔',
            '😟',
            '😕',
            '🙁',
            '☹️',
            '😣',
            '😖',
            '😫',
            '😩',
            '🥺',
            '😢',
            '😭',
            '😤',
            '😠',
            '😡',
            '🤬',
            '🤯',
            '😳',
            '🥵',
            '🥶',
            '😱',
            '😨',
            '😰',
            '😥',
            '😓',
            '🤗',
            '🤔',
            '🤭',
            '🤫',
            '🤥',
            '😶',
            '😐',
            '😑',
            '😬',
            '🙄',
            '😯',
            '😦',
            '😧',
            '😮',
            '😲',
            '🥱',
            '😴',
            '🤤',
            '😪',
            '😵',
            '🤐',
            '🥴',
            '🤢',
            '🤮',
            '🤧',
            '😷',
            '🤒',
            '🤕',
            '🤑',
            '🤠',
            '😈',
            '👿',
            '👹',
            '👺',
            '🤡',
            '💩',
            '👻',
            '💀',
            '☠️',
            '👽',
            '👾',
            '🤖',
            '🎃',
            '😺',
            '😸',
            '😹',
            '😻',
            '😼',
            '😽',
            '🙀',
            '😿',
            '😾',
        ];

        // Create emoji picker if it doesn't exist
        let emojiPicker = document.getElementById('emoji-picker');
        if (!emojiPicker) {
            emojiPicker = document.createElement('div');
            emojiPicker.id = 'emoji-picker';
            emojiPicker.className = 'emoji-picker';
            emojiPicker.style.cssText = `
                position: absolute;
                bottom: 60px;
                right: 20px;
                background: #2a3942;
                border: 1px solid #3b4a54;
                border-radius: 8px;
                padding: 10px;
                max-width: 200px;
                max-height: 150px;
                overflow-y: auto;
                display: none;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;

            // Add emojis
            emojis.forEach((emoji) => {
                const emojiBtn = document.createElement('button');
                emojiBtn.textContent = emoji;
                emojiBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 20px;
                    padding: 5px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                `;
                emojiBtn.addEventListener('mouseenter', () => {
                    emojiBtn.style.backgroundColor = '#3b4a54';
                });
                emojiBtn.addEventListener('mouseleave', () => {
                    emojiBtn.style.backgroundColor = 'transparent';
                });
                emojiBtn.addEventListener('click', () => {
                    messageInput.value += emoji;
                    messageInput.focus();
                    emojiPicker.style.display = 'none';
                });
                emojiPicker.appendChild(emojiBtn);
            });

            document.body.appendChild(emojiPicker);
        }

        // Toggle emoji picker
        if (emojiPicker.style.display === 'none') {
            emojiPicker.style.display = 'block';
        } else {
            emojiPicker.style.display = 'none';
        }

        // Close emoji picker when clicking outside
        document.addEventListener('click', (e) => {
            if (
                !emojiPicker.contains(e.target) &&
                e.target.id !== 'emoji-btn'
            ) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    // Restore last opened chat
    restoreLastChat() {
        const lastChatId = localStorage.getItem('currentChatId');
        if (lastChatId) {
            console.log('Restoring last chat:', lastChatId);
            setTimeout(() => {
                this.selectChat(lastChatId);
            }, 1000);
        }
    }

    // Mark chat as read
    async markChatAsRead(chatId) {
        try {
            // Remove unread styling
            const chatItem = document.querySelector(
                `[data-chat-id="${chatId}"]`,
            );
            if (chatItem) {
                chatItem.classList.remove('unread');
                const unreadBadge = chatItem.querySelector('.unread-badge');
                if (unreadBadge) {
                    unreadBadge.remove();
                }

                // Remove unread indicators
                const unreadDot = chatItem.querySelector('.unread-dot');
                if (unreadDot) {
                    unreadDot.remove();
                }

                // Reset styling
                const chatName = chatItem.querySelector('.chat-name');
                const chatPreview = chatItem.querySelector('.chat-preview');
                const chatTime = chatItem.querySelector('.chat-time');

                if (chatName) chatName.classList.remove('unread-name');
                if (chatPreview) chatPreview.classList.remove('unread-message');
                if (chatTime) chatTime.classList.remove('unread-time');
            }

            // Send read receipt to backend (if implemented)
            console.log(`Marked chat ${chatId} as read`);
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            // Less than 1 minute
            return 'now';
        } else if (diff < 3600000) {
            // Less than 1 hour
            return Math.floor(diff / 60000) + 'm';
        } else if (diff < 86400000) {
            // Less than 1 day
            return Math.floor(diff / 3600000) + 'h';
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppAIApp();
});
