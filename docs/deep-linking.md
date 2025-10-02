# Deep Linking in ToolHive Studio

ToolHive Studio supports deep linking to provide a seamless user experience when installing MCP servers. This feature allows external tools, documentation, and error messages to direct users directly to the server installation page in the UI.

## Overview

The deep linking system consists of:

1. **Custom URL Scheme**: `toolhive://` protocol for OS-level integration
2. **HTTP Control Endpoint**: Fallback for when the UI is already running
3. **CLI Command Generation**: Alternative for command-line users

## URL Scheme Format

```
toolhive://action?parameter=value
```

### Supported Actions

#### `install-server`
Navigate to the server installation page in the registry.

**Parameters:**
- `server` (required): Server name to install
- `registry` (optional): Registry name (defaults to 'official')

**Example:**
```
toolhive://install-server?server=github&registry=official
```


## HTTP Control Endpoint

When ToolHive Studio is running, it starts an HTTP control server on `http://127.0.0.1:51234` for programmatic navigation.

### Endpoints

#### `GET /health`
Check if the control server is running.

**Response:**
```json
{
  "status": "ok",
  "service": "toolhive-studio-control",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /navigate`
Navigate to a deep link URL.

**Request Body:**
```json
{
  "url": "toolhive://install-server?server=github-mcp-server"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Navigation handled"
}
```

#### `GET /navigate?url=<encoded-url>`
Alternative GET endpoint for navigation.

**Example:**
```
GET /navigate?url=toolhive%3A//install-server%3Fserver%3Dgithub-mcp-server
```

## Usage Examples

### From Documentation
Include deep links in your MCP server documentation:

```markdown
## Quick Install

Click here to install in ToolHive Studio:
[Install GitHub MCP Server](toolhive://install-server?server=github-mcp-server&registry=official)

Or run this command:
```bash
thv run --registry official github-mcp-server
```

### From Error Messages
When a required secret is missing, generate a deep link:

```typescript
const deepLink = `toolhive://install-server?server=${serverName}&secret_API_KEY=<your-api-key>`
console.error(`Missing API_KEY. Configure it here: ${deepLink}`)
```

### From External Tools
Use the HTTP control endpoint to navigate programmatically:

```bash
# Check if ToolHive Studio is running
curl -s http://127.0.0.1:51234/health

# Navigate to install page
curl -X POST http://127.0.0.1:51234/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "toolhive://install-server?server=my-server"}'
```

### From JavaScript/Node.js
```javascript
async function openInToolHive(serverName, environment = {}, secrets = {}) {
  const url = new URL('toolhive://install-server')
  url.searchParams.set('server', serverName)
  
  // Add environment variables
  for (const [key, value] of Object.entries(environment)) {
    url.searchParams.set(`env_${key}`, value)
  }
  
  // Add secrets
  for (const [key, value] of Object.entries(secrets)) {
    url.searchParams.set(`secret_${key}`, value)
  }
  
  // Try HTTP control endpoint first (if UI is running)
  try {
    const response = await fetch('http://127.0.0.1:51234/navigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.toString() })
    })
    
    if (response.ok) {
      console.log('Navigated via control endpoint')
      return
    }
  } catch (error) {
    // Control endpoint not available, fall back to OS
  }
  
  // Fallback to OS deep link (will launch app if not running)
  window.open(url.toString(), '_blank')
}
```

## Implementation Details

### OS Integration

The deep linking system registers the `toolhive://` protocol with the operating system:

- **macOS**: Uses `app.setAsDefaultProtocolClient()` and handles `open-url` events
- **Windows**: Registers protocol in registry, handles via `second-instance` event
- **Linux**: Uses desktop file registration, handles via command line arguments

### Security Considerations

1. **Local Only**: The HTTP control endpoint only binds to `127.0.0.1` (localhost)
2. **URL Validation**: All URLs must start with `toolhive://`
3. **Parameter Sanitization**: All parameters are validated and sanitized
4. **No Sensitive Data**: Secrets in URLs are for convenience only; users should set them securely

### Error Handling

- Invalid URLs are logged and ignored
- Navigation failures fall back to the default page
- Network errors in the control endpoint are handled gracefully
- Missing required parameters show appropriate error messages

## Best Practices

1. **Always provide CLI alternatives** for users who prefer command-line tools
2. **Use environment variables** for non-sensitive configuration
3. **Prompt for secrets** rather than including them in URLs when possible
4. **Test deep links** on all supported platforms
5. **Provide fallback instructions** if deep linking fails

## Testing

You can test deep links using:

```bash
# macOS
open "toolhive://install-server?server=test-server"

# Windows
start "toolhive://install-server?server=test-server"

# Linux
xdg-open "toolhive://install-server?server=test-server"

# HTTP Control Endpoint
curl -X POST http://127.0.0.1:51234/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "toolhive://install-server?server=test-server"}'
```
