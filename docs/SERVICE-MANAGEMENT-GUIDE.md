# WhatsApp AI Service Management Guide

## 🚀 **Quick Commands**

### **Start Service**

```bash
npm start
# or
node service.js start
```

### **Stop Service**

```bash
npm run stop
# or
node service.js stop
```

### **Restart Service**

```bash
npm run restart
# or
node service.js restart
```

### **Check Status**

```bash
npm run status
# or
node service.js status
```

### **View Logs**

```bash
npm run logs
# or
node service.js logs
```

## 📋 **Available Commands**

### **NPM Scripts**

| Command           | Description                   | Example           |
| ----------------- | ----------------------------- | ----------------- |
| `npm start`       | Start the WhatsApp AI service | `npm start`       |
| `npm run stop`    | Stop the service              | `npm run stop`    |
| `npm run restart` | Restart the service           | `npm run restart` |
| `npm run status`  | Check service status          | `npm run status`  |
| `npm run logs`    | View service logs             | `npm run logs`    |
| `npm run setup`   | Setup confirmation            | `npm run setup`   |

### **Direct Service Commands**

| Command                   | Description                  | Example                   |
| ------------------------- | ---------------------------- | ------------------------- |
| `node service.js start`   | Start with service manager   | `node service.js start`   |
| `node service.js stop`    | Stop with service manager    | `node service.js stop`    |
| `node service.js restart` | Restart with service manager | `node service.js restart` |
| `node service.js status`  | Check status with details    | `node service.js status`  |
| `node service.js logs`    | View detailed logs           | `node service.js logs`    |

## 🔧 **Service Management Features**

### **✅ Automatic Process Management**

- **PID Tracking**: Tracks service process ID
- **Graceful Shutdown**: Proper service termination
- **Process Monitoring**: Checks if service is running
- **Auto-Cleanup**: Removes PID files on exit

### **✅ Logging System**

- **Service Logs**: Automatic log file creation
- **Timestamped Entries**: All logs include timestamps
- **Error Tracking**: Captures and logs errors
- **Output Capture**: Captures stdout and stderr

### **✅ Status Monitoring**

- **Running Status**: Check if service is active
- **Process ID**: Display current process ID
- **Access URLs**: Show local and network access points
- **Health Check**: Verify service functionality

## 🎯 **Usage Examples**

### **Starting the Service**

```bash
# Simple start
npm start

# Start with service manager
npm run start:service

# Direct start
node app.js
```

### **Stopping the Service**

```bash
# Graceful stop
npm run stop

# Force stop (if needed)
taskkill /F /IM node.exe
```

### **Checking Status**

```bash
# Quick status check
npm run status

# Detailed status
node service.js status
```

### **Viewing Logs**

```bash
# View service logs
npm run logs

# Check console output
# (Logs are also displayed in console)
```

## 🔄 **Service Lifecycle**

### **1. Starting**

1. **Check Status**: Verify service not already running
2. **Start Process**: Launch Node.js application
3. **Save PID**: Store process ID for management
4. **Log Output**: Capture and log all output
5. **Display URLs**: Show access information

### **2. Running**

- **Process Monitoring**: Continuous status checking
- **Log Capture**: All output logged to file
- **Error Handling**: Graceful error management
- **Status Updates**: Real-time status information

### **3. Stopping**

1. **Graceful Shutdown**: Send termination signal
2. **Process Cleanup**: Remove PID file
3. **Log Finalization**: Complete log entries
4. **Status Update**: Confirm service stopped

## 📊 **Service Status Indicators**

### **Running Status**

```
✅ Running (PID: 12345)
📱 Access: http://localhost:3000
🌐 Network: Check console for network IP
```

### **Stopped Status**

```
❌ Not running
```

### **Error Status**

```
⚠️  Service error: [error details]
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Service Won't Start**
    - Check if port 3000 is available
    - Verify Node.js is installed
    - Check for syntax errors in app.js
    - Review error logs

2. **Service Won't Stop**
    - Use force stop: `taskkill /F /IM node.exe`
    - Check for multiple Node.js processes
    - Restart terminal/command prompt

3. **Service Not Accessible**
    - Check firewall settings
    - Verify network configuration
    - Check if service is actually running
    - Review access URLs

### **Debug Commands**

```bash
# Check all Node.js processes
tasklist /FI "IMAGENAME eq node.exe"

# Check port usage
netstat -an | findstr :3000

# View detailed logs
npm run logs

# Force restart
npm run stop && npm start
```

## 🎉 **Benefits**

### **✅ Easy Management**

- Simple commands for all operations
- No need to remember complex commands
- Consistent interface across platforms

### **✅ Process Safety**

- Graceful shutdown procedures
- PID tracking and management
- Automatic cleanup on exit

### **✅ Monitoring**

- Real-time status checking
- Comprehensive logging system
- Error tracking and reporting

### **✅ User-Friendly**

- Clear command descriptions
- Helpful error messages
- Status indicators and feedback

## 📚 **Additional Information**

### **Service Files**

- **`.service.pid`**: Process ID storage
- **`.service.log`**: Service log file
- **`service.js`**: Service management script

### **Access Points**

- **Local**: http://localhost:3000
- **Network**: http://[your-ip]:3000
- **Status**: Check console output for network IP

### **Dependencies**

- Node.js (v18+)
- All project dependencies installed
- Proper environment configuration

---

**Note**: The service management system provides a complete solution for starting, stopping, monitoring, and managing your WhatsApp AI service with simple, intuitive commands! 🚀
