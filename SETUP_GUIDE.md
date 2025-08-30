# LLM Agent POC - API Setup Guide

This guide helps you set up all the API keys and credentials needed for the full functionality of the LLM Agent POC.

## 🔑 Required API Keys

### 1. **Google Search API Setup** (For Real Search Results)

#### Step 1: Get Google API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Custom Search API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

#### Step 2: Create Custom Search Engine
1. Go to [Google Custom Search](https://cse.google.com/)
2. Click "Add" to create a new search engine
3. Enter any website (e.g., `*.com` for all sites)
4. Create the search engine
5. Go to "Setup" > "Basics"
6. Copy your **Search Engine ID** (cx parameter)

#### Step 3: Configure Search Engine
1. In the Custom Search setup, go to "Setup" > "Basics"
2. Toggle "Search the entire web" to ON
3. Save changes

### 2. **OpenAI API Key**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/login to your account
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy your API key

### 3. **Anthropic API Key**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up/login to your account
3. Go to "API Keys" section
4. Generate a new API key
5. Copy your API key

### 4. **Google AI API Key**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Click "Get API Key"
4. Copy your API key

### 5. **AI Pipe API Key**
1. Go to [AI Pipe](https://aipipe.org/)
2. Sign up for an account
3. Get your API key from dashboard
4. Copy your API key

## 🚀 Quick Setup

### Option 1: Enter Keys in UI
1. Open the LLM Agent POC in your browser
2. Enter all API keys in the configuration section
3. Click "Save Credentials" to store them locally
4. Click "Test Connections" to verify everything works

### Option 2: Use Browser Console
```javascript
// Enter this in browser console to quickly set all keys
document.getElementById('openaiApiKey').value = 'your-openai-key';
document.getElementById('googleApiKey').value = 'your-google-key';
document.getElementById('googleSearchEngineId').value = 'your-search-engine-id';
document.getElementById('anthropicApiKey').value = 'your-anthropic-key';
document.getElementById('aipipeApiKey').value = 'your-aipipe-key';
saveCredentials(); // Save to localStorage
```

## 🧪 Testing

### Test Google Search
```
Input: "Search for latest AI news"
Expected: Real Google search results with current news
```

### Test LLM Providers
1. Select different providers (OpenAI, Anthropic, Google, AI Pipe)
2. Test basic conversation
3. Verify tool calls work properly

### Test AI Pipe Workflows
```
Input: "Analyze this text: Artificial intelligence is transforming industries"
Expected: AI analysis using AI Pipe workflow
```

### Test Code Execution
```
Input: "Run this code: console.log('Hello World')"
Expected: Code execution with output display
```

## 🔒 Security Notes

- **Never commit API keys to version control**
- **Use environment variables in production**
- **Regularly rotate your API keys**
- **Monitor your API usage and costs**
- **Set up billing alerts for cloud services**

## 💰 Cost Considerations

### Free Tiers Available:
- **Google Custom Search**: 100 queries/day free
- **OpenAI**: $5 free credit for new accounts
- **Google AI**: Generous free tier
- **Anthropic**: Free tier available

### Paid Usage:
- **Google Search**: $5 per 1000 queries after free tier
- **OpenAI GPT-4**: ~$0.03 per 1K tokens
- **Anthropic Claude**: ~$0.008 per 1K tokens
- **AI Pipe**: Varies by usage

## 🛠️ Troubleshooting

### Google Search Not Working
- ✅ Check API key is valid
- ✅ Verify Custom Search Engine ID
- ✅ Ensure "Search the entire web" is enabled
- ✅ Check quota limits

### LLM Provider Errors
- ✅ Verify API key format
- ✅ Check account credits/billing
- ✅ Ensure model name is correct
- ✅ Check network connectivity

### CORS Issues
- ✅ Serve from HTTP server (not file://)
- ✅ Use proper HTTPS URLs for APIs
- ✅ Check browser console for errors

## 📝 Example Configuration

Here's what a fully configured setup looks like:

```
Provider: OpenAI (Direct)
Model: gpt-4

API Keys:
✅ AI Pipe API Key: aip_123...
✅ OpenAI API Key: sk-123...
✅ Anthropic API Key: sk-ant-123...
✅ Google API Key: AIza123...
✅ Google Search Engine ID: 123abc...

Status: All connections tested ✅
```

## 🎯 Production Deployment

For production use, consider:

1. **Environment Variables**:
   ```bash
   export OPENAI_API_KEY="your-key"
   export GOOGLE_API_KEY="your-key"
   export GOOGLE_SEARCH_ENGINE_ID="your-id"
   ```

2. **Server-side Proxy**: Avoid exposing API keys in client-side code

3. **Rate Limiting**: Implement proper rate limiting

4. **Error Handling**: Add comprehensive error handling

5. **Monitoring**: Set up logging and monitoring

---

🎉 **You're all set!** Your LLM Agent POC now has full API integration capabilities.
