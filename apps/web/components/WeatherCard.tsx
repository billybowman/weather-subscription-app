import type { LocationSubscription, GetWeatherResponse } from '@weather-app/shared';

interface WeatherCardProps {
  subscription: LocationSubscription;
  weather?: GetWeatherResponse;
  onDelete: () => void;
}

export function WeatherCard({ subscription, weather, onDelete }: WeatherCardProps) {
  const iconUrl = weather?.current.icon
    ? `https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Location Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-white">{subscription.city}</h3>
            <p className="text-blue-100 text-sm">{subscription.country}</p>
          </div>
          <button
            onClick={onDelete}
            className="text-white hover:text-red-200 transition-colors"
            title="Delete subscription"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Weather Data */}
      {!weather ? (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading weather...</p>
        </div>
      ) : (
        <>
          {/* Current Weather */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {Math.round(weather.current.temperature)}°C
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {weather.current.description}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Feels like {Math.round(weather.current.feelsLike)}°C
                </div>
              </div>
              {iconUrl && (
                <img src={iconUrl} alt={weather.current.description} className="w-20 h-20" />
              )}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Humidity</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {weather.current.humidity}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Wind</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(weather.current.windSpeed)} m/s
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Pressure</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {weather.current.pressure} hPa
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Updated</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(weather.current.fetchedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          {weather.forecast.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                5-Day Forecast
              </h4>
              <div className="space-y-2">
                {weather.forecast.slice(0, 5).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      {index === 0
                        ? 'Today'
                        : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                        alt={day.description}
                        className="w-8 h-8"
                      />
                      <div className="text-gray-900 dark:text-white font-medium min-w-[80px] text-right">
                        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
