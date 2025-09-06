'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Mail, MessageSquare, User } from 'lucide-react';
import StreamingChat from '@/components/StreamingChat';
import EmailComposer from '@/components/EmailComposer';
import { tokenUtils } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'chat' | 'compose'>('chat');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [emailRecipients, setEmailRecipients] = useState<string[]>(['']);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for token in URL parameters first
    const tokenFromUrl = searchParams.get('token');
    
    if (tokenFromUrl) {
      // Store token and clean up URL
      tokenUtils.set(tokenFromUrl);
      // Remove token from URL without redirect
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('token');
      newUrl.searchParams.delete('email');
      newUrl.searchParams.delete('name');
      window.history.replaceState({}, '', newUrl.pathname);
      return; // Skip redirect check since we just got a token
    }
    
    // Check if user is authenticated
    if (!tokenUtils.isValid()) {
      router.push('/login');
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    tokenUtils.remove();
    router.push('/login');
  };

  const handleEmailGenerated = (content: string, sessionId?: string) => {
    setGeneratedEmail(content);
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
    // Auto-switch to compose tab when email is generated
    setActiveTab('compose');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">AI Email Assistant</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-600">
                <User className="h-5 w-5 mr-2" />
                <span>Welcome!</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 w-fit">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center px-4 py-2 rounded-md transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Chat
          </button>
          
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex items-center px-4 py-2 rounded-md transition-all ${
              activeTab === 'compose'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4 mr-2" />
            Compose & Send
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {activeTab === 'chat' && (
            <>
              {/* Chat Section - Takes full width on mobile, 2 columns on large screens */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-lg h-[600px]">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Generate Email with AI
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Describe what kind of email you want to create and the AI will help you generate it.
                    </p>
                  </div>
                  <div className="h-[calc(600px-80px)]">
                    <StreamingChat onEmailGenerated={handleEmailGenerated} />
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-lg p-6 h-[600px]">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Generated Email Preview
                  </h3>
                  
                  {generatedEmail ? (
                    <div>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-[400px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700">
                          {generatedEmail}
                        </pre>
                      </div>
                      
                      <button
                        onClick={() => setActiveTab('compose')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit & Send Email
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>Generated emails will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'compose' && (
            <div className="lg:col-span-3">
              <EmailComposer 
                initialContent={generatedEmail}
                recipients={emailRecipients}
                sessionId={currentSessionId || undefined}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to use AI Email Assistant:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">1. Generate with AI</h4>
              <p>Use the AI Chat tab to describe the email you want. The AI will generate professional content for you.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Edit & Send</h4>
              <p>Review and edit the generated email in the Compose tab, then send it to your recipients.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Continue Conversations</h4>
              <p>Ask for refinements or changes to improve the generated email until it's perfect.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Multiple Recipients</h4>
              <p>Add multiple email addresses to send the same email to several people at once.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}