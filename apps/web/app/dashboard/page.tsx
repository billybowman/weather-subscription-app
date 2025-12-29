'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { LocationSubscription, GetWeatherResponse } from '@weather-app/shared';
import { AddSubscriptionModal } from '@/components/AddSubscriptionModal';
import { WeatherCard } from '@/components/WeatherCard';

export default function DashboardPage() {
  const { user, loading: authLoading, signOut, getIdToken } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<LocationSubscription[]>([]);
  const [weather, setWeather] = useState<Map<string, GetWeatherResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    }
  }, [user]);

  async function loadSubscriptions() {
    try {
      setError('');
      const token = await getIdToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      const subs = await apiClient.getSubscriptions(token);
      setSubscriptions(subs);

      // Load weather for each subscription
      const weatherPromises = subs.map(async (sub) => {
        try {
          const weatherData = await apiClient.getWeather(sub.id, token);
          return [sub.id, weatherData] as const;
        } catch (err) {
          console.error(`Failed to load weather for ${sub.location}:`, err);
          return null;
        }
      });

      const weatherResults = await Promise.all(weatherPromises);
      const weatherMap = new Map(
        weatherResults.filter((r): r is [string, GetWeatherResponse] => r !== null)
      );
      setWeather(weatherMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSubscription(id: string) {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) return;

      await apiClient.deleteSubscription(id, token);
      setSubscriptions(subs => subs.filter(s => s.id !== id));
      setWeather(w => {
        const newWeather = new Map(w);
        newWeather.delete(id);
        return newWeather;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to delete subscription');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weather Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Locations ({subscriptions.length})
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
          >
            Add Location
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
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
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No locations</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding a location to track weather.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <WeatherCard
                key={sub.id}
                subscription={sub}
                weather={weather.get(sub.id)}
                onDelete={() => handleDeleteSubscription(sub.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddSubscriptionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSubscriptions();
          }}
        />
      )}
    </div>
  );
}
