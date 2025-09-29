// Language translations
const languages = {
    en: {
        // General
        appTitle: 'WhatsApp Web AI',
        loading: 'Loading...',
        online: 'online',
        offline: 'offline',
        lastSeen: 'last seen recently',
        typing: 'typing...',
        
        // Auth
        scanQrCode: 'Scan the QR code',
        waitingForScan: 'Waiting for QR code scan',
        connectionStatus: 'Connection Status',
        connected: 'Connected',
        disconnected: 'Disconnected',
        
        // Search
        search: 'Search or start new chat',
        searchContacts: 'Search contacts',
        
        // Sort options
        sortRecent: 'Recent',
        sortUnread: 'Unread',
        sortName: 'Name',
        
        // Chat
        typeMessage: 'Type a message',
        sendMessage: 'Send message',
        attachFile: 'Attach',
        recordVoice: 'Record voice message',
        aiSuggestions: 'AI Suggestions',
        generatingSuggestions: 'Generating suggestions...',
        noMessages: 'No messages yet',
        
        // Media
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        document: 'Document',
        voiceMessage: 'Voice message',
        generatingSummary: 'Generating summary...',
        
        // Schedule
        scheduleMessage: 'Schedule Message',
        date: 'Date',
        time: 'Time',
        message: 'Message',
        scheduledFor: 'Your message will be sent at:',
        cancel: 'Cancel',
        schedule: 'Schedule',
        
        // Settings
        settings: 'Settings',
        darkMode: 'Dark Mode',
        language: 'Language',
        notifications: 'Notifications',
        privacy: 'Privacy',
        help: 'Help',
        
        // Notifications
        messageSent: 'Message sent',
        messageScheduled: 'Message scheduled',
        errorSending: 'Error sending message',
        errorScheduling: 'Error scheduling message',
    },
    
    de: {
        // General
        appTitle: 'WhatsApp Web AI',
        loading: 'Wird geladen...',
        online: 'online',
        offline: 'offline',
        lastSeen: 'zuletzt gesehen',
        typing: 'schreibt...',
        
        // Auth
        scanQrCode: 'QR-Code scannen',
        waitingForScan: 'Warten auf QR-Code-Scan',
        connectionStatus: 'Verbindungsstatus',
        connected: 'Verbunden',
        disconnected: 'Getrennt',
        
        // Search
        search: 'Suchen oder neuen Chat starten',
        searchContacts: 'Kontakte durchsuchen',
        
        // Sort options
        sortRecent: 'Neueste',
        sortUnread: 'Ungelesen',
        sortName: 'Name',
        
        // Chat
        typeMessage: 'Nachricht eingeben',
        sendMessage: 'Nachricht senden',
        attachFile: 'Anhängen',
        recordVoice: 'Sprachnachricht aufnehmen',
        aiSuggestions: 'KI-Vorschläge',
        generatingSuggestions: 'Vorschläge werden generiert...',
        noMessages: 'Noch keine Nachrichten',
        
        // Media
        image: 'Bild',
        video: 'Video',
        audio: 'Audio',
        document: 'Dokument',
        voiceMessage: 'Sprachnachricht',
        generatingSummary: 'Zusammenfassung wird erstellt...',
        
        // Schedule
        scheduleMessage: 'Nachricht planen',
        date: 'Datum',
        time: 'Uhrzeit',
        message: 'Nachricht',
        scheduledFor: 'Deine Nachricht wird gesendet um:',
        cancel: 'Abbrechen',
        schedule: 'Planen',
        
        // Settings
        settings: 'Einstellungen',
        darkMode: 'Dunkler Modus',
        language: 'Sprache',
        notifications: 'Benachrichtigungen',
        privacy: 'Datenschutz',
        help: 'Hilfe',
        
        // Notifications
        messageSent: 'Nachricht gesendet',
        messageScheduled: 'Nachricht geplant',
        errorSending: 'Fehler beim Senden der Nachricht',
        errorScheduling: 'Fehler beim Planen der Nachricht',
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = languages;
}
