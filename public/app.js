// WhatsApp AI Web Frontend Application
class WhatsAppAIApp {
    constructor() {
        this.socket = null;
        this.currentChatId = null;
        this.chats = new Map();
        this.messages = new Map();
        this.isConnected = false;
        this.pinnedChats = new Set(JSON.parse(localStorage.getItem('pinnedChats') || '[]'));
        this.darkMode = localStorage.getItem('darkMode') !== 'false'; // Default to dark mode
        
        // Language settings
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = window.languages || {
            en: {}, // Default English fallback
            de: {}  // German fallback
        };
        
        // Language detection cache
        this.detectedLanguages = {};

        this.initializeApp();
    }

    initializeApp() {
        // Apply theme before anything else to avoid flash of wrong theme
        this.applyTheme();
        
        // Apply language before setting up event listeners
        this.applyLanguage();
        
        this.setupEventListeners();
        this.connectToServer();
        this.requestNotificationPermission();
        this.updateStatus(this.translate('connecting'));

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
    
    // Language management
    translate(key, fallback) {
        const translation = this.translations[this.currentLanguage];
        if (translation && translation[key]) {
            return translation[key];
        }
        
        // Try English as fallback
        if (this.currentLanguage !== 'en' && this.translations.en && this.translations.en[key]) {
            return this.translations.en[key];
        }
        
        // Return the provided fallback or the key itself
        return fallback || key;
    }
    
    applyLanguage() {
        // Set the language selector value
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
        }
        
        // Update all translatable elements
        this.updateUITranslations();
    }
    
    changeLanguage(language) {
        if (language && this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('language', language);
            this.updateUITranslations();
            return true;
        }
        return false;
    }
    
    updateUITranslations() {
        // Update page title
        document.title = this.translate('appTitle', 'WhatsApp AI Web');
        
        // Update placeholders
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.placeholder = this.translate('search', 'Search or start new chat');
        }
        
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.placeholder = this.translate('typeMessage', 'Type a message');
        }
        
        // Update buttons
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.translate(key);
            }
        });
        
        // Update sort buttons
        const sortRecentBtn = document.getElementById('sort-recent');
        const sortUnreadBtn = document.getElementById('sort-unread');
        const sortNameBtn = document.getElementById('sort-name');
        
        if (sortRecentBtn) {
            sortRecentBtn.querySelector('span').textContent = this.translate('sortRecent', 'Recent');
        }
        if (sortUnreadBtn) {
            sortUnreadBtn.querySelector('span').textContent = this.translate('sortUnread', 'Unread');
        }
        if (sortNameBtn) {
            sortNameBtn.querySelector('span').textContent = this.translate('sortName', 'Name');
        }
        
        // Update modals
        const scheduleModalTitle = document.querySelector('#schedule-modal .modal-header h3');
        if (scheduleModalTitle) {
            scheduleModalTitle.textContent = this.translate('scheduleMessage', 'Schedule Message');
        }
        
        const settingsModalTitle = document.querySelector('#settings-modal .modal-header h3');
        if (settingsModalTitle) {
            settingsModalTitle.textContent = this.translate('settings', 'Settings');
        }
    }
    
    // Theme management
    applyTheme() {
        if (this.darkMode) {
            document.body.classList.remove('light-mode');
            document.getElementById('theme-toggle-btn')?.querySelector('i')?.classList.replace('fa-sun', 'fa-moon');
        } else {
            document.body.classList.add('light-mode');
            document.getElementById('theme-toggle-btn')?.querySelector('i')?.classList.replace('fa-moon', 'fa-sun');
        }
    }
    
    toggleTheme() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyTheme();
        this.showNotification(`${this.darkMode ? 'Dark' : 'Light'} mode activated`, 'info');
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }
        
        // Close settings modal
        const closeSettingsBtn = document.getElementById('close-settings-modal');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.hideSettingsModal());
        }
        
        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Language select
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', () => {
                this.changeLanguage(languageSelect.value);
            });
        }
        
        // Theme select
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.darkMode ? 'dark' : 'light';
            themeSelect.addEventListener('change', () => {
                this.darkMode = themeSelect.value === 'dark';
                this.applyTheme();
                localStorage.setItem('darkMode', this.darkMode);
            });
        }
        
        // Sort buttons
        const sortButtons = document.querySelectorAll('.sort-btn');
        sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                sortButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Sort and render chats
                this.sortAndRenderChats();
            });
        });
        
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
        
        // Schedule message button
        const scheduleBtn = document.getElementById('schedule-btn');
        scheduleBtn.addEventListener('click', () => {
            this.showScheduleModal();
        });
        
        // Setup schedule modal events
        this.setupScheduleModal();
        
        // Initialize scheduled messages
        this.scheduledMessages = this.loadScheduledMessages();
        
        // Start the scheduled message checker
        this.startScheduledMessageChecker();

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
        
        // Handle presence updates
        this.socket.on('presence-update', (data) => {
            this.updateContactPresence(data.id, data.isOnline);
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
        console.log('renderChatList called with:', chats.length, 'chats');
        const chatList = document.getElementById('chat-list');
        if (!chatList) {
            console.error('chat-list element not found!');
            return;
        }
        chatList.innerHTML = '';

        if (chats.length === 0) {
            console.log('No chats to render, showing no-chats message');
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

        // Online status (only for individual chats, not groups)
        const isOnline = !chat.isGroup && (chat.isOnline || false);
        const presenceClass = isOnline ? 'online' : 'offline';
        
        // Get profile picture if available
        const profilePic = chat.profilePicUrl || this.getDefaultProfilePic(chat.name || 'Unknown');
        const hasCustomPic = !!chat.profilePicUrl;
        
        chatItem.innerHTML = `
            <div class="chat-avatar">
                ${chat.isGroup ? 
                    `<div class="group-avatar">
                        <i class="fas fa-users"></i>
                    </div>` : 
                    hasCustomPic ? 
                        `<img src="${profilePic}" alt="${chat.name || 'Unknown'}" class="profile-pic" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 212 212\\'%3E%3Cpath fill=\\'%2325D366\\' d=\\'M106 0a106 106 0 100 212 106 106 0 000-212zm0 30a76 76 0 110 152 76 76 0 010-152zm0 30a46 46 0 100 92 46 46 0 000-92z\\'/%3E%3C/svg%3E';" />` : 
                        `<div class="profile-pic-placeholder" style="background-color: ${profilePic}">${(chat.name || 'Unknown').charAt(0).toUpperCase()}</div>`
                }
                ${chat.unreadCount > 0 ? '<div class="unread-dot"></div>' : ''}
                ${!chat.isGroup ? `<span class="presence-indicator ${presenceClass}"></span>` : ''}
            </div>
            <div class="chat-info">
                <div class="chat-name ${chat.unreadCount > 0 ? 'unread-name' : ''}">${chat.name || 'Unknown'}</div>
                <div class="chat-preview ${chat.unreadCount > 0 ? 'unread-message' : ''}">
                    ${isOnline ? '<span class="online-text">online</span> • ' : ''}
                    ${this.escapeHtml(messagePreview)}
                </div>
            </div>
            <div class="chat-meta">
                <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-chat-id="${chat.id}" title="${isPinned ? 'Unpin' : 'Pin'} chat">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <div class="chat-time ${chat.unreadCount > 0 ? 'unread-time' : ''}">${this.formatTime(timestamp)}</div>
                ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
            </div>
        `;
        
        // If we have a chat ID but no profile picture and it's not a group, try to fetch it
        if (!chat.isGroup && chat.id && !chat.profilePicUrl) {
            const contactId = chat.id.replace('@c.us', '');
            this.fetchProfilePicture(contactId, chatItem.querySelector('.chat-avatar'));
        }

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
        const isNewChat = this.currentChatId !== chatId;
        const previousChatId = this.currentChatId;
        
        // Store current chat in localStorage
        localStorage.setItem('currentChatId', chatId);

        // Update active chat
        document.querySelectorAll('.chat-item').forEach((item) => {
            item.classList.remove('active');
        });

        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            chatElement.classList.add('active');
            
            // Update the chat header avatar
            const chatAvatarEl = document.getElementById('chat-avatar');
            if (chatAvatarEl) {
                // Extract contact ID from chat ID
                const contactId = chatId.split('@')[0];
                if (contactId) {
                    // Check if we have this profile pic in cache
                    if (this.profilePicCache.has(contactId)) {
                        // Use cached profile picture
                        this.updateAvatarWithProfilePic(chatAvatarEl, this.profilePicCache.get(contactId), contactId);
                    } else {
                        // Set placeholder and fetch profile picture
                        this.setAvatarPlaceholder(chatAvatarEl, contactId);
                        this.fetchProfilePicture(contactId, chatAvatarEl);
                    }
                }
            }
        }

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
        
        // Generate AI suggestions if this is a new chat selection
        if (isNewChat) {
            this.generateNewChatSuggestions(chatId, previousChatId);
        }
    }
    
    async generateNewChatSuggestions(chatId, previousChatId) {
        try {
            // Get chat info
            const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (!chatItem) return;
            
            const chatName = chatItem.querySelector('.chat-name')?.textContent || 'Unknown';
            const isGroup = chatItem.querySelector('.chat-avatar i')?.classList.contains('fa-users') || false;
            
            // Don't generate suggestions for groups
            if (isGroup) return;
            
            // Get chat history to check if this is a brand new chat
            const chatHistory = this.messages.get(chatId) || [];
            const isFirstInteraction = chatHistory.length === 0;
            
            // Generate appropriate suggestions
            let suggestionsContext = '';
            
            if (isFirstInteraction) {
                suggestionsContext = `This is your first conversation with ${chatName}. Generate appropriate greeting messages.`;
            } else {
                // Get the last few messages for context
                const lastMessages = chatHistory.slice(-3);
                const lastMessageTexts = lastMessages.map(m => m.body || '').filter(Boolean).join(' ');
                suggestionsContext = `You're continuing a conversation with ${chatName}. Recent messages: ${lastMessageTexts}`;
            }
            
            // Show AI prompts container with loading indicator
            const aiPromptsContainer = document.getElementById('ai-prompts-container');
            const aiPromptsList = document.getElementById('ai-prompts-list');
            
            aiPromptsList.innerHTML = '<div class="ai-prompt-loading">Generating suggestions...</div>';
            aiPromptsContainer.classList.remove('hidden');
            
            // Generate suggestions
            const suggestions = await this.generateAIResponses('', suggestionsContext);
            
            // Display suggestions as prompt buttons
            aiPromptsList.innerHTML = '';
            
            suggestions.forEach(suggestion => {
                const promptButton = document.createElement('button');
                promptButton.className = 'ai-prompt-btn';
                promptButton.textContent = this.truncateText(suggestion, 40);
                promptButton.title = suggestion;
                
                promptButton.addEventListener('click', () => {
                    document.getElementById('message-input').value = suggestion;
                    aiPromptsContainer.classList.add('hidden');
                });
                
                aiPromptsList.appendChild(promptButton);
            });
        } catch (error) {
            console.error('Error generating new chat suggestions:', error);
        }
    }
    
    // Helper method to truncate text
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    // Helper method to escape HTML characters
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Generate a color based on the name for profile picture placeholders
    getDefaultProfilePic(name) {
        // Generate a consistent color based on the name
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert to a hex color with good contrast on dark background
        const hue = Math.abs(hash % 360);
        const saturation = 70 + Math.abs(hash % 30); // 70-100%
        const lightness = 45 + Math.abs(hash % 10);  // 45-55%
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Cache for profile picture requests to avoid duplicate fetches
    profilePicCache = new Map();
    profilePicPending = new Set();
    
    // Fetch profile picture from server
    async fetchProfilePicture(contactId, avatarElement) {
        try {
            // Skip if no contact ID or avatar element
            if (!contactId || !avatarElement) return;
            
            // Clean up contact ID (remove @c.us or @g.us if present)
            const cleanContactId = contactId.includes('@') ? contactId.split('@')[0] : contactId;
            
            // Skip special IDs
            if (cleanContactId === '0' || !cleanContactId) return;
            
            // Check if we already have a profile picture in this element
            if (avatarElement.querySelector('img.profile-pic')) {
                // Already has a profile picture, don't fetch again
                return;
            }
            
            // Check if we already have this profile picture in cache
            if (this.profilePicCache.has(cleanContactId)) {
                const cachedUrl = this.profilePicCache.get(cleanContactId);
                this.updateAvatarWithProfilePic(avatarElement, cachedUrl, cleanContactId);
                return;
            }
            
            // Check if we're already fetching this profile picture
            if (this.profilePicPending.has(cleanContactId)) {
                // Already fetching, just set the placeholder
                this.setAvatarPlaceholder(avatarElement, cleanContactId);
                return;
            }
            
            // Mark as pending
            this.profilePicPending.add(cleanContactId);
            
            // Set a placeholder while loading
            this.setAvatarPlaceholder(avatarElement, cleanContactId);
            
            // Request profile picture from server
            try {
                const response = await fetch(`/api/profile-pic/${cleanContactId}`);
                if (!response.ok) {
                    this.profilePicPending.delete(cleanContactId);
                    return;
                }
                
                const data = await response.json();
                
                // Cache the result
                this.profilePicCache.set(cleanContactId, data.profilePicUrl);
                
                // Update this avatar element
                this.updateAvatarWithProfilePic(avatarElement, data.profilePicUrl, cleanContactId);
                
                // Update all other instances of this contact's avatar
                this.updateAllAvatarsForContact(cleanContactId, data.profilePicUrl);
                
                // No longer pending
                this.profilePicPending.delete(cleanContactId);
            } catch (error) {
                // Silent error handling
                this.profilePicPending.delete(cleanContactId);
            }
        } catch (error) {
            // Silent error handling
        }
    }
    
    // Set placeholder avatar
    setAvatarPlaceholder(avatarElement, contactId) {
        // Skip if element already has a profile pic or placeholder
        if (avatarElement.querySelector('.profile-pic') || 
            avatarElement.querySelector('.profile-pic-placeholder')) {
            return;
        }
        
        // Add a loading state
        const currentHTML = avatarElement.innerHTML;
        const avatarColor = this.getAvatarColor(contactId);
        const isGroup = contactId.includes('g.us');
        
        avatarElement.innerHTML = isGroup 
            ? `<div class="group-avatar" style="background-color: ${avatarColor}"><i class="fas fa-users"></i></div>`
            : `<div class="profile-pic-placeholder" style="background-color: ${avatarColor}">${contactId.charAt(0).toUpperCase()}</div>`;
        
        // Keep presence indicator if it exists
        if (currentHTML.includes('presence-indicator')) {
            const presenceIndicator = document.createElement('div');
            presenceIndicator.innerHTML = currentHTML;
            const indicator = presenceIndicator.querySelector('.presence-indicator');
            if (indicator) {
                avatarElement.appendChild(indicator);
            }
        }
    }
    
    // Update avatar with profile picture
    updateAvatarWithProfilePic(avatarElement, profilePicUrl, contactId) {
        if (!avatarElement || !profilePicUrl) return;
        
        // Create a new image element
        const img = document.createElement('img');
        img.src = profilePicUrl;
        img.alt = "Profile";
        img.className = "profile-pic";
        img.loading = "lazy"; // Use lazy loading
        img.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 212 212%22%3E%3Cpath fill=%22%2325D366%22 d=%22M106 0a106 106 0 100 212 106 106 0 000-212zm0 30a76 76 0 110 152 76 76 0 010-152zm0 30a46 46 0 100 92 46 46 0 000-92z%22/%3E%3C/svg%3E';
        };
        
        // Clear the avatar element but keep presence indicator
        const presenceIndicator = avatarElement.querySelector('.presence-indicator');
        avatarElement.innerHTML = '';
        avatarElement.appendChild(img);
        
        // Add back presence indicator if it exists
        if (presenceIndicator) {
            avatarElement.appendChild(presenceIndicator);
        }
    }
    
    // Update all avatars for a contact
    updateAllAvatarsForContact(contactId, profilePicUrl) {
        // Store the profile picture URL in data structures
        // For contacts
        if (Array.isArray(this.contacts)) {
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                contact.profilePicUrl = profilePicUrl;
            }
        }
        
        // For chats
        if (Array.isArray(this.chats)) {
            const chat = this.chats.find(c => c.id === `${contactId}@c.us`);
            if (chat) {
                chat.profilePicUrl = profilePicUrl;
            }
        }
        
        // Update all contact avatar elements
        document.querySelectorAll(`.contact-item[data-contact-id="${contactId}"] .contact-avatar`).forEach(element => {
            this.updateAvatarWithProfilePic(element, profilePicUrl, contactId);
        });
        
        // Update all chat avatar elements
        document.querySelectorAll(`.chat-item[data-chat-id="${contactId}@c.us"] .chat-avatar`).forEach(element => {
            this.updateAvatarWithProfilePic(element, profilePicUrl, contactId);
        });
        
        // Update chat header if this is the current chat
        if (this.currentChatId && (this.currentChatId === `${contactId}@c.us` || this.currentChatId === contactId)) {
            const chatAvatarEl = document.getElementById('chat-avatar');
            if (chatAvatarEl) {
                this.updateAvatarWithProfilePic(chatAvatarEl, profilePicUrl, contactId);
            }
        }
    }

    async loadChatMessages(chatId) {
        try {
            console.log(`Loading messages for chat: ${chatId}`);
            this.showLoadingState();
            
            // Check if we have cached messages for this chat
            const cachedMessages = this.messages.get(chatId);
            if (cachedMessages && cachedMessages.length > 0) {
                console.log(`Using ${cachedMessages.length} cached messages for chat ${chatId}`);
                // Render cached messages immediately
                this.renderMessages(cachedMessages);
                this.hideLoadingState();
                
                // Fetch latest messages in the background
                this.fetchLatestMessages(chatId);
                return;
            }

            // No cached messages, fetch all messages
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
    
    async fetchLatestMessages(chatId) {
        try {
            // Fetch only messages since the latest message we have
            const cachedMessages = this.messages.get(chatId) || [];
            const latestTimestamp = cachedMessages.length > 0 
                ? Math.max(...cachedMessages.map(m => m.timestamp)) 
                : 0;
            
            const response = await fetch(`/api/chat/${chatId}?since=${latestTimestamp}`);
            const newMessages = await response.json();
            
            if (newMessages.length > 0) {
                console.log(`Fetched ${newMessages.length} new messages for chat ${chatId}`);
                
                // Merge new messages with cached messages
                const updatedMessages = [...cachedMessages];
                
                // Add only messages we don't already have
                const existingIds = new Set(cachedMessages.map(m => m.id._serialized || m.id));
                for (const message of newMessages) {
                    const messageId = message.id._serialized || message.id;
                    if (!existingIds.has(messageId)) {
                        updatedMessages.push(message);
                    }
                }
                
                // Sort by timestamp
                updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
                
                // Update cache and render if this is still the active chat
                this.messages.set(chatId, updatedMessages);
                if (this.currentChatId === chatId) {
                    this.renderMessages(updatedMessages);
                }
            }
        } catch (error) {
            console.error('Error fetching latest messages:', error);
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
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Use virtual scrolling if there are many messages
        const MAX_VISIBLE_MESSAGES = 50;
        const messagesToRender = messages.length > MAX_VISIBLE_MESSAGES
            ? messages.slice(messages.length - MAX_VISIBLE_MESSAGES)
            : messages;
            
        if (messages.length > MAX_VISIBLE_MESSAGES) {
            // Add a "load more" button at the top
            const loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            loadMoreContainer.innerHTML = `
                <button class="load-more-btn" id="load-more-btn">
                    <i class="fas fa-arrow-up" aria-hidden="true"></i> Load ${messages.length - MAX_VISIBLE_MESSAGES} earlier messages
                </button>
            `;
            
            // Add event listener to load more button
            loadMoreContainer.querySelector('#load-more-btn').addEventListener('click', () => {
                this.loadMoreMessages(messages);
            });
            
            fragment.appendChild(loadMoreContainer);
        }

        // Render visible messages
        messagesToRender.forEach((message) => {
            const messageElement = this.createMessageElement(message);
            fragment.appendChild(messageElement);
        });
        
        // Append all messages at once
        messagesArea.appendChild(fragment);

        this.scrollToBottom();
    }
    
    loadMoreMessages(allMessages) {
        const messagesArea = document.getElementById('messages-area');
        const currentScrollHeight = messagesArea.scrollHeight;
        
        // Remove the current load more button
        const loadMoreContainer = messagesArea.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.remove();
        }
        
        // Get the current first message for reference
        const firstMessage = messagesArea.querySelector('.message');
        
        // Create a new fragment
        const fragment = document.createDocumentFragment();
        
        // Load 50 more messages
        const currentCount = messagesArea.querySelectorAll('.message').length;
        const startIndex = Math.max(0, allMessages.length - currentCount - 50);
        const endIndex = allMessages.length - currentCount;
        const additionalMessages = allMessages.slice(startIndex, endIndex);
        
        // Add a new load more button if needed
        if (startIndex > 0) {
            const loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            loadMoreContainer.innerHTML = `
                <button class="load-more-btn" id="load-more-btn">
                    <i class="fas fa-arrow-up" aria-hidden="true"></i> Load ${startIndex} earlier messages
                </button>
            `;
            
            loadMoreContainer.querySelector('#load-more-btn').addEventListener('click', () => {
                this.loadMoreMessages(allMessages);
            });
            
            fragment.appendChild(loadMoreContainer);
        }
        
        // Create elements for additional messages
        additionalMessages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            fragment.appendChild(messageElement);
        });
        
        // Insert at the top
        if (firstMessage) {
            messagesArea.insertBefore(fragment, firstMessage);
        } else {
            messagesArea.appendChild(fragment);
        }
        
        // Maintain scroll position
        messagesArea.scrollTop = messagesArea.scrollHeight - currentScrollHeight;
        
        // Announce to screen readers
        this.announceToScreenReader(`Loaded ${additionalMessages.length} earlier messages`);
    }
    
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.fromMe ? 'sent' : 'received'}`;
        messageDiv.setAttribute('data-message-id', message.id._serialized || message.id);

        let messageContent = '';

        // Check for voice messages by type or body content
        if (
            message.type === 'audio' ||
            message.type === 'ptt' ||
            (message.body && message.body.includes('voice'))
        ) {
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
        const status = this.getMessageStatusHtml(message);

        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${messageContent}
                <div class="message-time">
                    ${timestamp}
                    ${status}
                </div>
            </div>
        `;
        
        return messageDiv;
    }
    
    getMessageStatusHtml(message) {
        if (!message.fromMe) return '';
        
        // Determine message status
        let statusClass = 'delivered';
        let statusText = 'Delivered';
        
        if (message.isTemp) {
            statusClass = 'pending';
            statusText = 'Sending';
        } else if (message.status === 'PENDING' || message.status === 'SENDING') {
            statusClass = 'pending';
            statusText = 'Sending';
        } else if (message.status === 'SENT') {
            statusClass = 'sent';
            statusText = 'Sent';
        } else if (message.status === 'DELIVERED') {
            statusClass = 'delivered';
            statusText = 'Delivered';
        } else if (message.status === 'READ' || message.isRead) {
            statusClass = 'read';
            statusText = 'Read';
        } else if (message.status === 'ERROR' || message.hasError) {
            statusClass = 'failed';
            statusText = 'Failed';
        }
        
        return `<span class="message-status ${statusClass}" title="${statusText}" aria-label="Message ${statusText}"></span>`;
    }

    addMessageToChat(message) {
        const messagesArea = document.getElementById('messages-area');
        
        // Use the createMessageElement method for consistency
        message.isTemp = true; // Mark as temporary to show pending status
        const messageElement = this.createMessageElement(message);
        messageElement.classList.add('fade-in');
        
        if (message.isAI) {
            messageElement.classList.add('ai-message');
        }
        
        // Add a unique ID for easy updating later
        const tempId = `temp_${Date.now()}`;
        messageElement.setAttribute('id', tempId);
        message.tempId = tempId;

        messagesArea.appendChild(messageElement);
        this.scrollToBottom();
        
        // Set up status updates
        if (message.fromMe) {
            // Simulate status changes for demo
            setTimeout(() => this.updateMessageStatus(tempId, 'sent'), 500);
            setTimeout(() => this.updateMessageStatus(tempId, 'delivered'), 2000);
            
            // Random chance of read receipt after 3-5 seconds
            if (Math.random() > 0.5) {
                setTimeout(() => this.updateMessageStatus(tempId, 'read'), 3000 + Math.random() * 2000);
            }
        }
    }
    
    updateMessageStatus(messageId, status) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const statusElement = messageElement.querySelector('.message-status');
        if (!statusElement) return;
        
        // Update status class and aria attributes
        statusElement.className = `message-status ${status}`;
        
        let statusText = 'Unknown';
        switch(status) {
        case 'pending': statusText = 'Sending'; break;
        case 'sent': statusText = 'Sent'; break;
        case 'delivered': statusText = 'Delivered'; break;
        case 'read': statusText = 'Read'; break;
        case 'failed': statusText = 'Failed'; break;
        }
        
        statusElement.setAttribute('title', statusText);
        statusElement.setAttribute('aria-label', `Message ${statusText}`);
    }

    handleNewMessage(data) {
        const { chatId, message, chatName } = data;

        // Update chat list if this is a new chat
        const chatExists = Array.isArray(this.chats) 
            ? this.chats.some(c => c.id === chatId)
            : false;
            
        if (!chatExists) {
            const newChat = {
                id: chatId,
                name: chatName,
                lastMessage: message.body,
                timestamp: message.timestamp * 1000,
                unreadCount: 0,
            };
            
            this.addChatToList(newChat);
            
            // Update the chats array
            if (Array.isArray(this.chats)) {
                this.chats.push(newChat);
            } else {
                this.chats = [newChat];
            }
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

        // Create a unique ID for this message
        const tempId = `temp_${Date.now()}`;
        
        // Add message to UI immediately
        const messageData = {
            id: tempId,
            body: text || this.getMediaPreview(type, filename),
            from: this.currentChatId,
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000),
            type: type,
            mediaData: mediaData,
            filename: filename,
            status: 'PENDING',
            isTemp: true
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
                    tempId: tempId // Include temp ID for tracking
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const result = await response.json();
            
            // Update message status based on server response
            if (result.success) {
                // Update with server-generated ID and status
                this.updateMessageStatus(tempId, 'delivered');
                
                // Update message in cache with server data
                const messages = this.messages.get(this.currentChatId);
                if (messages) {
                    const msgIndex = messages.findIndex(m => m.id === tempId);
                    if (msgIndex >= 0) {
                        messages[msgIndex] = {
                            ...messages[msgIndex],
                            ...result.message,
                            status: 'DELIVERED',
                            isTemp: false
                        };
                    }
                }
            } else {
                throw new Error(result.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.updateMessageStatus(tempId, 'failed');
            this.showNotification('Failed to send message', 'error');
            
            // Update message in cache
            const messages = this.messages.get(this.currentChatId);
            if (messages) {
                const msgIndex = messages.findIndex(m => m.id === tempId);
                if (msgIndex >= 0) {
                    messages[msgIndex].status = 'ERROR';
                    messages[msgIndex].hasError = true;
                }
            }
        }
    }

    async generateAIResponses(message, context = '') {
        try {
            // Show loading indicator
            this.showNotification('Generating AI responses...', 'info');
            
            // Get chat history for better context
            const chatHistory = this.messages.get(this.currentChatId) || [];
            const lastMessages = chatHistory.slice(-5); // Last 5 messages for context
            
            // Get contact info for personalization
            const chatId = this.currentChatId;
            const contactInfo = await this.fetchContactInfo(chatId);
            
            const response = await fetch('/api/generate-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: message,
                    context: context,
                    chatHistory: lastMessages,
                    contactInfo: contactInfo,
                    timestamp: new Date().toISOString(),
                    messageType: this.detectMessageIntent(message)
                }),
            });

            const data = await response.json();
            
            // Store generated responses for this chat
            if (!this.aiResponses) {
                this.aiResponses = new Map();
            }
            this.aiResponses.set(this.currentChatId, data.responses);
            
            return data.responses;
        } catch (error) {
            console.error('Error generating AI responses:', error);
            this.showNotification('Error generating AI responses', 'error');
            return ['Sorry, I encountered an error generating responses.'];
        }
    }
    
    // Helper method to detect the intent/type of the message
    detectMessageIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        // Detect greetings
        if (/^(hi|hello|hey|good morning|good afternoon|good evening)\\b/i.test(lowerMessage)) {
            return 'greeting';
        }
        
        // Detect questions
        if (/\\?$/.test(lowerMessage) || /^(what|who|where|when|why|how|can|could|would|is|are|do|does|did)/i.test(lowerMessage)) {
            return 'question';
        }
        
        // Detect requests
        if (/^(please|pls|plz|can you|could you|would you)/i.test(lowerMessage)) {
            return 'request';
        }
        
        // Detect gratitude
        if (/^(thanks|thank you|thx)/i.test(lowerMessage)) {
            return 'gratitude';
        }
        
        // Default to general conversation
        return 'general';
    }
    
    // Helper method to fetch contact information
    async fetchContactInfo(chatId) {
        try {
            if (!chatId) return null;
            
            // Extract contact ID from chat ID
            const contactId = chatId.endsWith('@c.us') ? chatId : `${chatId}@c.us`;
            
            // Check if we already have contact info
            const contactItem = document.querySelector(`.contact-item[data-contact-id="${contactId.replace('@c.us', '')}"]`);
            if (contactItem) {
                const name = contactItem.querySelector('.contact-name')?.textContent;
                const number = contactItem.querySelector('.contact-number')?.textContent;
                return { id: contactId, name, number };
            }
            
            // Otherwise fetch from API
            const response = await fetch(`/api/contact/${contactId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching contact info:', error);
            return null;
        }
    }

    showAIModal(responses) {
        const modal = document.getElementById('ai-modal');
        const responsesContainer = document.getElementById('ai-responses');

        responsesContainer.innerHTML = '';
        
        // Get contact name for personalization
        let contactName = "Unknown";
        if (this.currentChatId) {
            const chatItem = document.querySelector(`.chat-item[data-chat-id="${this.currentChatId}"]`);
            if (chatItem) {
                contactName = chatItem.querySelector('.chat-name')?.textContent || "Unknown";
            }
        }

        responses.forEach((response, index) => {
            // Categorize response type for better UI
            let responseType = "General";
            let responseIcon = "fas fa-comment";
            
            if (response.toLowerCase().includes("question")) {
                responseType = "Question";
                responseIcon = "fas fa-question-circle";
            } else if (response.toLowerCase().includes("thank")) {
                responseType = "Gratitude";
                responseIcon = "fas fa-heart";
            } else if (response.toLowerCase().startsWith("hi") || response.toLowerCase().startsWith("hello")) {
                responseType = "Greeting";
                responseIcon = "fas fa-hand-paper";
            } else if (response.toLowerCase().includes("sorry") || response.toLowerCase().includes("apologize")) {
                responseType = "Apology";
                responseIcon = "fas fa-exclamation-circle";
            }
            
            const responseElement = document.createElement('div');
            responseElement.className = 'ai-response';
            responseElement.innerHTML = `
                <div class="ai-response-header">
                    <div class="ai-response-title"><i class="${responseIcon}"></i> ${responseType}</div>
                    <div class="ai-response-rating">
                        <button class="rating-btn" title="Rate this response" data-index="${index}">
                            <i class="far fa-thumbs-up"></i>
                        </button>
                    </div>
                </div>
                <div class="ai-response-text">${this.escapeHtml(this.formatAIResponse(response, contactName))}</div>
            `;

            responseElement.addEventListener('click', () => {
                this.useAIResponse(response);
            });
            
            // Add rating functionality
            const ratingBtn = responseElement.querySelector('.rating-btn');
            ratingBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent selecting the response
                this.rateAIResponse(index, response);
                ratingBtn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
                ratingBtn.classList.add('rated');
            });

            responsesContainer.appendChild(responseElement);
        });

        modal.classList.remove('hidden');
    }
    
    // Format AI response with personalization
    formatAIResponse(response, contactName) {
        // Replace generic placeholders with contact name
        return response
            .replace(/\[Name\]/g, contactName)
            .replace(/\[Contact\]/g, contactName)
            .replace(/\[User\]/g, contactName);
    }
    
    // Send rating to server for AI improvement
    async rateAIResponse(index, response) {
        try {
            await fetch('/api/rate-ai-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    responseIndex: index,
                    response: response,
                    rating: 'positive'
                }),
            });
            
            this.showNotification('Thanks for your feedback!', 'success');
        } catch (error) {
            console.error('Error rating AI response:', error);
        }
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
        const chatNameEl = document.getElementById('chat-name');
        const chatStatusEl = document.getElementById('chat-status');
        const chatAvatarEl = document.getElementById('chat-avatar');
        
        // Find chat in the array
        const chat = Array.isArray(this.chats) 
            ? this.chats.find(c => c.id === chatId)
            : null;
            
        if (chat) {
            chatNameEl.textContent = chat.name;
            // Show actual status instead of always "Online"
            chatStatusEl.textContent = this.getChatStatus(chat);
            
            // Make chat name clickable to show details
            chatNameEl.style.cursor = 'pointer';
            chatNameEl.onclick = () => this.showChatDetails(chatId);
            
            // Update profile picture if available
            if (chatAvatarEl) {
                // Extract the contact ID from the chat ID (remove @c.us or @g.us)
                const contactId = chatId.split('@')[0];
                
                // Fetch profile picture
                this.fetchProfilePicture(contactId, chatAvatarEl);
                
                // Use the setAvatarPlaceholder method instead of direct manipulation
                if (!chatAvatarEl.querySelector('img')) {
                    this.setAvatarPlaceholder(chatAvatarEl, chat.name);
                }
            }
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
                
                // Copy profile picture from chat list if available
                if (chatAvatarEl) {
                    const chatItemAvatar = chatItem.querySelector('.chat-avatar');
                    if (chatItemAvatar && chatItemAvatar.innerHTML.trim()) {
                        chatAvatarEl.innerHTML = chatItemAvatar.innerHTML;
                    } else {
                        // Set default avatar using our helper method
                        this.setAvatarPlaceholder(chatAvatarEl, chatName);
                    }
                }
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
        
        // Update ARIA attributes
        chatsTab.setAttribute('aria-selected', tab === 'chats');
        contactsTab.setAttribute('aria-selected', tab === 'contacts');

        // Show/hide content
        chatList.classList.toggle('hidden', tab !== 'chats');
        contactsList.classList.toggle('hidden', tab !== 'contacts');
        
        // Update ARIA hidden state
        chatList.setAttribute('aria-hidden', tab !== 'chats');
        contactsList.setAttribute('aria-hidden', tab !== 'contacts');

        // Load contacts if switching to contacts tab
        if (tab === 'contacts') {
            this.loadContacts();
        }
        
        // Focus the active tab
        if (tab === 'chats') {
            chatsTab.focus();
        } else {
            contactsTab.focus();
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
        
        // Default to offline, will be updated via presence events
        const isOnline = contact.isOnline || false;
        const presenceClass = isOnline ? 'online' : 'offline';
        const presenceText = isOnline ? 'online' : 'last seen recently';
        
        // Get profile picture if available
        const profilePic = contact.profilePicUrl || this.getDefaultProfilePic(displayName);
        const hasCustomPic = !!contact.profilePicUrl;

        contactItem.innerHTML = `
            <div class="contact-avatar">
                ${hasCustomPic ? 
                    `<img src="${profilePic}" alt="${displayName}" class="profile-pic" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 212 212\\'%3E%3Cpath fill=\\'%2325D366\\' d=\\'M106 0a106 106 0 100 212 106 106 0 000-212zm0 30a76 76 0 110 152 76 76 0 010-152zm0 30a46 46 0 100 92 46 46 0 000-92z\\'/%3E%3C/svg%3E';" />` : 
                    `<div class="profile-pic-placeholder" style="background-color: ${profilePic}">${displayName.charAt(0).toUpperCase()}</div>`
                }
                <span class="presence-indicator ${presenceClass}" title="${presenceText}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-name">${this.escapeHtml(displayName)}</div>
                <div class="contact-number">${contact.number}</div>
                <div class="contact-status">
                    <span class="presence-text ${presenceClass}">
                        ${isOnline ? 'online' : status}
                    </span>
                </div>
            </div>
        `;
        
        // If we have a contact ID but no profile picture, try to fetch it
        if (contact.id && !contact.profilePicUrl) {
            this.fetchProfilePicture(contact.id, contactItem.querySelector('.contact-avatar'));
        }

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

    updateContactPresence(contactId, isOnline) {
        console.log(`Presence update for ${contactId}: ${isOnline ? 'online' : 'offline'}`);
        
        // Update contact in contacts list
        const contactItem = document.querySelector(`.contact-item[data-contact-id="${contactId}"]`);
        if (contactItem) {
            const indicator = contactItem.querySelector('.presence-indicator');
            const statusText = contactItem.querySelector('.presence-text');
            
            if (indicator) {
                indicator.className = `presence-indicator ${isOnline ? 'online' : 'offline'}`;
                indicator.title = isOnline ? 'online' : 'last seen recently';
            }
            
            if (statusText) {
                statusText.className = `presence-text ${isOnline ? 'online' : ''}`;
                statusText.textContent = isOnline ? 'online' : 'last seen recently';
            }
        }
        
        // Update chat in chat list
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${contactId}@c.us"]`);
        if (chatItem) {
            const indicator = chatItem.querySelector('.presence-indicator');
            const previewEl = chatItem.querySelector('.chat-preview');
            
            if (indicator) {
                indicator.className = `presence-indicator ${isOnline ? 'online' : 'offline'}`;
            }
            
            if (previewEl) {
                // Get the current message preview
                const currentPreview = previewEl.textContent.trim();
                const onlineText = '<span class="online-text">online</span> • ';
                
                if (isOnline) {
                    // Add online indicator if not already present
                    if (!previewEl.innerHTML.includes('online-text')) {
                        const messageText = currentPreview.replace(/^online • /, '');
                        previewEl.innerHTML = `${onlineText}${messageText}`;
                    }
                } else {
                    // Remove online indicator if present
                    previewEl.innerHTML = previewEl.innerHTML.replace(onlineText, '');
                }
            }
            
            // Store the online status in the chat object
            if (this.chats) {
                const chatIndex = this.chats.findIndex(c => c.id === `${contactId}@c.us`);
                if (chatIndex !== -1) {
                    this.chats[chatIndex].isOnline = isOnline;
                }
            }
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
            const chatName = Array.isArray(this.chats)
                ? (this.chats.find(c => c.id === message.chatId)?.name || 'Unknown Chat')
                : 'Unknown Chat';
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
        
        // Check if this is a group message and not from the current user
        const isGroupMessage = this.currentChatId && this.currentChatId.endsWith('@g.us') && !message.fromMe;
        let senderName = isGroupMessage ? (message.author || message.senderName || 'Unknown') : '';
        
        // If we have a sender ID but no name, try to find the contact name
        if (isGroupMessage && message.author && (!senderName || senderName === 'Unknown')) {
            const contactId = message.author.replace('@c.us', '');
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                senderName = contact.name || contact.pushname || contact.number || 'Unknown';
            }
        }

        // Check for voice messages by type or body content
        if (
            message.type === 'audio' ||
            message.type === 'ptt' ||
            (message.body && message.body.includes('voice'))
        ) {
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
            
        // Add sender name for group messages
        const senderHeader = isGroupMessage && senderName ? 
            `<div class="message-sender">${this.escapeHtml(senderName)}</div>` : '';

        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${senderHeader}
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
            
        // Check for transcription in message, then in local storage
        let transcription = message.transcription || message.summary || '';
        
        // If no transcription in the message object, check local storage
        if (!transcription) {
            const storedTranscription = this.getVoiceTranscription(messageId);
            if (storedTranscription) {
                transcription = storedTranscription;
                
                // Update the message object with the stored transcription
                message.transcription = transcription;
            }
        }
        
        const hasTranscription = !!transcription;
        
        // If no transcription, request one only if we have audio data
        if (!hasTranscription && audioData) {
            // Use a small delay to avoid blocking the UI
            setTimeout(() => {
                this.requestVoiceTranscription(messageId, audioData, mimeType);
            }, 500);
        }
        
        return `
            <div class="voice-message" data-message-id="${messageId}">
                <button class="voice-play-btn" data-message-id="${messageId}">
                    <i class="fas fa-play"></i>
                </button>
                <div class="voice-info">
                    <div class="voice-duration">Voice message</div>
                    <div class="voice-timestamp">${this.formatTime(message.timestamp * 1000)}</div>
                    ${hasTranscription ? 
                        `<div class="voice-transcription">"${transcription}"</div>` : 
                        `<div class="voice-transcription-pending" id="transcription-${messageId}">
                            <i class="fas fa-spinner fa-spin"></i> Generating summary...
                        </div>`
                    }
                </div>
                <audio id="voice-audio-${messageId}" preload="none" controls style="display: none;">
                    <source src="data:${mimeType};base64,${audioData}" type="${mimeType}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `;
    }
    
    async requestVoiceTranscription(messageId, audioData, mimeType) {
        try {
            // Don't try to transcribe if there's no audio data
            if (!audioData || audioData.length < 100) {
                this.updateVoiceTranscription(messageId, "No audio data available");
                return;
            }
            
            // Check if the audio data is too large (over 1MB in base64)
            if (audioData.length > 1000000) {
                this.updateVoiceTranscription(messageId, "Audio too large to transcribe automatically");
                
                // Store a placeholder transcription
                this.storeVoiceTranscription(messageId, "Audio too large to transcribe automatically");
                return;
            }
            
            // Request transcription from the server
            try {
                const response = await fetch('/api/transcribe-voice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messageId,
                        audioData,
                        mimeType
                    }),
                });
                
                // Even if response is not OK, try to get the error message
                const result = await response.json().catch(e => ({ transcription: "Error parsing response" }));
                
                if (!response.ok) {
                    // Handle specific error codes
                    if (response.status === 413) { // Payload Too Large
                        this.updateVoiceTranscription(messageId, "Audio too large to transcribe automatically");
                        this.storeVoiceTranscription(messageId, "Audio too large to transcribe automatically");
                    } else if (result && result.transcription) {
                        this.updateVoiceTranscription(messageId, result.transcription);
                        this.storeVoiceTranscription(messageId, result.transcription);
                    } else {
                        this.updateVoiceTranscription(messageId, "Failed to transcribe audio");
                    }
                    return;
                }
                
                // Update the transcription in the UI
                this.updateVoiceTranscription(messageId, result.transcription || "Could not transcribe audio");
                
                // Store the transcription with the message
                if (result.transcription) {
                    this.storeVoiceTranscription(messageId, result.transcription);
                }
            } catch (fetchError) {
                // Handle network errors silently
                this.updateVoiceTranscription(messageId, "Network error during transcription");
            }
            
        } catch (error) {
            console.error('Error requesting voice transcription:', error);
            
            // Show error in the UI
            this.updateVoiceTranscription(messageId, "Error transcribing audio");
        }
    }
    
    updateVoiceTranscription(messageId, transcription) {
        const transcriptionElement = document.getElementById(`transcription-${messageId}`);
        if (transcriptionElement) {
            transcriptionElement.innerHTML = `"${this.escapeHtml(transcription)}"`;
            transcriptionElement.classList.remove('voice-transcription-pending');
            transcriptionElement.classList.add('voice-transcription');
        }
    }
    
    storeVoiceTranscription(messageId, transcription) {
        // Find the message in our cache and update it
        let foundInCache = false;
        for (const [chatId, messages] of this.messages.entries()) {
            const messageIndex = messages.findIndex(m => {
                const mId = m.id || (m.id && m.id._serialized);
                return mId === messageId;
            });
            
            if (messageIndex !== -1) {
                messages[messageIndex].transcription = transcription;
                foundInCache = true;
                break;
            }
        }
        
        // Also store in local storage for persistence
        try {
            // Get existing transcriptions from local storage
            const storedTranscriptions = JSON.parse(localStorage.getItem('voiceTranscriptions') || '{}');
            
            // Add or update this transcription
            storedTranscriptions[messageId] = {
                transcription,
                timestamp: Date.now()
            };
            
            // Store back to local storage
            localStorage.setItem('voiceTranscriptions', JSON.stringify(storedTranscriptions));
            
            // Log success if this is a new transcription
            if (!foundInCache) {
                console.log(`Stored transcription for message ${messageId} in local storage only`);
            }
        } catch (error) {
            // Silent error handling for localStorage issues
        }
    }
    
    // Load voice message transcriptions from local storage
    loadVoiceTranscriptions() {
        try {
            return JSON.parse(localStorage.getItem('voiceTranscriptions') || '{}');
        } catch (error) {
            return {};
        }
    }
    
    // Get transcription for a voice message
    getVoiceTranscription(messageId) {
        // First check in-memory cache
        for (const [chatId, messages] of this.messages.entries()) {
            const message = messages.find(m => {
                const mId = m.id || (m.id && m.id._serialized);
                return mId === messageId;
            });
            
            if (message && message.transcription) {
                return message.transcription;
            }
        }
        
        // Then check local storage
        try {
            const storedTranscriptions = this.loadVoiceTranscriptions();
            if (storedTranscriptions[messageId]) {
                return storedTranscriptions[messageId].transcription;
            }
        } catch (error) {
            // Silent error handling
        }
        
        // No transcription found
        return null;
    }

    renderMediaMessage(message) {
        // Try multiple sources for media data
        let mediaData = message.mediaData || message.body || '';
        let mimeType = message.media?.mimetype || message.type || 'image/jpeg';
        
        // Validate media data before creating URL
        let mediaUrl = '';
        if (mediaData && mediaData.length > 0) {
            // Check if it's already a data URL
            if (mediaData.startsWith('data:')) {
                mediaUrl = mediaData;
            } else {
                // Validate base64 data
                try {
                    // Basic base64 validation
                    if (/^[A-Za-z0-9+/]*={0,2}$/.test(mediaData)) {
                        mediaUrl = `data:${mimeType};base64,${mediaData}`;
                    }
                } catch (e) {
                    // Invalid base64 data
                    mediaUrl = '';
                }
            }
        }
        
        const isImage = message.type === 'image' || mimeType.startsWith('image/');

        if (isImage) {
            if (mediaUrl) {
                return `
                    <div class="image-preview-container">
                        <img src="${mediaUrl}" alt="Image" class="message-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="image-fallback" style="display: none; width: 200px; height: 150px; background: #2a3942; border-radius: 8px; align-items: center; justify-content: center; color: #8696a0;">
                            <div style="text-align: center;">
                                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 8px;"></i>
                                <div>Image not available</div>
                            </div>
                        </div>
                        <div class="image-overlay">
                            <i class="fas fa-expand"></i>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="image-preview-container">
                        <div class="image-fallback" style="width: 200px; height: 150px; background: #2a3942; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8696a0;">
                            <div style="text-align: center;">
                                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 8px;"></i>
                                <div>Image not available</div>
                            </div>
                        </div>
                    </div>
                `;
            }
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
        console.log('loadChats called, isConnected:', this.isConnected);
        if (this.isConnected) {
            try {
                console.log('Loading chats...');
                const response = await fetch('/api/chats');
                console.log('Response status:', response.status);
                const chats = await response.json();
                console.log('Received chats:', chats);
                
                // Store chats in memory for sorting
                this.chats = chats;
                
                // Apply current sort method (default: recent)
                this.sortAndRenderChats();
                
                console.log(`Auto-loaded ${chats.length} chats`);
            } catch (error) {
                console.error('Error auto-loading chats:', error);
            }
        } else {
            console.log('Not connected, skipping chat load');
        }
    }
    
    sortAndRenderChats() {
        if (!this.chats || !this.chats.length) return;
        
        // Get active sort method
        const activeSortBtn = document.querySelector('.sort-btn.active');
        const sortMethod = activeSortBtn ? activeSortBtn.id.replace('sort-', '') : 'recent';
        
        let sortedChats = [...this.chats];
        
        // Apply sorting based on method
        switch (sortMethod) {
            case 'recent':
                // Sort by timestamp (most recent first)
                sortedChats.sort((a, b) => {
                    const timeA = a.timestamp || 0;
                    const timeB = b.timestamp || 0;
                    return timeB - timeA;
                });
                break;
                
            case 'unread':
                // Sort by unread count (highest first)
                sortedChats.sort((a, b) => {
                    const unreadA = a.unreadCount || 0;
                    const unreadB = b.unreadCount || 0;
                    if (unreadA === unreadB) {
                        // If unread counts are the same, sort by timestamp
                        const timeA = a.timestamp || 0;
                        const timeB = b.timestamp || 0;
                        return timeB - timeA;
                    }
                    return unreadB - unreadA;
                });
                break;
                
            case 'name':
                // Sort alphabetically by name
                sortedChats.sort((a, b) => {
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
        }
        
        // Render the sorted chats
        this.renderChatList(sortedChats);
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
        const isHidden = container.style.display === 'none' || !container.style.display;

        if (isHidden) {
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
        btn.setAttribute('aria-expanded', 'true');

        // Generate AI prompts based on current chat
        this.generateAIPrompts();
        
        // Announce to screen readers
        this.announceToScreenReader('AI suggestions are now available');
    }

    hideAIPrompts() {
        const container = document.getElementById('ai-prompts-container');
        const btn = document.getElementById('ai-prompts-btn');

        container.style.display = 'none';
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        
        // Announce to screen readers
        this.announceToScreenReader('AI suggestions are now hidden');
    }
    
    // Helper method for screen reader announcements
    announceToScreenReader(message) {
        // Create or get the live region
        let liveRegion = document.getElementById('screen-reader-announcer');
        
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'screen-reader-announcer';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            document.body.appendChild(liveRegion);
        }
        
        // Set the message
        liveRegion.textContent = message;
        
        // Clear after a short delay
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 3000);
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

    // Language detection with caching
    detectLanguage(messages) {
        // Check if we already have a cached language for this chat
        const chatId = this.currentChatId;
        if (this.detectedLanguages && this.detectedLanguages[chatId]) {
            return this.detectedLanguages[chatId];
        }

        const text = messages
            .slice(-10) // Use more messages for better detection
            .map((msg) => msg.body)
            .filter(body => body && body.trim().length > 0)
            .join(' ')
            .toLowerCase();

        if (!text || text.length < 10) {
            return 'English'; // Default fallback
        }

        // Enhanced language detection with more patterns and scoring
        const languagePatterns = {
            German: [
                'der', 'die', 'das', 'und', 'ist', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',
                'haben', 'sein', 'werden', 'können', 'müssen', 'sollen', 'wollen', 'dürfen',
                'nicht', 'aber', 'oder', 'auch', 'noch', 'schon', 'immer', 'nie', 'manchmal',
                'heute', 'gestern', 'morgen', 'hier', 'dort', 'da', 'wo', 'was', 'wer', 'wie',
                'warum', 'wann', 'wenn', 'dass', 'weil', 'damit', 'obwohl', 'falls', 'sobald'
            ],
            Spanish: [
                'el', 'la', 'los', 'las', 'de', 'del', 'en', 'con', 'por', 'para', 'que', 'como',
                'cuando', 'donde', 'porque', 'si', 'no', 'sí', 'muy', 'más', 'menos', 'todo',
                'nada', 'algo', 'también', 'solo', 'sólo', 'ya', 'aún', 'todavía', 'siempre',
                'nunca', 'a veces', 'hoy', 'ayer', 'mañana', 'aquí', 'allí', 'donde', 'qué',
                'quién', 'cómo', 'por qué', 'cuándo', 'si', 'que', 'porque', 'aunque', 'mientras'
            ],
            French: [
                'le', 'la', 'les', 'de', 'du', 'des', 'en', 'avec', 'pour', 'que', 'comme',
                'quand', 'où', 'pourquoi', 'si', 'non', 'oui', 'très', 'plus', 'moins', 'tout',
                'rien', 'quelque', 'aussi', 'seulement', 'déjà', 'encore', 'toujours', 'jamais',
                'parfois', 'aujourd\'hui', 'hier', 'demain', 'ici', 'là', 'où', 'quoi', 'qui',
                'comment', 'pourquoi', 'quand', 'si', 'que', 'parce que', 'bien que', 'pendant'
            ],
            Italian: [
                'il', 'la', 'lo', 'gli', 'le', 'di', 'da', 'in', 'con', 'per', 'che', 'come',
                'quando', 'dove', 'perché', 'se', 'no', 'sì', 'molto', 'più', 'meno', 'tutto',
                'niente', 'qualcosa', 'anche', 'solo', 'già', 'ancora', 'sempre', 'mai',
                'a volte', 'oggi', 'ieri', 'domani', 'qui', 'là', 'dove', 'cosa', 'chi',
                'come', 'perché', 'quando', 'se', 'che', 'perché', 'benché', 'durante'
            ],
            English: [
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
                'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
                'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
                'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                'should', 'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those'
            ]
        };

        // Calculate scores for each language
        const scores = {};
        for (const [language, patterns] of Object.entries(languagePatterns)) {
            scores[language] = 0;
            for (const pattern of patterns) {
                const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    scores[language] += matches.length;
                }
            }
        }

        // Find the language with the highest score
        let detectedLanguage = 'English';
        let maxScore = 0;
        
        for (const [language, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedLanguage = language;
            }
        }

        // If no clear winner, default to English
        if (maxScore < 2) {
            detectedLanguage = 'English';
        }

        // Cache the result for this chat
        if (!this.detectedLanguages) {
            this.detectedLanguages = {};
        }
        this.detectedLanguages[chatId] = detectedLanguage;

        return detectedLanguage;
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
            Japanese: ['元気ですか？', 'どうですか？', 'ありがとう！', 'また後で', '👍'],
        };

        const prompts = defaultPrompts[language] || defaultPrompts.English;
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

    hideAIPrompts() {
        const container = document.getElementById('ai-prompts-container');
        const btn = document.getElementById('ai-prompts-btn');

        container.style.display = 'none';
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        
        // Announce to screen readers
        this.announceToScreenReader('AI suggestions are now hidden');
    }
    
    // Helper method for screen reader announcements
    announceToScreenReader(message) {
        // Create or get the live region
        let liveRegion = document.getElementById('screen-reader-announcer');
        
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'screen-reader-announcer';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            document.body.appendChild(liveRegion);
        }
        
        // Set the message
        liveRegion.textContent = message;
        
        // Clear after a short delay
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 3000);
    }

    setupScheduleModal() {
        // Close schedule modal
        const closeScheduleBtn = document.getElementById('close-schedule-modal');
        if (closeScheduleBtn) {
            closeScheduleBtn.addEventListener('click', () => this.hideScheduleModal());
        }

        // Schedule message button
        const scheduleMessageBtn = document.getElementById('schedule-message-btn');
        if (scheduleMessageBtn) {
            scheduleMessageBtn.addEventListener('click', () => this.scheduleMessage());
        }

        // Cancel schedule button
        const cancelScheduleBtn = document.getElementById('cancel-schedule-btn');
        if (cancelScheduleBtn) {
            cancelScheduleBtn.addEventListener('click', () => this.hideScheduleModal());
        }
    }

    showScheduleModal() {
        const modal = document.getElementById('schedule-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideScheduleModal() {
        const modal = document.getElementById('schedule-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    scheduleMessage() {
        const messageInput = document.getElementById('message-input');
        const scheduleDate = document.getElementById('schedule-date');
        const scheduleTime = document.getElementById('schedule-time');
        
        if (!messageInput || !scheduleDate || !scheduleTime) {
            return;
        }

        const message = messageInput.value.trim();
        const date = scheduleDate.value;
        const time = scheduleTime.value;

        if (!message || !date || !time) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const scheduledDateTime = new Date(`${date}T${time}`);
        const now = new Date();

        if (scheduledDateTime <= now) {
            this.showNotification('Please select a future date and time', 'error');
            return;
        }

        const scheduledMessage = {
            id: Date.now().toString(),
            chatId: this.currentChatId,
            message: message,
            scheduledFor: scheduledDateTime.toISOString(),
            createdAt: now.toISOString()
        };

        this.scheduledMessages.push(scheduledMessage);
        this.saveScheduledMessages();
        
        // Clear the message input
        messageInput.value = '';
        
        this.hideScheduleModal();
        this.showNotification('Message scheduled successfully', 'success');
    }

    loadScheduledMessages() {
        try {
            const stored = localStorage.getItem('scheduledMessages');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    saveScheduledMessages() {
        try {
            localStorage.setItem('scheduledMessages', JSON.stringify(this.scheduledMessages));
        } catch (error) {
            console.error('Error saving scheduled messages:', error);
        }
    }

    startScheduledMessageChecker() {
        setInterval(() => {
            this.checkScheduledMessages();
        }, 60000); // Check every minute
    }

    checkScheduledMessages() {
        const now = new Date();
        const messagesToSend = this.scheduledMessages.filter(msg => {
            const scheduledTime = new Date(msg.scheduledFor);
            return scheduledTime <= now;
        });

        messagesToSend.forEach(msg => {
            this.sendScheduledMessage(msg);
        });
    }

    sendScheduledMessage(scheduledMessage) {
        // Remove from scheduled messages
        this.scheduledMessages = this.scheduledMessages.filter(msg => msg.id !== scheduledMessage.id);
        this.saveScheduledMessages();

        // Send the message
        if (this.currentChatId === scheduledMessage.chatId) {
            this.sendMessage(scheduledMessage.message);
        } else {
            // Switch to the chat and send the message
            this.selectChat(scheduledMessage.chatId);
            setTimeout(() => {
                this.sendMessage(scheduledMessage.message);
            }, 1000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppAIApp();
});
