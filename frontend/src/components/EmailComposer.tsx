'use client';

import { useState } from 'react';
import { Send, Copy, Edit3, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { any } from 'zod';

interface EmailComposerProps {
  initialContent?: string;
  recipients?: string[];
  sessionId?: string;
}



export default function EmailComposer({ 
  initialContent = '', 
  recipients = [''],
  sessionId 
}: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(initialContent);
  const [recipientList, setRecipientList] = useState<string[]>(recipients);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const addRecipient = () => {
    setRecipientList([...recipientList, '']);
  };

  const removeRecipient = (index: number) => {
    setRecipientList(recipientList.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    const newRecipients = [...recipientList];
    newRecipients[index] = value;
    setRecipientList(newRecipients);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleSend = async () => {
    const validRecipients = recipientList.filter(r => r.trim());
    
    if (!subject.trim() || !body.trim() || validRecipients.length === 0) {
      alert('Please fill in all fields and add at least one recipient');
      return;
    }

    setIsSending(true);
    setSendStatus('idle');

    try {
      // Send emails to all recipients
      const sendPromises = validRecipients.map(recipient => 
        (authApi as any).sendEmail({
          recipient: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
        })
      );

      const results = await Promise.all(sendPromises);
      
      // Check if all emails were sent successfully
      const allSuccessful = results.every(result => result.data?.success);
      
      if (allSuccessful) {
        setSendStatus('success');
        // Optional: Clear form after successful send
        // setSubject('');
        // setBody('');
        // setRecipientList(['']);
      } else {
        setSendStatus('error');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setSendStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Edit3 className="mr-2 h-6 w-6" />
        Email Composer
      </h2>

      {/* Recipients */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To:
        </label>
        {recipientList.map((recipient, index) => (
          <div key={index} className="flex mb-2">
            <input
              type="email"
              value={recipient}
              onChange={(e) => updateRecipient(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="recipient@example.com"
            />
            {recipientList.length > 1 && (
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

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject:
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          placeholder="Enter email subject..."
        />
      </div>

      {/* Body */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Message:
          </label>
          <button
            onClick={handleCopy}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y text-black"
          placeholder="Enter your email message..."
        />
      </div>

      {/* Send Status */}
      {sendStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Email(s) sent successfully!
        </div>
      )}
      
      {sendStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Failed to send email(s). Please try again.
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            setSubject('');
            setBody('');
            setRecipientList(['']);
            setSendStatus('idle');
          }}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={isSending}
        >
          Clear
        </button>
        
        <button
          onClick={handleSend}
          disabled={isSending || !subject.trim() || !body.trim() || recipientList.filter(r => r.trim()).length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>{isSending ? 'Sending...' : 'Send Email'}</span>
        </button>
      </div>
    </div>
  );
}