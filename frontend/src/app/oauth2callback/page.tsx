'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokenUtils } from '@/lib/api';

export default function OAuth2CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract the authorization code from the URL
        const code = searchParams.get('code');
        
        if (!code) {
          console.error('No authorization code found');
          router.push('/login?error=no_code');
          return;
        }

        // Make a request to your backend's OAuth callback endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/oauth2callback?code=${code}`);
        const data = await response.json();
        console.log(data);
        if (data.status === 1 && data.token) {
          // Store the token and redirect to dashboard
          tokenUtils.set(data.token);
          router.push('/dashboard');
        } else {
          console.error('OAuth callback failed:', data);
          router.push('/login?error=auth_failed');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        router.push('/login?error=callback_error');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}