# Secure Share

A private, secure, local file sharing solution for transferring files between devices over WiFi without internet connectivity or data exfiltration.

## Features

- **100% Local** - All transfers happen on your local network. No internet required, no telemetry.
- **Secure by Default** - HTTPS encryption for all connections with self-signed certificates
- **QR Code Pairing** - Easy device pairing with QR codes
- **Web-Based UI** - Works on any device with a modern browser (mobile, tablet, desktop)
- **Bidirectional Transfers** - Upload and download files
- **Directory Browsing** - Navigate through shared folders
- **No Third-Party Servers** - Everything runs locally on your machine

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Navigate to the server directory:
```bash
cd secure-share/server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and go to `https://localhost:8443`

5. Create a sharing session, scan the QR code with your mobile device, and start sharing!

## Usage

### On Computer (Host)
1. Start the server and create a session
2. Select the directory you want to share
3. Scan the QR code or share the URL with your other device

### On Mobile/Other Device
1. Connect to the same WiFi network as the host computer
2. Scan the QR code with your camera or open the URL directly
3. Browse and download files, or upload files to the host

## Security Features

- **Local-only**: Server binds to all network interfaces but only accessible on local network
- **HTTPS encryption**: All traffic is encrypted with TLS
- **Session-based access**: Each sharing session has a unique ID
- **Path traversal protection**: Prevents access outside shared directory
- **No telemetry**: Zero external network calls, no analytics, no tracking

## Architecture

- **Backend**: Node.js + Express server
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks, minimal attack surface)
- **Encryption**: Self-signed TLS certificates
- **Transport**: HTTPS over local WiFi network

## Recommendations for Production Use

For better security:
1. Use a proper CA-signed certificate instead of self-signed
2. Add device authentication tokens
3. Implement rate limiting
4. Add file type restrictions if needed
5. Use firewall rules to restrict access

## Comparison with SHAREit

| Feature | Secure Share | SHAREit |
|---|---|---|
| Local-only transfers | ✓ | ✓ (with internet possible) |
| No telemetry | ✓ | ✗ (has analytics) |
| Open source | ✓ | ✗ (closed source) |
| End-to-end control | ✓ | ✗ |
| No ads | ✓ | ✗ |
| Transparent | ✓ | ✗ |

## License

MIT License - Free to use, modify, and distribute.
