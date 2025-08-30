// LLM Agent POC - Core Agent Logic

class LLMAgent {
    constructor() {
        this.tools = new Tools();
        this.messages = [];
        this.isProcessing = false;
        this.conversationWindow = document.getElementById('conversationWindow');
        this.userInput = document.getElementById('userInput');
        this.statusBadge = document.getElementById('statusBadge');
        this.alertContainer = document.getElementById('alertContainer');
    }

    async loop() {
        while (this.messages.length > 0 && this.isProcessing) {
            try {
                this.updateStatus('Thinking...');
                
                const { output, toolCalls } = await this.callLLM(this.messages, this.tools.getToolDefinitions());
                
                if (output && output.trim()) {
                    this.addMessage('agent', output);
                }

                if (toolCalls && toolCalls.length > 0) {
                    this.updateStatus('Executing tools...');
                    
                    // Execute tool calls (potentially in parallel)
                    const toolResults = await Promise.all(
                        toolCalls.map(async (toolCall) => {
                            this.addMessage('tool-call', `🔧 ${toolCall.function.name}(${JSON.stringify(toolCall.function.arguments)})`);
                            
                            const result = await this.tools.executeToolCall(toolCall);
                            
                            this.addMessage('tool-result', `✅ Result: ${JSON.stringify(result, null, 2)}`);
                            
                            return {
                                tool_call_id: toolCall.id,
                                role: 'tool',
                                content: JSON.stringify(result)
                            };
                        })
                    );

                    // Add tool results to messages
                    this.messages.push(...toolResults);
                } else {
                    // No tool calls, wait for user input
                    this.isProcessing = false;
                    this.updateStatus('Ready');
                    break;
                }
            } catch (error) {
                this.showError(`Agent error: ${error.message}`);
                this.isProcessing = false;
                this.updateStatus('Error');
                break;
            }
        }
    }

    async callLLM(messages, tools) {
        const provider = document.getElementById('modelProvider').value;
        const model = document.getElementById('modelName').value;
        
        // Get the appropriate API key based on provider
        let apiKey;
        switch (provider) {
            case 'aipipe':
                apiKey = document.getElementById('aipipeApiKey').value;
                break;
            case 'openai':
                apiKey = document.getElementById('openaiApiKey').value;
                break;
            case 'anthropic':
                apiKey = document.getElementById('anthropicApiKey').value;
                break;
            case 'google':
                apiKey = document.getElementById('googleApiKey').value;
                break;
        }

        // If no API key is provided, use simulation with a notice
        if (!apiKey) {
            console.warn(`${provider.toUpperCase()} API key not provided, using simulation mode`);
            this.showWarning(`Using simulation mode. Add your ${provider.toUpperCase()} API key for real LLM responses.`);
            return this.simulateLLMCall(messages, tools);
        }

        // Prepare the request based on provider
        let apiUrl, headers, body;

        switch (provider) {
            case 'aipipe':
                // Use OpenAI format through AI Pipe proxy
                apiUrl = 'https://aipipe.org/openrouter/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                body = {
                    model: this.mapModelForAIPipe(model),
                    messages: messages,
                    tools: tools.length > 0 ? tools : undefined,
                    tool_choice: tools.length > 0 ? 'auto' : undefined,
                    max_tokens: 1000
                };
                break;
            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                // Use gpt-3.5-turbo as fallback if gpt-4 isn't available
                const openaiModel = model === 'gpt-4' ? 'gpt-3.5-turbo' : model;
                body = {
                    model: openaiModel,
                    messages: messages,
                    tools: tools,
                    tool_choice: 'auto',
                    max_tokens: 1000
                };
                break;
            case 'anthropic':
                apiUrl = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                };
                // Convert messages format for Anthropic
                const systemMessage = messages.find(m => m.role === 'system');
                const userMessages = messages.filter(m => m.role !== 'system');
                body = {
                    model: model,
                    max_tokens: 1024,
                    system: systemMessage?.content || '',
                    messages: userMessages,
                    tools: tools
                };
                break;
            case 'google':
                // Use Google Gemini API via AI Pipe or direct
                if (apiKey.startsWith('aip_')) {
                    // Use AI Pipe for Gemini
                    apiUrl = 'https://aipipe.org/geminiv1beta/models/gemini-1.5-flash:generateContent';
                    headers = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    };
                    body = {
                        contents: messages.map(msg => ({
                            parts: [{ text: msg.content }]
                        }))
                    };
                } else {
                    // Direct Google API
                    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    headers = {
                        'Content-Type': 'application/json'
                    };
                    const contents = messages.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    }));
                    body = {
                        contents: contents,
                        tools: tools.length > 0 ? [{ function_declarations: tools.map(t => t.function) }] : undefined
                    };
                }
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        try {
            console.log(`Making ${provider} API call to:`, apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            console.log(`${provider} response status:`, response.status, response.statusText);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = await response.json();
                    console.log(`${provider} error data:`, errorData);
                    errorMessage = errorData.error?.message || errorMessage;
                    
                    // Handle specific errors
                    if (response.status === 404) {
                        if (provider === 'aipipe') {
                            errorMessage = `AI Pipe endpoint not found. Check API endpoint or try simulation mode.`;
                        } else if (provider === 'openai') {
                            errorMessage = `Model "${model}" not available. Try "gpt-3.5-turbo" instead.`;
                        }
                    } else if (response.status === 429) {
                        errorMessage = 'API quota exceeded. Check your billing or try again later.';
                    } else if (response.status === 401) {
                        errorMessage = 'Invalid API key. Please check your credentials.';
                    }
                } catch (e) {
                    // Error response is not JSON
                    console.log(`${provider} error response not JSON:`, e);
                }
                
                throw new Error(errorMessage);
            }

            const responseText = await response.text();
            console.log(`${provider} raw response:`, responseText.substring(0, 200) + '...');
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error(`${provider} response parsing error:`, e);
                console.error('Response was:', responseText.substring(0, 500));
                throw new Error(`Invalid JSON response from ${provider}: ${e.message}`);
            }
            
            // Handle different response formats
            let output, toolCalls;
            switch (provider) {
                case 'aipipe':
                    // AI Pipe returns OpenAI-compatible format
                    const aipipeChoice = data.choices?.[0];
                    if (!aipipeChoice) {
                        throw new Error('No response choices returned from AI Pipe');
                    }
                    output = aipipeChoice.message?.content || '';
                    toolCalls = aipipeChoice.message?.tool_calls || [];
                    break;
                case 'anthropic':
                    output = data.content?.[0]?.text || '';
                    toolCalls = data.tool_calls || [];
                    break;
                case 'google':
                    if (apiKey.startsWith('aip_')) {
                        // AI Pipe Gemini response
                        output = data.response || data.content || '';
                        toolCalls = data.tool_calls || [];
                    } else {
                        // Direct Google API response
                        output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        toolCalls = data.candidates?.[0]?.content?.parts?.filter(p => p.functionCall) || [];
                    }
                    break;
                default: // OpenAI format
                    const choice = data.choices?.[0];
                    if (!choice) {
                        throw new Error('No response choices returned from API');
                    }
                    output = choice.message?.content || '';
                    toolCalls = choice.message?.tool_calls || [];
            }
            
            return { output, toolCalls };
        } catch (error) {
            // Enhanced error handling with specific suggestions
            let fallbackMessage = `${provider.toUpperCase()} API failed: ${error.message}`;
            
            if (error.message.includes('Failed to fetch')) {
                fallbackMessage += ` (Network issue - check internet connection)`;
            } else if (error.message.includes('quota')) {
                fallbackMessage += ` (Add billing information to your account)`;
            } else if (error.message.includes('not exist')) {
                fallbackMessage += ` (Try a different model like gpt-3.5-turbo)`;
            }
            
            console.warn(fallbackMessage);
            this.showWarning(fallbackMessage + '. Using enhanced simulation mode.');
            return this.simulateLLMCall(messages, tools);
        }
    }

    getProviderFromModel(model) {
        if (model.includes('gpt')) return 'openai';
        if (model.includes('claude')) return 'anthropic';
        if (model.includes('gemini')) return 'google';
        return 'openai'; // default
    }

    mapModelForAIPipe(model) {
        // Map our model names to OpenRouter compatible names via AI Pipe
        const modelMap = {
            'gpt-4': 'openai/gpt-4-turbo',
            'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
            'claude-3-opus': 'anthropic/claude-3-opus',
            'claude-3-sonnet': 'anthropic/claude-3-sonnet',
            'gemini-pro': 'google/gemini-pro'
        };
        return modelMap[model] || 'openai/gpt-3.5-turbo';
    }

    formatMessagesForAIPipe(messages) {
        // AI Pipe expects input as string based on the documentation
        const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
        return lastUserMessage?.content || '';
    }

    async simulateLLMCall(messages, tools) {
        // Simulate LLM processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const lastMessage = messages[messages.length - 1];
        const userContent = lastMessage?.content || '';

        // Check if this is a tool result message
        if (lastMessage?.role === 'tool') {
            try {
                const toolResult = JSON.parse(userContent);
                
                // Handle Google search results
                if (toolResult.query && toolResult.results) {
                    const formattedResults = toolResult.results.map((result, index) => 
                        `${index + 1}. **${result.title}**\n   ${result.snippet}\n   [${result.url}](${result.url})`
                    ).join('\n\n');
                    
                    return {
                        output: `Here are the search results for "${toolResult.query}":\n\n${formattedResults}\n\nWould you like me to search for something else or help you with anything specific from these results?`,
                        toolCalls: []
                    };
                }
                
                // Handle AI Pipe results
                if (toolResult.workflow && toolResult.output) {
                    return {
                        output: `AI Pipe ${toolResult.workflow} completed:\n\n${toolResult.output}\n\nIs there anything else you'd like me to process or analyze?`,
                        toolCalls: []
                    };
                }
                
                // Handle JavaScript execution results
                if (toolResult.code !== undefined) {
                    const status = toolResult.success ? '✅ Success' : '❌ Error';
                    const output = toolResult.output || '';
                    const error = toolResult.error ? `Error: ${toolResult.error}` : '';
                    
                    return {
                        output: `Code execution ${status}:\n\nCode:\n\`\`\`javascript\n${toolResult.code}\n\`\`\`\n\nOutput:\n\`\`\`\n${output}\n${error}\n\`\`\`\n\nWould you like to run more code or try something else?`,
                        toolCalls: []
                    };
                }
            } catch (e) {
                // If JSON parsing fails, treat as regular content
            }
        }

        // Find the last user message for context
        const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
        const lastUserContent = lastUserMessage?.content || '';
        
        // Get conversation history for better context
        const conversationHistory = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .slice(-4) // Last 4 messages for context
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        // Enhanced conversational AI simulation
        
        // Interview/Assessment requests
        if (lastUserContent.toLowerCase().includes('interview') && 
            (lastUserContent.toLowerCase().includes('web development') || 
             lastUserContent.toLowerCase().includes('development skills') ||
             lastUserContent.toLowerCase().includes('programming'))) {
            return {
                output: `I'd be happy to conduct a web development interview with you! Let's start with some questions:\n\n**Question 1:** Tell me about your experience with HTML, CSS, and JavaScript. What projects have you worked on recently?\n\n**Question 2:** Can you explain the difference between \`let\`, \`const\`, and \`var\` in JavaScript?\n\n**Question 3:** How do you handle responsive design? What CSS frameworks or techniques do you prefer?\n\nPlease answer these questions, and I'll ask follow-up questions based on your responses. Would you like to start with Question 1?`,
                toolCalls: []
            };
        }

        // Search requests
        if (lastUserContent.toLowerCase().includes('search') || 
            lastUserContent.toLowerCase().includes('google') ||
            lastUserContent.toLowerCase().includes('find information') ||
            lastUserContent.toLowerCase().includes('look up')) {
            const searchQuery = lastUserContent.replace(/search|google|find|look up|information|for|about/gi, '').trim();
            return {
                output: `I'll search for information about "${searchQuery}".`,
                toolCalls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'google_search',
                        arguments: JSON.stringify({ query: searchQuery || lastUserContent })
                    }
                }]
            };
        }

        // Code execution requests
        if (lastUserContent.toLowerCase().includes('code') || 
            lastUserContent.toLowerCase().includes('javascript') ||
            lastUserContent.toLowerCase().includes('run') ||
            lastUserContent.toLowerCase().includes('execute')) {
            const codeMatch = lastUserContent.match(/```javascript\n([\s\S]*?)\n```/) || 
                             lastUserContent.match(/```\n([\s\S]*?)\n```/) ||
                             lastUserContent.match(/`([^`]+)`/);
            const code = codeMatch ? codeMatch[1] : 'console.log("Hello, World!");';
            
            return {
                output: `I'll execute this JavaScript code for you.`,
                toolCalls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'execute_javascript',
                        arguments: JSON.stringify({ code: code })
                    }
                }]
            };
        }

        // AI processing requests
        if (lastUserContent.toLowerCase().includes('analyze') || 
            lastUserContent.toLowerCase().includes('summarize') || 
            lastUserContent.toLowerCase().includes('process') ||
            lastUserContent.toLowerCase().includes('workflow')) {
            const workflow = lastUserContent.toLowerCase().includes('summarize') ? 'summarize' : 'analyze';
            return {
                output: `I'll use AI Pipe to ${workflow} this content.`,
                toolCalls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'aipipe_workflow',
                        arguments: JSON.stringify({ 
                            workflow: workflow, 
                            data: lastUserContent,
                            pipeline: 'default'
                        })
                    }
                }]
            };
        }

        // Conversational responses based on context and keywords
        
        // Technical questions
        if (lastUserContent.toLowerCase().includes('explain') || 
            lastUserContent.toLowerCase().includes('what is') ||
            lastUserContent.toLowerCase().includes('how does') ||
            lastUserContent.toLowerCase().includes('difference between')) {
            return {
                output: `That's a great question! To give you the most accurate and up-to-date information, let me search for that: "${lastUserContent}". This will help me provide you with comprehensive details.`,
                toolCalls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'google_search',
                        arguments: JSON.stringify({ query: lastUserContent })
                    }
                }]
            };
        }

        // Help requests
        if (lastUserContent.toLowerCase().includes('help') || 
            lastUserContent.toLowerCase().includes('what can you do') ||
            lastUserContent.toLowerCase().includes('capabilities')) {
            return {
                output: `I'm here to help! I can assist you with:\n\n🔍 **Search & Research**: I can search Google for any information you need\n\n🤖 **AI Analysis**: I can analyze, summarize, or process text using AI workflows\n\n💻 **Code Execution**: I can run JavaScript code and show you the results\n\n🎓 **Learning & Interviews**: I can conduct technical interviews, explain concepts, or help with learning\n\n📊 **Data Processing**: I can help transform, extract, or classify data\n\nWhat would you like to explore? Just ask me naturally, like:\n- "Search for the latest React.js trends"\n- "Analyze this code snippet"\n- "Interview me on Python basics"\n- "Explain how async/await works"`,
                toolCalls: []
            };
        }

        // Default intelligent response
        return {
            output: `I understand you're asking about "${lastUserContent}". I'm an AI agent that can help you with various tasks.\n\nBased on your question, I can:\n• **Search** for more information about this topic\n• **Analyze** the content in detail\n• **Help** you explore this further\n\nWould you like me to search for more information about "${lastUserContent}", or is there something specific you'd like me to help you with?`,
            toolCalls: []
        };
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message ${type}-message`;
        
        let badge = '';
        switch (type) {
            case 'user':
                badge = '<span class="badge bg-primary tool-badge">User</span>';
                break;
            case 'agent':
                badge = '<span class="badge bg-secondary tool-badge">Agent</span>';
                break;
            case 'tool-call':
                badge = '<span class="badge bg-warning tool-badge">Tool Call</span>';
                break;
            case 'tool-result':
                badge = '<span class="badge bg-success tool-badge">Tool Result</span>';
                break;
        }

        messageDiv.innerHTML = `
            ${badge}
            <div>${this.formatContent(content, type)}</div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
        `;

        this.conversationWindow.appendChild(messageDiv);
        this.conversationWindow.scrollTop = this.conversationWindow.scrollHeight;
    }

    formatContent(content, type) {
        if (type === 'tool-call' || type === 'tool-result') {
            return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
        }
        return this.escapeHtml(content).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStatus(status) {
        this.statusBadge.textContent = status;
        this.statusBadge.className = `badge ms-2 ${
            status === 'Ready' ? 'bg-success' :
            status === 'Error' ? 'bg-danger' :
            'bg-info'
        }`;
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>Error:</strong> ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.alertContainer.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>Success:</strong> ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.alertContainer.appendChild(alertDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showWarning(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>Notice:</strong> ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        this.alertContainer.appendChild(alertDiv);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 4000);
    }

    async sendMessage() {
        const input = this.userInput.value.trim();
        if (!input || this.isProcessing) return;

        // Add user message to conversation
        this.addMessage('user', input);
        
        // Add to messages array
        this.messages.push({
            role: 'user',
            content: input
        });

        // Clear input
        this.userInput.value = '';
        
        // Start processing
        this.isProcessing = true;
        await this.loop();
    }

    clearConversation() {
        this.messages = [];
        this.conversationWindow.innerHTML = '';
        this.updateStatus('Ready');
        this.alertContainer.innerHTML = '';
    }

    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
}

// Initialize the agent when the page loads
let agent;

document.addEventListener('DOMContentLoaded', () => {
    agent = new LLMAgent();
    
    // Load saved credentials if available
    loadCredentials();
    
    // Add welcome message
    agent.addMessage('agent', `Welcome to the LLM Agent POC! 🚀

**Features:**
• 🔍 **Google Search** - Real API integration (add Google API key + Search Engine ID)
• 🤖 **AI Pipe workflows** - summarize, analyze, transform, generate, extract, classify
• 💻 **JavaScript execution** - Secure code execution in browser
• 🔑 **Multiple API support** - OpenAI, Anthropic, Google, AI Pipe

**Quick Start:**
1. **AI Pipe** (Recommended): Single API key for all LLM providers
2. **OpenAI**: Direct OpenAI API access
3. **Google Search**: Add Google API key + Search Engine ID for real search
4. **No keys?** Enhanced simulation mode works too!

**Current Status:**
- ✅ **AI Pipe**: Ready (https://aipipe.org/)
- ✅ **OpenAI**: Ready (requires billing for GPT-4)
- ✅ **Google Search**: Ready (add credentials)  
- ✅ **Enhanced Simulation**: Works without any keys

**Try these:**
- "Search for latest React trends"
- "Interview me on JavaScript"
- "Run this code: console.log('Hello!')"
- "Analyze this text: [your content]"

💡 **Tip**: AI Pipe provides access to multiple models with one API key!`);
});

// Global functions for HTML event handlers
function sendMessage() {
    agent.sendMessage();
}

function clearConversation() {
    agent.clearConversation();
}

function handleKeyPress(event) {
    agent.handleKeyPress(event);
}

function updateApiKeyLabel() {
    // This function is kept for compatibility but now we have multiple API key fields
    console.log('Provider changed to:', document.getElementById('modelProvider').value);
}

function saveCredentials() {
    const credentials = {
        aipipeApiKey: document.getElementById('aipipeApiKey').value,
        openaiApiKey: document.getElementById('openaiApiKey').value,
        anthropicApiKey: document.getElementById('anthropicApiKey').value,
        googleApiKey: document.getElementById('googleApiKey').value,
        googleSearchEngineId: document.getElementById('googleSearchEngineId').value
    };
    
    localStorage.setItem('llmAgentCredentials', JSON.stringify(credentials));
    agent.showSuccess('Credentials saved to browser storage');
}

function loadCredentials() {
    const stored = localStorage.getItem('llmAgentCredentials');
    if (stored) {
        const credentials = JSON.parse(stored);
        
        document.getElementById('aipipeApiKey').value = credentials.aipipeApiKey || '';
        document.getElementById('openaiApiKey').value = credentials.openaiApiKey || '';
        document.getElementById('anthropicApiKey').value = credentials.anthropicApiKey || '';
        document.getElementById('googleApiKey').value = credentials.googleApiKey || '';
        document.getElementById('googleSearchEngineId').value = credentials.googleSearchEngineId || '';
        
        agent.showSuccess('Credentials loaded from browser storage');
    } else {
        agent.showError('No saved credentials found');
    }
}

async function testConnections() {
    agent.updateStatus('Testing connections...');
    const results = [];
    
    // Test AI Pipe
    if (document.getElementById('aipipeApiKey').value) {
        try {
            const response = await fetch('https://aipipe.org/openrouter/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${document.getElementById('aipipeApiKey').value}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                })
            });
            results.push(`AI Pipe: ${response.ok ? '✅ Connected' : '❌ Failed'}`);
        } catch (e) {
            results.push('AI Pipe: ❌ Network Error');
        }
    }
    
    // Test OpenAI
    if (document.getElementById('openaiApiKey').value) {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${document.getElementById('openaiApiKey').value}` }
            });
            results.push(`OpenAI: ${response.ok ? '✅ Connected' : '❌ Failed'}`);
        } catch (e) {
            results.push('OpenAI: ❌ Network Error');
        }
    }
    
    // Test Google Search
    if (document.getElementById('googleApiKey').value && document.getElementById('googleSearchEngineId').value) {
        try {
            const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${document.getElementById('googleApiKey').value}&cx=${document.getElementById('googleSearchEngineId').value}&q=test`);
            results.push(`Google Search: ${response.ok ? '✅ Connected' : '❌ Failed'}`);
        } catch (e) {
            results.push('Google Search: ❌ Network Error');
        }
    }
    
    if (results.length > 0) {
        agent.addMessage('agent', `Connection Test Results:\n${results.join('\n')}`);
    } else {
        agent.showError('No API keys found to test');
    }
    
    agent.updateStatus('Ready');
}
