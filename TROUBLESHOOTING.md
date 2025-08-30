# LLM Agent POC - Troubleshooting Guide

## 🔧 Common Issues & Solutions

### 1. **AI Pipe Errors**
```
Error: net::ERR_NAME_NOT_RESOLVED (api.aipipe.org)
```
**Solution**: AI Pipe API endpoint is not currently available. The app will automatically use enhanced simulation mode.

**What to do**: Switch to OpenAI provider for real API responses.

---

### 2. **OpenAI API Errors**

#### **Model Not Found (404)**
```
Error: The model `gpt-4` does not exist or you do not have access to it
```
**Solution**: 
- Use `gpt-3.5-turbo` instead (now the default)
- GPT-4 requires billing setup on your OpenAI account

#### **Quota Exceeded (429)**
```
Error: You exceeded your current quota
```
**Solution**:
- Add billing information to your OpenAI account
- Check your usage at https://platform.openai.com/usage
- Wait for quota reset if on free tier

#### **Invalid API Key (401)**
```
Error: Incorrect API key provided
```
**Solution**:
- Get a new API key from https://platform.openai.com/api-keys
- Make sure to copy the full key (starts with `sk-`)

---

### 3. **Google Search Issues**

#### **No Search Results**
**Check**:
- ✅ Google API key is entered
- ✅ Search Engine ID is entered
- ✅ Custom Search Engine has "Search the entire web" enabled

#### **API Quota Exceeded**
**Solution**:
- Free tier: 100 searches/day
- Paid: $5 per 1000 additional searches

---

### 4. **Network Issues**

#### **CORS Errors**
**Solution**:
- Make sure you're accessing via HTTP server (not file://)
- Use the provided Python server: `python3 -m http.server 8080`

#### **Failed to Fetch**
**Causes**:
- Internet connection issues
- Firewall blocking requests
- Invalid API endpoints

---

## 🚀 Recommended Setup

### **Option 1: Full Features (Requires API Keys)**
```
Provider: OpenAI
Model: gpt-3.5-turbo
OpenAI API Key: sk-your-key-here
Google API Key: AIza-your-key-here
Google Search Engine ID: your-search-id-here
```

### **Option 2: Basic Setup (No API Keys Needed)**
```
Provider: OpenAI (will use simulation)
Model: gpt-3.5-turbo
Result: Enhanced simulation mode with smart responses
```

### **Option 3: Search Only**
```
Provider: OpenAI (simulation mode)
Google API Key: AIza-your-key-here
Google Search Engine ID: your-search-id-here
Result: Real search + simulated LLM responses
```

---

## 📊 Feature Status

| Feature | Status | Requirements |
|---------|--------|-------------|
| Enhanced Simulation | ✅ Working | None |
| OpenAI API | ✅ Working | API Key + Billing |
| Google Search | ✅ Working | API Key + Search Engine ID |
| AI Pipe | ⚠️ Simulation Only | API endpoint unavailable |
| Anthropic | ⚠️ Needs Testing | API Key |
| Google Gemini | ⚠️ Needs Testing | API Key |
| Code Execution | ✅ Working | None |
| AI Workflows | ✅ Working | None |

---

## 🆘 Quick Fixes

### **Nothing Works**
1. Clear browser cache
2. Check browser console for errors
3. Ensure server is running on port 8080
4. Try simulation mode (no API keys)

### **Slow Responses**
1. Check internet connection
2. Try gpt-3.5-turbo instead of gpt-4
3. Use simulation mode for faster responses

### **Can't Save Credentials**
1. Enable localStorage in browser settings
2. Allow cookies for the domain
3. Try incognito mode to test

---

## 💡 Tips

- **Start Simple**: Try simulation mode first
- **Test Search**: Google Search works well with API keys
- **Use gpt-3.5-turbo**: More reliable than gpt-4
- **Check Console**: Browser console shows detailed errors
- **Save Credentials**: Use the save/load buttons for convenience

---

## 🔗 Getting API Keys

| Provider | URL | Notes |
|----------|-----|-------|
| OpenAI | https://platform.openai.com/api-keys | Requires billing for GPT-4 |
| Google Search | https://console.cloud.google.com | Enable Custom Search API |
| Google Custom Search | https://cse.google.com | Create search engine |
| Anthropic | https://console.anthropic.com | Beta access required |
| Google AI | https://aistudio.google.com | Free tier available |

---

**Need help?** Check the browser console for detailed error messages!
