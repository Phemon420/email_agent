'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { chatApi, tokenUtils } from '@/lib/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StreamingChatProps {
  onEmailGenerated?: (content: string, sessionId?: string) => void;
}

export default function StreamingChat({ onEmailGenerated }: StreamingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const addRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submit button clicked");
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const validRecipients = recipients.filter(r => r.trim());
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient email');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();
      
      const endpoint = sessionId 
        ? '/talk_with_ai_stream_continue' 
        : '/talk_with_ai_stream_start';
      
      const payload = sessionId
        ? { recipient: validRecipients, content: inputValue, session_id: sessionId }
        : { recipient: validRecipients, content: inputValue };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenUtils.get()}`,
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.chunk) {
                fullContent += data.chunk;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
              
              if (data.completed) {
                if (data.session_id) {
                  setSessionId(data.session_id);
                }
                
                if (onEmailGenerated) {
                  onEmailGenerated(data.full_text || fullContent, data.session_id);
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
        return;
      }
      
      console.error('Streaming error:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: `Error: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Recipients Input */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipients:
        </label>
        {recipients.map((recipient, index) => (
          <div key={index} className="flex mb-2">
            <input
              type="email"
              value={recipient}
              onChange={(e) => updateRecipient(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="recipient@example.com"
            />
            {recipients.length > 1 && (
              <button
                type="button"
                onClick={() => removeRecipient(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-r-md hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addRecipient}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Add recipient
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-black py-8">
            <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Start a conversation to generate professional emails with AI assistance.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex max-w-3xl ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  message.type === 'user'
                    ? 'bg-blue-600 ml-3'
                    : 'bg-gray-600 mr-3'
                }`}
              >
                {message.type === 'user' ? (
                  <User className="h-5 w-5 text-white" />
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
              </div>
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-black'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="Describe the email you want to generate..."
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim() || recipients.filter(r => r.trim()).length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}