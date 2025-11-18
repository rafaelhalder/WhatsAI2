/**
 * AI Features Service
 * Client-side service for interacting with AI-powered features
 */

import { api } from './api';

export interface SmartReply {
  replies: string[];
  count: number;
}

export interface ToneAdjustment {
  original: string;
  adjusted: string;
  tone: string;
}

export interface GrammarError {
  original: string;
  correction: string;
  type: 'spelling' | 'grammar' | 'punctuation';
  explanation: string;
}

export interface GrammarCheckResult {
  hasErrors: boolean;
  correctedText: string;
  errors: GrammarError[];
}

export interface AIFeaturesStatus {
  available: boolean;
  features: {
    smartReplies: boolean;
    toneAdjuster: boolean;
    grammarCheck: boolean;
  };
}

class AIFeaturesService {
  /**
   * Generate smart reply suggestions for an incoming message
   */
  async generateSmartReplies(
    incomingMessage: string,
    conversationHistory?: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>,
    token?: string
  ): Promise<SmartReply> {
    const response = await api.post(
      '/ai-features/smart-replies',
      {
        incomingMessage,
        conversationHistory,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  }

  /**
   * Adjust message tone
   */
  async adjustTone(
    message: string,
    tone: 'professional' | 'friendly' | 'formal' | 'casual' | 'concise',
    token?: string
  ): Promise<ToneAdjustment> {
    const response = await api.post(
      '/ai-features/adjust-tone',
      {
        message,
        tone,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  }

  /**
   * Check grammar and spelling
   */
  async checkGrammar(
    text: string,
    token?: string
  ): Promise<GrammarCheckResult> {
    const response = await api.post(
      '/ai-features/check-grammar',
      {
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  }

  /**
   * Check AI features status
   */
  async getStatus(token?: string): Promise<AIFeaturesStatus> {
    const response = await api.get('/ai-features/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  }
}

export const aiFeaturesService = new AIFeaturesService();
