import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function LoginDetails() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error || !currentUser) {
          navigate('/login');
          return;
        }

        setUser(currentUser);

        // Get session info
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setSessionInfo(session);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-800 font-medium mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Account Details</h1>
          <p className="text-gray-600">View your secure login information</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          {/* User Email Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                ✓
              </span>
              Login Email
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Your registered email</p>
                <p className="text-lg font-mono text-gray-900">{user.email}</p>
              </div>
              <button
                onClick={() => copyToClipboard(user.email || '')}
                className="ml-4 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded font-medium transition"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Account ID Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                ID
              </span>
              Account ID
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Your unique user identifier</p>
                <p className="text-sm font-mono text-gray-900 break-all">{user.id}</p>
              </div>
              <button
                onClick={() => copyToClipboard(user.id || '')}
                className="ml-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium transition"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mr-3">
                ●
              </span>
              Account Status
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-gray-600 text-sm mb-1">Email Verified</p>
                <p className="text-lg font-semibold text-green-700">
                  {user.email_confirmed_at ? '✓ Yes' : '✗ Pending'}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-gray-600 text-sm mb-1">Account Created</p>
                <p className="text-lg font-semibold text-blue-700">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Session Info */}
          {sessionInfo && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                  🔐
                </span>
                Session Information
              </h2>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Session Expires</p>
                    <p className="text-sm font-mono text-gray-900">
                      {sessionInfo.expires_at
                        ? new Date(sessionInfo.expires_at * 1000).toLocaleString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Provider</p>
                    <p className="text-sm font-mono text-gray-900">
                      {sessionInfo.user?.app_metadata?.provider || 'Email/Password'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional User Info */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center mr-3 text-sm">
                ℹ
              </span>
              Additional Information
            </h2>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-600">Phone:</span>{' '}
                  <span className="font-mono text-gray-900">{user.phone || 'Not set'}</span>
                </p>
                <p>
                  <span className="text-gray-600">Last Sign In:</span>{' '}
                  <span className="font-mono text-gray-900">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <p className="text-red-700 text-sm">
              <strong>🔒 Security Notice:</strong> This page contains sensitive account information.
              Never share this information with others. Always log out when using shared devices.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
