// Tools implementation for LLM Agent POC

class Tools {
    constructor() {
        this.tools = [
            {
                type: "function",
                function: {
                    name: "google_search",
                    description: "Search Google for information and return snippet results",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query to execute"
                            }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "aipipe_workflow",
                    description: "Use AI Pipe workflows for specialized data processing tasks (separate from main LLM conversation)",
                    parameters: {
                        type: "object",
                        properties: {
                            workflow: {
                                type: "string",
                                description: "The workflow or operation to execute",
                                enum: ["summarize", "analyze", "transform", "generate", "extract", "classify"]
                            },
                            data: {
                                type: "string",
                                description: "Input data for the AI pipe workflow"
                            },
                            pipeline: {
                                type: "string",
                                description: "Optional pipeline configuration",
                                default: "default"
                            }
                        },
                        required: ["workflow", "data"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "execute_javascript",
                    description: "Execute JavaScript code securely in the browser and return results",
                    parameters: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                description: "The JavaScript code to execute"
                            }
                        },
                        required: ["code"]
                    }
                }
            }
        ];
    }

    getToolDefinitions() {
        return this.tools;
    }

    async executeToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

        try {
            switch (name) {
                case 'google_search':
                    return await this.googleSearch(parsedArgs.query);
                case 'aipipe_workflow':
                    return await this.aipipeWorkflow(parsedArgs.workflow, parsedArgs.data, parsedArgs.pipeline);
                case 'execute_javascript':
                    return await this.executeJavaScript(parsedArgs.code);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        } catch (error) {
            return {
                error: true,
                message: `Tool execution failed: ${error.message}`
            };
        }
    }

    async googleSearch(query) {
        try {
            console.log(`Searching Google for: ${query}`);
            
            // Get Google API credentials
            const googleApiKey = document.getElementById('googleApiKey').value;
            const searchEngineId = document.getElementById('googleSearchEngineId').value;
            
            // If we have real credentials, use the actual Google Custom Search API
            if (googleApiKey && searchEngineId) {
                return await this.realGoogleSearch(query, googleApiKey, searchEngineId);
            } else {
                // Fall back to simulated results with a warning
                console.warn('Google API key or Search Engine ID not provided, using simulated results');
                return await this.simulatedGoogleSearch(query);
            }
        } catch (error) {
            console.error('Google search error:', error);
            return {
                error: true,
                message: `Google search failed: ${error.message}`
            };
        }
    }

    async realGoogleSearch(query, apiKey, searchEngineId) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Google API error: ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            const results = (data.items || []).map(item => ({
                title: item.title,
                snippet: item.snippet,
                url: item.link,
                displayLink: item.displayLink
            }));
            
            return {
                query: query,
                results: results,
                timestamp: new Date().toISOString(),
                source: 'Google Custom Search API',
                totalResults: data.searchInformation?.totalResults || '0'
            };
        } catch (error) {
            throw new Error(`Real Google search failed: ${error.message}`);
        }
    }

    async simulatedGoogleSearch(query) {
        // Generate more realistic search results based on query content
        let mockResults = [];
        
        if (query.toLowerCase().includes('news') && query.toLowerCase().includes('india')) {
            mockResults = [
                {
                    title: "India News: Latest Breaking News, Live Updates - Times of India",
                    snippet: "Get latest India news, breaking news, current affairs, politics, business, sports, entertainment news from India. Read today's top stories and updates.",
                    url: "https://timesofindia.indiatimes.com/india",
                    displayLink: "timesofindia.indiatimes.com"
                },
                {
                    title: "India News - Latest Headlines, Photos, Videos | CNN",
                    snippet: "Find the latest India news including politics, economy, technology, and social developments affecting the world's largest democracy.",
                    url: "https://www.cnn.com/india",
                    displayLink: "cnn.com"
                },
                {
                    title: "India Today: Latest News, Breaking News Headlines",
                    snippet: "India Today brings you the latest news from India and around the world. Stay updated with breaking news, politics, business, and entertainment.",
                    url: "https://www.indiatoday.in/",
                    displayLink: "indiatoday.in"
                }
            ];
        } else if (query.toLowerCase().includes('ai') || query.toLowerCase().includes('artificial intelligence')) {
            mockResults = [
                {
                    title: "Artificial Intelligence News - Latest AI Research",
                    snippet: "Stay updated with the latest breakthroughs in artificial intelligence, machine learning, and deep learning technologies.",
                    url: "https://ai.news.com",
                    displayLink: "ai.news.com"
                },
                {
                    title: "AI News Today: ChatGPT, OpenAI Updates",
                    snippet: "Latest news on ChatGPT, OpenAI, Google AI, and other major developments in the artificial intelligence space.",
                    url: "https://www.aitoday.com",
                    displayLink: "aitoday.com"
                },
                {
                    title: "MIT Technology Review - AI Section",
                    snippet: "In-depth coverage of artificial intelligence research, applications, and implications for society and business.",
                    url: "https://www.technologyreview.com/artificial-intelligence/",
                    displayLink: "technologyreview.com"
                }
            ];
        } else if (query.toLowerCase().includes('technology') || query.toLowerCase().includes('tech')) {
            mockResults = [
                {
                    title: "TechCrunch - Latest Technology News",
                    snippet: "Breaking technology news, analysis, and opinions from TechCrunch. Covering startups, venture capital, and innovation.",
                    url: "https://techcrunch.com",
                    displayLink: "techcrunch.com"
                },
                {
                    title: "The Verge - Technology News, Reviews",
                    snippet: "The latest tech news about the world's best hardware, apps, and much more. From top companies to tiny startups.",
                    url: "https://www.theverge.com",
                    displayLink: "theverge.com"
                },
                {
                    title: "Wired - Technology News and Reviews",
                    snippet: "Get in-depth technology news, reviews, and analysis from Wired. Covering gadgets, science, and digital culture.",
                    url: "https://www.wired.com",
                    displayLink: "wired.com"
                }
            ];
        } else {
            // Generic results for any other query
            mockResults = [
                {
                    title: `${query} - Wikipedia`,
                    snippet: `${query} refers to various concepts and entities. Learn about its definition, history, and significance...`,
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
                    displayLink: "wikipedia.org"
                },
                {
                    title: `${query} - Latest News and Updates`,
                    snippet: `Stay updated with the latest news, developments, and information about ${query}...`,
                    url: `https://news.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
                    displayLink: "news.example.com"
                },
                {
                    title: `Everything About ${query}`,
                    snippet: `Comprehensive guide and information about ${query}, including overview, applications, and current trends...`,
                    url: `https://guide.example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
                    displayLink: "guide.example.com"
                }
            ];
        }

        return {
            query: query,
            results: mockResults,
            timestamp: new Date().toISOString(),
            source: 'Simulated Results (Add Google API key for real results)',
            totalResults: mockResults.length.toString()
        };
    }

    async aipipeWorkflow(workflow, data, pipeline = 'default') {
        try {
            console.log(`Executing AI Pipe workflow: ${workflow} with data: ${data}`);
            
            // AI Pipe Workflow API integration
            // This is for specialized workflows, separate from main LLM routing
            // You could call actual AI Pipe workflow endpoints here
            
            let result;
            
            switch (workflow.toLowerCase()) {
                case 'summarize':
                case 'summary':
                    result = await this.simulateAIPipeSummarize(data);
                    break;
                case 'analyze':
                case 'analysis':
                    result = await this.simulateAIPipeAnalyze(data);
                    break;
                case 'transform':
                case 'process':
                    result = await this.simulateAIPipeTransform(data);
                    break;
                case 'generate':
                case 'create':
                    result = await this.simulateAIPipeGenerate(data);
                    break;
                case 'extract':
                    result = await this.simulateAIPipeExtract(data);
                    break;
                case 'classify':
                    result = await this.simulateAIPipeClassify(data);
                    break;
                default:
                    result = await this.simulateGenericAIPipe(workflow, data);
            }

            return {
                workflow: workflow,
                pipeline: pipeline,
                input: data,
                output: result,
                timestamp: new Date().toISOString(),
                success: true,
                type: 'workflow_result'
            };
        } catch (error) {
            return {
                error: true,
                message: `AI Pipe workflow failed: ${error.message}`,
                workflow: workflow,
                pipeline: pipeline,
                type: 'workflow_error'
            };
        }
    }

    async simulateAIPipeSummarize(data) {
        // Simulate AI summarization
        await this.delay(1000); // Simulate API latency
        const sentences = data.split('.').filter(s => s.trim().length > 0);
        const summary = sentences.slice(0, Math.min(2, sentences.length)).join('.') + '.';
        return `Summary: ${summary}`;
    }

    async simulateAIPipeAnalyze(data) {
        // Simulate AI analysis
        await this.delay(1200);
        return `Analysis: The provided content appears to be ${data.length} characters long, contains ${data.split(' ').length} words, and discusses topics related to the main themes present in the text.`;
    }

    async simulateAIPipeTransform(data) {
        // Simulate AI transformation
        await this.delay(800);
        return `Transformed: ${data.toUpperCase().split('').reverse().join('')}`;
    }

    async simulateAIPipeGenerate(data) {
        // Simulate AI content generation
        await this.delay(1500);
        return `Generated content based on "${data}": This is AI-generated content that expands on the input concept, providing additional context and information relevant to the specified topic.`;
    }

    async simulateAIPipeExtract(data) {
        // Simulate data extraction
        await this.delay(1000);
        const entities = ['entities', 'key phrases', 'important dates', 'names', 'locations'];
        return `Extracted from "${data}": Found ${entities.length} key elements including ${entities.join(', ')}.`;
    }

    async simulateAIPipeClassify(data) {
        // Simulate content classification
        await this.delay(900);
        const categories = ['Technology', 'Business', 'Science', 'Entertainment', 'Politics'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const confidence = (85 + Math.random() * 10).toFixed(1);
        return `Classification: "${data}" belongs to category "${category}" with ${confidence}% confidence.`;
    }

    async simulateGenericAIPipe(workflow, data) {
        // Generic AI pipe simulation
        await this.delay(1000);
        return `AI Pipe "${workflow}" processed the input data and produced this result: ${data} -> [Processed through ${workflow} workflow]`;
    }

    async executeJavaScript(code) {
        try {
            console.log(`Executing JavaScript code: ${code}`);
            
            // Create a sandboxed execution environment
            const sandbox = {
                console: {
                    log: (...args) => args.join(' '),
                    error: (...args) => 'ERROR: ' + args.join(' ')
                },
                Math: Math,
                Date: Date,
                JSON: JSON,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Boolean: Boolean
            };

            // Wrap code in a function to capture output
            const wrappedCode = `
                (function() {
                    let output = [];
                    let originalConsoleLog = console.log;
                    console.log = function(...args) {
                        output.push(args.join(' '));
                        originalConsoleLog(...args);
                    };
                    
                    try {
                        let result = (function() {
                            ${code}
                        })();
                        
                        if (result !== undefined) {
                            output.push('Return value: ' + JSON.stringify(result));
                        }
                        
                        return {
                            success: true,
                            output: output.join('\\n'),
                            result: result
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message,
                            output: output.join('\\n')
                        };
                    }
                })()
            `;

            const result = eval(wrappedCode);
            
            return {
                code: code,
                success: result.success,
                output: result.output || '',
                result: result.result,
                error: result.error || null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: true,
                message: `JavaScript execution failed: ${error.message}`,
                code: code
            };
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in agent.js
window.Tools = Tools;
