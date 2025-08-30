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

        if (!apiKey) {
            throw new Error(`${provider.toUpperCase()} API key is required`);
        }

        // Prepare the request based on provider
        let apiUrl, headers, body;

        switch (provider) {
            case 'aipipe':
                // Route ALL LLM calls through AI Pipe proxy
                apiUrl = 'https://api.aipipe.org/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Model-Provider': this.getProviderFromModel(model),
                    'X-Model-Name': model
                };
                body = {
                    model: model,
                    messages: messages,
                    tools: tools,
                    tool_choice: 'auto'
                };
                break;
            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                body = {
                    model: model,
                    messages: messages,
                    tools: tools,
                    tool_choice: 'auto'
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
                // Use Google Gemini API
                apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                headers = {
                    'Content-Type': 'application/json'
                };
                // Convert messages format for Google
                const contents = messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));
                body = {
                    contents: contents,
                    tools: tools.length > 0 ? [{ function_declarations: tools.map(t => t.function) }] : undefined
                };
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            // Handle different response formats
            let output, toolCalls;
            switch (provider) {
                case 'anthropic':
                    output = data.content?.[0]?.text || '';
                    toolCalls = data.tool_calls || [];
                    break;
                case 'google':
                    output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    toolCalls = data.candidates?.[0]?.content?.parts?.filter(p => p.functionCall) || [];
                    break;
                default: // OpenAI format (also used by AI Pipe)
                    const choice = data.choices[0];
                    output = choice.message.content;
                    toolCalls = choice.message.tool_calls || [];
            }
            
            return { output, toolCalls };
        } catch (error) {
            // Fallback to simulation if API call fails
            console.warn(`${provider} API call failed, falling back to simulation:`, error.message);
            return this.simulateLLMCall(messages, tools);
        }
    }

    getProviderFromModel(model) {
        if (model.includes('gpt')) return 'openai';
        if (model.includes('claude')) return 'anthropic';
        if (model.includes('gemini')) return 'google';
        return 'openai'; // default
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

        // Simple rule-based simulation for user messages
        if (lastUserContent.toLowerCase().includes('search') || lastUserContent.toLowerCase().includes('google')) {
            const searchQuery = lastUserContent.replace(/google|search|find|for|about/gi, '').trim();
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

        if (lastUserContent.toLowerCase().includes('code') || lastUserContent.toLowerCase().includes('javascript')) {
            const codeMatch = lastUserContent.match(/```javascript\n([\s\S]*?)\n```/) || lastUserContent.match(/`([^`]+)`/);
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

        if (lastUserContent.toLowerCase().includes('analyze') || lastUserContent.toLowerCase().includes('summarize') || lastUserContent.toLowerCase().includes('process')) {
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

        // Default response
        return {
            output: `I understand you're asking about: "${lastUserContent}". I can help you with:\n• 🔍 **Search**: Ask me to search for anything\n• 🤖 **AI Processing**: Ask me to analyze, summarize, or process text\n• 💻 **Code**: Ask me to run JavaScript code\n\nWhat would you like to do?`,
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
• 🔍 **Google Search** - Real API integration (requires Google API key + Search Engine ID)
• 🤖 **AI Pipe workflows** - summarize, analyze, transform, generate, extract, classify
• 💻 **JavaScript execution** - Secure code execution in browser
• 🔑 **Multiple API support** - OpenAI, Anthropic, Google, AI Pipe

**Setup:**
1. Enter your API keys above (save/load them for convenience)
2. Choose your preferred LLM provider
3. Start chatting!

**Try these commands:**
- "Search for latest AI news"
- "Analyze this text: [your content]"
- "Run this code: console.log('Hello!')"

For **real Google search results**, you need:
- Google API key from Google Cloud Console
- Custom Search Engine ID from Google Custom Search

Without these, you'll get simulated search results.`);
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
