'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { ApiToken, CreateTokenRequest } from '@weather-app/shared';

export default function TokensPage() {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const router = useRouter();
  const [tokens, setTokens] = useState<Omit<ApiToken, 'tokenHash'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadTokens();
    }
  }, [user]);

  async function loadTokens() {
    try {
      setError('');
      const idToken = await getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const tokensList = await apiClient.listTokens(idToken);
      setTokens(tokensList);
    } catch (err: any) {
      setError(err.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateToken(data: CreateTokenRequest) {
    try {
      const idToken = await getIdToken();
      if (!idToken) return;

      const response = await apiClient.createToken(data, idToken);
      setNewToken(response.token);
      setTokens([response.tokenInfo, ...tokens]);
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create token');
    }
  }

  async function handleRevokeToken(tokenId: string) {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      const idToken = await getIdToken();
      if (!idToken) return;

      await apiClient.revokeToken(tokenId, idToken);
      setTokens(tokens.filter(t => t.id !== tokenId));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke token');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Token copied to clipboard!');
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Tokens</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Token Display */}
        {newToken && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              Token Created Successfully!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Make sure to copy your token now. You won't be able to see it again!
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-2 rounded border border-green-300 dark:border-green-700 font-mono text-sm overflow-x-auto">
                {newToken}
              </code>
              <button
                onClick={() => copyToClipboard(newToken)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setNewToken(null)}
              className="mt-4 text-sm text-green-700 dark:text-green-300 hover:underline"
            >
              I've saved my token
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your API Tokens ({tokens.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Use these tokens to authenticate API requests programmatically
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Generate New Token
          </button>
        </div>

        {/* Tokens List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {tokens.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tokens</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating an API token.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {token.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                        {token.prefix}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(token.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {token.expiresAt
                        ? new Date(token.expiresAt * 1000).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {token.revoked ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!token.revoked && (
                        <button
                          onClick={() => handleRevokeToken(token.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create Token Modal */}
      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateToken}
        />
      )}
    </div>
  );
}

function CreateTokenModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateTokenRequest) => void;
}) {
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(90);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({ name, expiresInDays });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Generate New API Token
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production API"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A descriptive name to help you identify this token
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiration
            </label>
            <select
              value={expiresInDays || 'never'}
              onChange={(e) =>
                setExpiresInDays(e.target.value === 'never' ? undefined : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
              <option value="never">Never</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tokens can expire up to 365 days from creation
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Generate Token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
