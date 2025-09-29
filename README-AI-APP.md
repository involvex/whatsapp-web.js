# WhatsApp AI Web App

A full-featured WhatsApp Web application with AI integration using Google's Gemini AI. This app provides a WhatsApp Web-like interface with intelligent response generation based on chat histories.

## Features

### 🤖 AI Integration

- **Gemini AI Integration**: Uses Google's Gemini AI for intelligent response generation
- **Multiple Response Options**: Generates 3 different response options for each message
- **Generate More**: Ability to generate additional response variations
- **Context-Aware**: AI responses are based on chat history and context

### 💬 WhatsApp Features

- **Full WhatsApp Web Interface**: Complete WhatsApp Web-like UI
- **Persistent Login**: Sessions survive service restarts
- **Real-time Messaging**: Live message updates via WebSocket
- **Chat Management**: View and manage all your WhatsApp chats
- **Media Support**: Send and receive images, documents, and other media

### 🎨 Modern UI

- **WhatsApp-like Design**: Authentic WhatsApp Web interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern dark theme matching WhatsApp Web
- **Real-time Updates**: Live status indicators and notifications

## Installation

### Prerequisites

- Node.js 18+
- WhatsApp account
- Google Gemini API key

### Setup

1. **Clone and Install Dependencies**

    ```bash
    # Install the main dependencies
    npm install express socket.io qrcode @google/generative-ai cors helmet compression dotenv

    # Install development dependencies
    npm install -D nodemon
    ```

2. **Environment Configuration**

    ```bash
    # Copy the example environment file
    cp env.example .env

    # Edit .env and add your Gemini API key
    GEMINI_API_KEY=your_gemini_api_key_here
    PORT=3000
    WHATSAPP_CLIENT_ID=whatsapp-ai-client
    ```

3. **Get Gemini API Key**
    - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
    - Create a new API key
    - Add it to your `.env` file

4. **Create Data Directory**
    ```bash
    mkdir -p data
    ```

## Usage

### Starting the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### First Time Setup

1. **Start the application**

    ```bash
    npm start
    ```

2. **Open your browser**
    - Navigate to `http://localhost:3000`

3. **Scan QR Code**
    - Open WhatsApp on your phone
    - Go to Settings > Linked Devices
    - Tap "Link a Device"
    - Scan the QR code displayed in the browser

4. **Start Chatting**
    - Once connected, you can start chatting
    - AI will automatically generate response suggestions
    - Click on AI responses to use them

## API Endpoints

### REST API

- `GET /` - Main application interface
- `GET /api/chats` - Get all WhatsApp chats
- `GET /api/chat/:chatId` - Get chat history
- `POST /api/send-message` - Send a message
- `POST /api/generate-ai` - Generate AI responses

### WebSocket Events

- `connect` - Client connected
- `qr` - QR code for authentication
- `ready` - WhatsApp client ready
- `new-message` - New message received
- `ai-responses` - AI response options
- `status` - Connection status updates

## Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=3000
WHATSAPP_CLIENT_ID=whatsapp-ai-client
```

### WhatsApp Client Options

The app uses the following WhatsApp client configuration:

```javascript
{
    authStrategy: new LocalAuth({
        clientId: "whatsapp-ai-client",
        dataPath: "./data"
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
            '--disable-gpu'
        ]
    }
}
```

## AI Features

### Response Generation

The AI system generates responses based on:

1. **Chat History**: Last 10 messages for context
2. **Current Message**: The message being responded to
3. **Context**: Additional context provided by the user

### Multiple Options

For each message, the AI generates 3 different response options:

- **Option 1**: Direct, helpful response
- **Option 2**: Alternative approach or tone
- **Option 3**: Creative or different perspective

### Generate More

Users can request additional response variations by clicking "Generate More" in the AI modal.

## File Structure

```
whatsapp-ai-web/
├── app.js                 # Main application server
├── package-app.json       # Application dependencies
├── env.example           # Environment configuration example
├── public/               # Frontend files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styles
│   └── app.js           # Frontend JavaScript
├── data/                 # Persistent data storage
│   ├── .wwebjs_auth/    # WhatsApp authentication data
│   └── web-version-cache/ # WhatsApp Web version cache
└── README-AI-APP.md     # This file
```

## Security Considerations

### Data Storage

- Chat histories are stored in memory (not persistent)
- WhatsApp authentication data is stored locally in `./data`
- No sensitive data is logged or transmitted

### API Security

- CORS enabled for development
- Helmet.js for security headers
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **QR Code Not Appearing**
    - Check if WhatsApp Web is already connected elsewhere
    - Restart the application
    - Clear browser cache

2. **AI Not Responding**
    - Verify Gemini API key is correct
    - Check API quota limits
    - Review console logs for errors

3. **Messages Not Sending**
    - Ensure WhatsApp client is ready
    - Check internet connection
    - Verify phone is connected to internet

### Logs

Check the console output for detailed logs:

```bash
# Development mode with detailed logs
DEBUG=* npm run dev
```

## Development

### Adding New Features

1. **Frontend**: Modify files in `public/`
2. **Backend**: Update `app.js`
3. **AI Integration**: Extend the `generateAIResponses` method

### Testing

```bash
# Test the application
npm start

# In another terminal, test API endpoints
curl http://localhost:3000/api/chats
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is not affiliated with WhatsApp or Meta. It uses the whatsapp-web.js library to interact with WhatsApp Web. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the console logs
3. Open an issue on GitHub
4. Join our Discord community

---

**Note**: This application requires an active WhatsApp account and internet connection. The AI features require a valid Gemini API key.
