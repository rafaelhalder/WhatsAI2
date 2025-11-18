/**
 * OpenAI Service
 * Service for integrating OpenAI GPT models for AI chatbot functionality
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class OpenAIService {
  private isConfigured: boolean;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor() {
    this.isConfigured = !!openai;
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.defaultMaxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);
    this.defaultTemperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

    if (!this.isConfigured) {
      console.warn('⚠️ OpenAI API key not configured. AI chatbot features will be disabled.');
    }
  }

  /**
   * Check if OpenAI is configured and ready to use
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a chat completion from OpenAI
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    if (!this.isConfigured || !openai) {
      throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    try {
      const response = await openai.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: messages,
        max_tokens: options.maxTokens || this.defaultMaxTokens,
        temperature: options.temperature ?? this.defaultTemperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response generated from OpenAI');
      }

      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error generating chat completion:', error);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  /**
   * Generate a simple response to a user message
   * Useful for chatbot auto-responses
   */
  async generateResponse(
    userMessage: string,
    systemPrompt?: string,
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    } else {
      // Default system prompt for WhatsApp chatbot
      messages.push({
        role: 'system',
        content: 'You are a helpful AI assistant for a WhatsApp business. Respond professionally, concisely, and helpfully to customer messages. Keep responses brief and conversational.',
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return this.generateChatCompletion(messages, options);
  }

  /**
   * Generate a response with conversation context
   * Useful for maintaining conversation history
   */
  async generateContextualResponse(
    conversationHistory: ChatMessage[],
    systemPrompt?: string,
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    // Add system prompt
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation history
    messages.push(...conversationHistory);

    return this.generateChatCompletion(messages, options);
  }

  /**
   * Generate a smart auto-response based on keywords and context
   * This can be used to enhance the existing auto-response system
   */
  async generateSmartAutoResponse(
    userMessage: string,
    keyword: string,
    baseResponse: string
  ): Promise<string> {
    if (!this.isConfigured) {
      // Fallback to base response if OpenAI is not configured
      return baseResponse;
    }

    try {
      // Sanitize inputs to prevent prompt injection
      const sanitizedKeyword = keyword.replace(/['"]/g, '').substring(0, 100);
      const sanitizedBaseResponse = baseResponse.substring(0, 500);
      
      const systemPrompt = `You are helping to generate a personalized auto-response for a WhatsApp business.
The user mentioned: "${sanitizedKeyword}"
The business has configured this base response: "${sanitizedBaseResponse}"

Your task is to enhance this response by:
1. Keeping the core message from the base response
2. Making it more natural and conversational
3. Personalizing it based on the user's message
4. Keeping it concise (max 2-3 sentences)

Do not add greetings or signatures unless they are in the base response.`;

      return await this.generateResponse(userMessage, systemPrompt, {
        maxTokens: 150,
        temperature: 0.7,
      });
    } catch (error) {
      console.error('Error generating smart auto-response, falling back to base response:', error);
      return baseResponse;
    }
  }

  /**
   * Analyze user sentiment from message
   * Useful for routing or prioritizing messages
   */
  async analyzeSentiment(message: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!this.isConfigured) {
      return 'neutral';
    }

    try {
      const systemPrompt = 'Analyze the sentiment of the following message and respond with only one word: "positive", "neutral", or "negative".';
      const response = await this.generateResponse(message, systemPrompt, {
        maxTokens: 10,
        temperature: 0.3,
      });

      const sentiment = response.trim().toLowerCase();
      if (sentiment.includes('positive')) return 'positive';
      if (sentiment.includes('negative')) return 'negative';
      return 'neutral';
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 'neutral';
    }
  }

  /**
   * Extract key information from a message
   * Useful for CRM integration or data collection
   */
  async extractInformation(
    message: string,
    infoType: 'email' | 'phone' | 'name' | 'all'
  ): Promise<string | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const systemPrompt = `Extract ${infoType === 'all' ? 'email, phone number, and name' : infoType} from the following message. 
If found, respond with just the extracted information. 
If not found, respond with "NOT_FOUND".`;

      const response = await this.generateResponse(message, systemPrompt, {
        maxTokens: 50,
        temperature: 0.1,
      });

      if (response.trim() === 'NOT_FOUND') {
        return null;
      }

      return response.trim();
    } catch (error) {
      console.error('Error extracting information:', error);
      return null;
    }
  }

  /**
   * Generate smart reply suggestions based on incoming message
   * Returns 3 contextual quick reply options
   */
  async generateSmartReplies(
    incomingMessage: string,
    conversationHistory?: ChatMessage[]
  ): Promise<string[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const systemPrompt = `You are a helpful assistant that generates quick reply suggestions for WhatsApp business conversations.
Based on the incoming message and context, suggest 3 short, appropriate replies (max 10 words each).
Format: Return only 3 replies, one per line, without numbering or bullets.
Keep replies professional, helpful, and in Portuguese (Brazilian) if the message is in Portuguese.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history if provided (last 5 messages for context)
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-5));
      }

      // Add the incoming message
      messages.push({
        role: 'user',
        content: `Generate 3 quick replies for: "${incomingMessage}"`,
      });

      const response = await this.generateChatCompletion(messages, {
        maxTokens: 100,
        temperature: 0.8,
      });

      // Split by newlines and filter out empty lines
      const replies = response
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0)
        .slice(0, 3);

      return replies;
    } catch (error) {
      console.error('Error generating smart replies:', error);
      return [];
    }
  }

  /**
   * Adjust message tone to different styles
   * Helps users communicate more effectively
   */
  async adjustMessageTone(
    originalMessage: string,
    targetTone: 'professional' | 'friendly' | 'formal' | 'casual' | 'concise'
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('OpenAI is not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    const toneDescriptions = {
      professional: 'professional, clear, and business-appropriate',
      friendly: 'warm, friendly, and approachable',
      formal: 'formal, respectful, and polite',
      casual: 'casual, relaxed, and conversational',
      concise: 'brief, concise, and to-the-point',
    };

    try {
      const systemPrompt = `Rewrite the following message to sound ${toneDescriptions[targetTone]}.
Keep the core meaning intact. Respond with only the rewritten message, nothing else.
Maintain the original language (Portuguese or English).`;

      return await this.generateResponse(originalMessage, systemPrompt, {
        maxTokens: 150,
        temperature: 0.7,
      });
    } catch (error) {
      console.error('Error adjusting message tone:', error);
      throw new Error('Failed to adjust message tone');
    }
  }

  /**
   * Check grammar and spelling in a message
   * Returns corrected text and list of errors found
   */
  async checkGrammarAndSpelling(text: string): Promise<{
    hasErrors: boolean;
    correctedText: string;
    errors: Array<{
      original: string;
      correction: string;
      type: 'spelling' | 'grammar' | 'punctuation';
      explanation: string;
    }>;
  }> {
    if (!this.isConfigured || text.length < 3) {
      return { hasErrors: false, correctedText: text, errors: [] };
    }

    try {
      const systemPrompt = `You are a Portuguese (Brazilian) grammar and spelling checker.
Analyze the text for errors and respond in JSON format:
{
  "hasErrors": boolean,
  "correctedText": "fully corrected text",
  "errors": [
    {
      "original": "wrong word or phrase",
      "correction": "correct word or phrase",
      "type": "spelling|grammar|punctuation",
      "explanation": "brief explanation in Portuguese"
    }
  ]
}
If no errors, return hasErrors: false and empty errors array.
Be strict but reasonable - only flag actual errors.`;

      const response = await this.generateResponse(text, systemPrompt, {
        maxTokens: 300,
        temperature: 0.3, // Lower temperature for more consistent corrections
      });

      // Try to parse JSON response
      try {
        const result = JSON.parse(response);
        return {
          hasErrors: result.hasErrors || false,
          correctedText: result.correctedText || text,
          errors: result.errors || [],
        };
      } catch (parseError) {
        // If JSON parsing fails, return no errors
        console.error('Failed to parse grammar check response:', parseError);
        return { hasErrors: false, correctedText: text, errors: [] };
      }
    } catch (error) {
      console.error('Error checking grammar and spelling:', error);
      return { hasErrors: false, correctedText: text, errors: [] };
    }
  }
}

export const openAIService = new OpenAIService();
