/**
 * ==============================================================================
 * Real-Time Weather Dashboard - Vanilla JavaScript
 * ==============================================================================
 * Fetches live weather information using the public Open-Meteo REST API.
 * Demonstrates async/await, fetch(), JSON parsing, error handling, and
 * dynamic DOM manipulation without any external frameworks.
 */

// ==============================================================================
// 1. STATE & CONSTANTS
// ==============================================================================

/**
 * Current user preferences and weather cache
 */
const state = {
  currentUnit: 'celsius', // 'celsius' or 'fahrenheit'
  lastWeatherData: null,  // Cached raw response from Open-Meteo
  lastLocation: null,     // Cached city/location metadata { name, country, admin1 }
  theme: 'dark'           // 'dark' or 'light'
};

/**
 * WMO Weather Interpretation Codes (WW)
 * Standardized meteorological codes used by weather organizations worldwide.
 * Maps code to label, daytime icon, nighttime icon, and category.
 */
const WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: 'sun', nightIcon: 'moon' },
  1: { label: 'Mainly Clear', icon: 'sun-cloud', nightIcon: 'moon-cloud' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun', nightIcon: 'cloud-moon' },
  3: { label: 'Overcast', icon: 'cloud', nightIcon: 'cloud' },
  45: { label: 'Foggy', icon: 'fog', nightIcon: 'fog' },
  48: { label: 'Depositing Rime Fog', icon: 'fog', nightIcon: 'fog' },
  51: { label: 'Light Drizzle', icon: 'drizzle', nightIcon: 'drizzle' },
  53: { label: 'Moderate Drizzle', icon: 'drizzle', nightIcon: 'drizzle' },
  55: { label: 'Dense Drizzle', icon: 'drizzle', nightIcon: 'drizzle' },
  56: { label: 'Light Freezing Drizzle', icon: 'snow', nightIcon: 'snow' },
  57: { label: 'Dense Freezing Drizzle', icon: 'snow', nightIcon: 'snow' },
  61: { label: 'Slight Rain', icon: 'rain', nightIcon: 'rain' },
  63: { label: 'Moderate Rain', icon: 'rain', nightIcon: 'rain' },
  65: { label: 'Heavy Rain', icon: 'heavy-rain', nightIcon: 'heavy-rain' },
  66: { label: 'Light Freezing Rain', icon: 'snow', nightIcon: 'snow' },
  67: { label: 'Heavy Freezing Rain', icon: 'snow', nightIcon: 'snow' },
  71: { label: 'Slight Snow', icon: 'snow', nightIcon: 'snow' },
  73: { label: 'Moderate Snow', icon: 'snow', nightIcon: 'snow' },
  75: { label: 'Heavy Snow', icon: 'snow', nightIcon: 'snow' },
  77: { label: 'Snow Grains', icon: 'snow', nightIcon: 'snow' },
  80: { label: 'Slight Rain Showers', icon: 'rain', nightIcon: 'rain' },
  81: { label: 'Moderate Rain Showers', icon: 'rain', nightIcon: 'rain' },
  82: { label: 'Violent Rain Showers', icon: 'heavy-rain', nightIcon: 'heavy-rain' },
  85: { label: 'Slight Snow Showers', icon: 'snow', nightIcon: 'snow' },
  86: { label: 'Heavy Snow Showers', icon: 'snow', nightIcon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm', nightIcon: 'thunderstorm' },
  96: { label: 'Thunderstorm with Slight Hail', icon: 'thunderstorm', nightIcon: 'thunderstorm' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm', nightIcon: 'thunderstorm' }
};

// ==============================================================================
// 2. DOM ELEMENT SELECTORS
// ==============================================================================
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locateBtn = document.getElementById('locate-btn');
const quickPills = document.querySelectorAll('.city-pill');

// Units & Theme
const unitCelsiusBtn = document.getElementById('unit-celsius');
const unitFahrenheitBtn = document.getElementById('unit-fahrenheit');
const themeToggleBtn = document.getElementById('theme-toggle');

// Feedback states
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorTitle = document.getElementById('error-title');
const errorDesc = document.getElementById('error-desc');
const retryBtn = document.getElementById('retry-btn');
const dashboardGrid = document.getElementById('dashboard-grid');

// Weather Hero Elements
const locationNameEl = document.getElementById('location-name');
const locationCountryEl = document.getElementById('location-country');
const locationDateTimeEl = document.getElementById('location-datetime');
const conditionBadgeEl = document.getElementById('condition-badge');
const mainTempEl = document.getElementById('main-temp');
const tempUnitEl = document.getElementById('temp-unit');
const weatherConditionTextEl = document.getElementById('weather-condition-text');
const weatherVisualIconEl = document.getElementById('weather-visual-icon');
const heroHighLowEl = document.getElementById('hero-high-low');
const heroPrecipitationEl = document.getElementById('hero-precipitation');

// Metric Elements
const metricFeelsLikeEl = document.getElementById('metric-feels-like');
const metricFeelsLikeDescEl = document.getElementById('metric-feels-like-desc');
const metricHumidityEl = document.getElementById('metric-humidity');
const metricHumidityBarEl = document.getElementById('metric-humidity-bar');
const metricHumidityDescEl = document.getElementById('metric-humidity-desc');
const metricWindSpeedEl = document.getElementById('metric-wind-speed');
const metricWindDescEl = document.getElementById('metric-wind-desc');
const metricUvIndexEl = document.getElementById('metric-uv-index');
const metricUvDescEl = document.getElementById('metric-uv-desc');
const metricPressureEl = document.getElementById('metric-pressure');
const metricSunTimesEl = document.getElementById('metric-sun-times');

// Forecast Tracks
const hourlyTrackEl = document.getElementById('hourly-track');
const dailyListEl = document.getElementById('daily-list');
const lastUpdatedTimeEl = document.getElementById('last-updated-time');

// ==============================================================================
// 3. SVG WEATHER ICONS HELPER
// ==============================================================================
/**
 * Generates crisp SVG icons for each weather state.
 * @param {string} iconName - The key identifying the weather icon
 * @returns {string} Inline SVG string
 */
function getWeatherSvgIcon(iconName) {
  switch (iconName) {
    case 'sun':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path>
          <path d="m17.66 17.66 1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="m6.34 17.66-1.41 1.41"></path>
          <path d="m19.07 4.93-1.41 1.41"></path>
        </svg>`;
    case 'moon':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>`;
    case 'cloud':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
        </svg>`;
    case 'sun-cloud':
    case 'cloud-sun':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v2"></path>
          <path d="m4.93 4.93 1.41 1.41"></path>
          <path d="M20 12h2"></path>
          <path d="m19.07 4.93-1.41 1.41"></path>
          <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" stroke="#f59e0b"></path>
          <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" stroke="#94a3b8"></path>
        </svg>`;
    case 'cloud-moon':
    case 'moon-cloud':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#94a3b8"></path>
        </svg>`;
    case 'rain':
    case 'drizzle':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#94a3b8"></path>
          <path d="M8 19v2"></path>
          <path d="M12 19v2"></path>
          <path d="M16 19v2"></path>
        </svg>`;
    case 'heavy-rain':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#64748b"></path>
          <path d="m8 18-2 4"></path>
          <path d="m12 18-2 4"></path>
          <path d="m16 18-2 4"></path>
        </svg>`;
    case 'snow':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#e0e7ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#94a3b8"></path>
          <path d="m8 19 1 1-1 1"></path>
          <path d="m12 19 1 1-1 1"></path>
          <path d="m16 19 1 1-1 1"></path>
        </svg>`;
    case 'thunderstorm':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 16H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="#64748b"></path>
          <path d="m13 13-3 5h4l-2 5"></path>
        </svg>`;
    case 'fog':
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 9h14"></path>
          <path d="M3 13h18"></path>
          <path d="M5 17h14"></path>
          <path d="M7 21h10"></path>
        </svg>`;
    default:
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>`;
  }
}

// ==============================================================================
// 4. UNIT CONVERSION & FORMATTING HELPERS
// ==============================================================================

/**
 * Converts Celsius to Fahrenheit
 * @param {number} celsius - Temperature in °C
 * @returns {number} Temperature in °F
 */
function convertCelsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

/**
 * Formats a temperature according to the currently active unit (°C or °F)
 * @param {number} tempC - Base temperature in Celsius
 * @returns {string} Formatted number with rounded integer
 */
function formatTemperature(tempC) {
  if (tempC === null || tempC === undefined || isNaN(tempC)) return '--';
  if (state.currentUnit === 'fahrenheit') {
    return Math.round(convertCelsiusToFahrenheit(tempC)).toString();
  }
  return Math.round(tempC).toString();
}

/**
 * Formats wind speed based on active unit (km/h vs mph)
 * @param {number} kmh - Speed in km/h
 * @returns {string} Formatted string with unit
 */
function formatWindSpeed(kmh) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) return '--';
  if (state.currentUnit === 'fahrenheit') {
    const mph = (kmh * 0.621371).toFixed(1);
    return `${mph} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Translates wind direction degree (0-360) into compass direction (e.g., N, NE, E)
 * @param {number} degrees
 * @returns {string} Compass direction
 */
function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5);
  return directions[index % 16];
}

/**
 * Categorizes UV index levels according to WHO guidelines
 * @param {number} uv - UV index value
 * @returns {{ label: string, color: string }}
 */
function getUvRisk(uv) {
  if (uv <= 2) return { label: 'Low', color: 'var(--accent-emerald)' };
  if (uv <= 5) return { label: 'Moderate', color: 'var(--accent-amber)' };
  if (uv <= 7) return { label: 'High', color: '#f97316' };
  if (uv <= 10) return { label: 'Very High', color: 'var(--accent-rose)' };
  return { label: 'Extreme', color: 'var(--accent-purple)' };
}

/**
 * Returns human-readable day name (e.g., 'Today', 'Mon', 'Tuesday')
 * @param {string} dateString - ISO date YYYY-MM-DD
 * @param {number} index - Forecast day index (0 = today)
 * @returns {string}
 */
function formatDayName(dateString, index) {
  if (index === 0) return 'Today';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

/**
 * Returns formatted calendar date (e.g., "Sep 15")
 * @param {string} dateString - ISO date YYYY-MM-DD
 * @returns {string}
 */
function formatShortDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Formats ISO timestamp or local time string to 12-hour time (e.g., "6:38 AM")
 * Handles city local timezone strings directly without browser timezone drift
 * @param {string} isoString - e.g. "2026-09-14T06:38"
 * @returns {string}
 */
function formatTime(isoString) {
  if (!isoString) return '--:--';
  const timePart = isoString.split('T')[1];
  if (timePart) {
    const [hours, minutes] = timePart.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = (minutes || 0).toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Formats hour timestamp to short 12-hour label (e.g., "2 PM")
 * @param {string} isoString - e.g. "2026-09-14T14:00"
 * @returns {string}
 */
function formatHourLabel(isoString) {
  if (!isoString) return '';
  const timePart = isoString.split('T')[1];
  if (timePart) {
    const hours = parseInt(timePart.split(':')[0], 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours} ${ampm}`;
  }
  return '';
}

// ==============================================================================
// 5. PUBLIC REST API CLIENT (Open-Meteo Geocoding & Weather)
// ==============================================================================

/**
 * Step 1: Geocode city name to coordinates (latitude & longitude)
 * REST Endpoint: https://geocoding-api.open-meteo.com/v1/search
 * @param {string} cityName - The user-input city query
 * @returns {Promise<Object>} Object containing latitude, longitude, name, country, etc.
 */
async function fetchCityCoordinates(cityName) {
  const cleanQuery = encodeURIComponent(cityName.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cleanQuery}&count=1&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding server error (Status: ${response.status})`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    const error = new Error(`City "${cityName}" not found.`);
    error.name = 'CityNotFoundError';
    throw error;
  }

  const topResult = data.results[0];
  return {
    name: topResult.name,
    latitude: topResult.latitude,
    longitude: topResult.longitude,
    country: topResult.country || '',
    countryCode: topResult.country_code || '',
    admin1: topResult.admin1 || '',
    timezone: topResult.timezone || 'auto'
  };
}

/**
 * Step 2: Fetch detailed real-time weather and forecast
 * REST Endpoint: https://api.open-meteo.com/v1/forecast
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} timezone
 * @returns {Promise<Object>} JSON weather dataset
 */
async function fetchWeatherData(latitude, longitude, timezone = 'auto') {
  const currentParams = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'is_day',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'surface_pressure',
    'uv_index'
  ].join(',');

  const hourlyParams = [
    'temperature_2m',
    'weather_code',
    'precipitation_probability'
  ].join(',');

  const dailyParams = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'sunrise',
    'sunset',
    'precipitation_probability_max',
    'uv_index_max'
  ].join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&timezone=${encodeURIComponent(timezone)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather service error (Status: ${response.status})`);
  }

  const weatherData = await response.json();
  return weatherData;
}

/**
 * Orchestrator: Loads weather by city name with complete error handling
 * @param {string} cityName - Name of the city
 */
async function loadWeatherForCity(cityName) {
  if (!cityName || cityName.trim() === '') {
    showError('Please enter a city name to search.');
    return;
  }

  showLoading();
  hideError();

  try {
    // 1. Fetch geographic coordinates
    const location = await fetchCityCoordinates(cityName);

    // 2. Fetch live weather & forecast
    const weather = await fetchWeatherData(location.latitude, location.longitude, location.timezone);

    // 3. Cache state
    state.lastLocation = location;
    state.lastWeatherData = weather;

    // 4. Update UI
    renderFullDashboard(weather, location);
    hideLoading();

    // Update active state on quick pills if applicable
    updateQuickPillState(location.name);

  } catch (err) {
    hideLoading();
    console.error('Weather retrieval error:', err);

    if (err.name === 'CityNotFoundError') {
      showError(`We couldn't find "${cityName}". Please check the spelling or try searching a major nearby city.`);
    } else if (!navigator.onLine) {
      showError('Network offline. Please check your internet connection and try again.');
    } else {
      showError('Unable to load weather data at this moment. The service might be temporarily unavailable. Please try again.');
    }
  }
}

/**
 * Loads weather directly from latitude and longitude (e.g. Browser Geolocation)
 * @param {number} lat
 * @param {number} lon
 * @param {string} defaultName
 */
async function loadWeatherForCoordinates(lat, lon, defaultName = 'Current Location') {
  showLoading();
  hideError();

  try {
    // Reverse geocode to get city name if possible
    let locationMeta = {
      name: defaultName,
      country: '',
      latitude: lat,
      longitude: lon,
      timezone: 'auto'
    };

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lon}&count=1&language=en&format=json`;
      // Open-Meteo doesn't have direct reverse geocoding on that endpoint, but we can display the coordinates or local timezone
    } catch {
      // Fallback is fine
    }

    const weather = await fetchWeatherData(lat, lon, 'auto');

    if (weather.timezone) {
      const parts = weather.timezone.split('/');
      locationMeta.name = parts[parts.length - 1].replace(/_/g, ' ');
      locationMeta.country = parts[0];
    }

    state.lastLocation = locationMeta;
    state.lastWeatherData = weather;

    renderFullDashboard(weather, locationMeta);
    hideLoading();
    updateQuickPillState(locationMeta.name);

  } catch (err) {
    hideLoading();
    console.error('Coordinates weather error:', err);
    showError('Unable to get weather for your current location. Please try searching by city name.');
  }
}

// ==============================================================================
// 6. DOM RENDERING FUNCTIONS
// ==============================================================================

/**
 * Full dashboard re-render
 * @param {Object} weather - Raw Open-Meteo payload
 * @param {Object} location - Location metadata
 */
function renderFullDashboard(weather, location) {
  renderHeroWeather(weather, location);
  renderWeatherMetrics(weather);
  renderHourlyForecast(weather);
  renderDailyForecast(weather);

  // Update timestamp
  const now = new Date();
  lastUpdatedTimeEl.textContent = `Live data updated at ${now.toLocaleTimeString()}`;

  // Make dashboard grid visible
  dashboardGrid.classList.remove('hidden');
}

/**
 * Renders the main Hero Card with temperature, condition, high/low, and visual icon
 */
function renderHeroWeather(weather, location) {
  const current = weather.current;
  const daily = weather.daily;

  // 1. Location text
  locationNameEl.textContent = location.name;
  let countryString = location.country;
  if (location.admin1 && location.admin1 !== location.name) {
    countryString = `${location.admin1}, ${location.country}`;
  }
  locationCountryEl.textContent = countryString;

  // 2. Local Date & Time
  const now = new Date();
  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  locationDateTimeEl.textContent = `${now.toLocaleDateString(undefined, dateOptions)} • ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  // 3. Condition code & description
  const code = current.weather_code;
  const isDay = current.is_day === 1;
  const conditionInfo = WEATHER_CODES[code] || { label: 'Clear', icon: 'sun', nightIcon: 'moon' };
  const iconKey = isDay ? conditionInfo.icon : (conditionInfo.nightIcon || conditionInfo.icon);

  weatherConditionTextEl.textContent = conditionInfo.label;
  conditionBadgeEl.innerHTML = `${isDay ? '☀️' : '🌙'} <span>${isDay ? 'Daytime' : 'Night'}</span>`;

  // 4. Large visual weather SVG
  weatherVisualIconEl.innerHTML = getWeatherSvgIcon(iconKey);

  // 5. Temperature and Units
  mainTempEl.textContent = formatTemperature(current.temperature_2m);
  tempUnitEl.textContent = state.currentUnit === 'celsius' ? '°C' : '°F';

  // 6. High & Low for today
  if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
    const high = formatTemperature(daily.temperature_2m_max[0]);
    const low = formatTemperature(daily.temperature_2m_min[0]);
    const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
    heroHighLowEl.textContent = `H: ${high}${unitSymbol}  •  L: ${low}${unitSymbol}`;
  }

  // 7. Precipitation
  const precip = current.precipitation !== undefined ? current.precipitation : 0;
  heroPrecipitationEl.textContent = `Precipitation: ${precip} mm`;
}

/**
 * Renders the 6 key weather metrics (Feels Like, Humidity, Wind, UV, Pressure, Sun)
 */
function renderWeatherMetrics(weather) {
  const current = weather.current;
  const daily = weather.daily;
  const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';

  // 1. Feels Like Temperature
  const feelsLike = current.apparent_temperature;
  metricFeelsLikeEl.textContent = `${formatTemperature(feelsLike)}${unitSymbol}`;
  const diff = feelsLike - current.temperature_2m;
  if (Math.abs(diff) < 1.5) {
    metricFeelsLikeDescEl.textContent = 'Similar to actual temperature';
  } else if (diff > 0) {
    metricFeelsLikeDescEl.textContent = 'Humidity makes it feel warmer';
  } else {
    metricFeelsLikeDescEl.textContent = 'Wind makes it feel cooler';
  }

  // 2. Humidity
  const humidity = current.relative_humidity_2m;
  metricHumidityEl.textContent = `${humidity}%`;
  metricHumidityBarEl.style.width = `${Math.min(100, Math.max(0, humidity))}%`;
  if (humidity < 35) {
    metricHumidityDescEl.textContent = 'Dry and crisp air';
  } else if (humidity <= 65) {
    metricHumidityDescEl.textContent = 'Comfortable moisture level';
  } else {
    metricHumidityDescEl.textContent = 'High humidity / muggy conditions';
  }

  // 3. Wind Speed & Direction
  const windSpeed = current.wind_speed_10m;
  const windDir = current.wind_direction_10m;
  metricWindSpeedEl.textContent = formatWindSpeed(windSpeed);
  metricWindDescEl.textContent = `Direction: ${getWindDirection(windDir)} (${windDir}°)`;

  // 4. UV Index
  const uv = current.uv_index !== undefined ? current.uv_index : (daily?.uv_index_max?.[0] ?? 0);
  const uvInfo = getUvRisk(uv);
  metricUvIndexEl.textContent = uv.toFixed(1);
  metricUvDescEl.innerHTML = `<span style="color: ${uvInfo.color}; font-weight: 700;">${uvInfo.label}</span> protection recommended`;

  // 5. Surface Air Pressure
  const pressure = current.surface_pressure || 1013;
  metricPressureEl.textContent = `${Math.round(pressure)} hPa`;

  // 6. Sunrise & Sunset
  if (daily && daily.sunrise && daily.sunrise.length > 0) {
    const sunriseStr = formatTime(daily.sunrise[0]);
    const sunsetStr = formatTime(daily.sunset[0]);
    metricSunTimesEl.innerHTML = `Sunrise: <strong>${sunriseStr}</strong> • Sunset: <strong>${sunsetStr}</strong>`;
  } else {
    metricSunTimesEl.textContent = 'Daylight cycle tracked';
  }
}

/**
 * Renders the 24-hour horizontal forecast track
 */
function renderHourlyForecast(weather) {
  hourlyTrackEl.innerHTML = '';

  const hourly = weather.hourly;
  if (!hourly || !hourly.time) return;

  // Find the current hour index from weather.current.time
  const currentHourPrefix = weather.current && weather.current.time
    ? weather.current.time.slice(0, 13)
    : new Date().toISOString().slice(0, 13);

  let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourPrefix));
  if (startIndex === -1) startIndex = 0;

  // Show the next 24 hours
  const endIndex = Math.min(hourly.time.length, startIndex + 24);

  for (let i = startIndex; i < endIndex; i++) {
    const timeIso = hourly.time[i];
    const temp = hourly.temperature_2m[i];
    const code = hourly.weather_code[i];
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[i] : null;

    // Determine hour label (e.g. "Now", "12 PM", "1 PM")
    const timeLabel = i === startIndex ? 'Now' : formatHourLabel(timeIso);

    // Determine day or night icon based on hour
    const hourNum = parseInt((timeIso.split('T')[1] || '').split(':')[0], 10) || 12;
    const isDay = hourNum >= 6 && hourNum < 20;
    const codeInfo = WEATHER_CODES[code] || { icon: 'sun', nightIcon: 'moon' };
    const iconKey = isDay ? codeInfo.icon : (codeInfo.nightIcon || codeInfo.icon);

    const hourItem = document.createElement('div');
    hourItem.className = `hourly-item ${i === startIndex ? 'active-hour' : ''}`;
    hourItem.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <div class="hourly-icon">${getWeatherSvgIcon(iconKey)}</div>
      <span class="hourly-temp">${formatTemperature(temp)}°</span>
      ${pop !== null && pop > 0 ? `<span class="hourly-pop">💧 ${pop}%</span>` : `<span class="hourly-pop" style="opacity: 0.35;">-</span>`}
    `;

    hourlyTrackEl.appendChild(hourItem);
  }
}

/**
 * Renders the 7-day daily forecast rows
 */
function renderDailyForecast(weather) {
  dailyListEl.innerHTML = '';

  const daily = weather.daily;
  if (!daily || !daily.time) return;

  // Find overall min and max across all days to render relative temperature bars
  let allMin = Infinity;
  let allMax = -Infinity;
  for (let i = 0; i < daily.time.length; i++) {
    if (daily.temperature_2m_min[i] < allMin) allMin = daily.temperature_2m_min[i];
    if (daily.temperature_2m_max[i] > allMax) allMax = daily.temperature_2m_max[i];
  }
  const tempRange = Math.max(1, allMax - allMin);

  for (let i = 0; i < daily.time.length; i++) {
    const dateStr = daily.time[i];
    const dayLabel = formatDayName(dateStr, i);
    const shortDate = formatShortDate(dateStr);
    const code = daily.weather_code[i];
    const minTemp = daily.temperature_2m_min[i];
    const maxTemp = daily.temperature_2m_max[i];
    const conditionInfo = WEATHER_CODES[code] || { label: 'Clear Sky', icon: 'sun' };

    // Calculate bar percentage
    const leftPercent = Math.max(0, ((minTemp - allMin) / tempRange) * 100);
    const widthPercent = Math.max(15, ((maxTemp - minTemp) / tempRange) * 100);

    const row = document.createElement('div');
    row.className = 'daily-row';
    row.innerHTML = `
      <div class="daily-day-meta">
        <span class="daily-day-name">${dayLabel}</span>
        <span class="daily-date">${shortDate}</span>
      </div>
      <div class="daily-icon">
        ${getWeatherSvgIcon(conditionInfo.icon)}
      </div>
      <div class="daily-condition-label">
        ${conditionInfo.label}
      </div>
      <div class="daily-temps">
        <span class="temp-min">${formatTemperature(minTemp)}°</span>
        <div class="temp-bar-container" title="Min: ${formatTemperature(minTemp)}°, Max: ${formatTemperature(maxTemp)}°">
          <div class="temp-bar-fill" style="margin-left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        </div>
        <span class="temp-max">${formatTemperature(maxTemp)}°</span>
      </div>
    `;

    dailyListEl.appendChild(row);
  }
}

// ==============================================================================
// 7. UI STATE & FEEDBACK MANAGERS
// ==============================================================================

function showLoading() {
  loadingState.classList.remove('hidden');
  dashboardGrid.classList.add('hidden');
  errorState.classList.add('hidden');
}

function hideLoading() {
  loadingState.classList.add('hidden');
}

function showError(message, title = 'Unable to Load Weather') {
  errorTitle.textContent = title;
  errorDesc.textContent = message;
  errorState.classList.remove('hidden');
  dashboardGrid.classList.add('hidden');
}

function hideError() {
  errorState.classList.add('hidden');
}

function updateQuickPillState(cityName) {
  quickPills.forEach(pill => {
    if (pill.dataset.city.toLowerCase() === cityName.toLowerCase()) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

// ==============================================================================
// 8. EVENT LISTENERS
// ==============================================================================

/**
 * Handle Search Form Submit
 */
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = cityInput.value.trim();
  if (query) {
    loadWeatherForCity(query);
  }
});

/**
 * Handle Quick City Pills Click
 */
quickPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const city = pill.dataset.city;
    cityInput.value = city;
    loadWeatherForCity(city);
  });
});

/**
 * Geolocation "Use My Location" Button
 */
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser. Please search by city name instead.');
    return;
  }

  showLoading();
  hideError();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      cityInput.value = '';
      loadWeatherForCoordinates(lat, lon, 'Your Location');
    },
    (err) => {
      hideLoading();
      console.warn('Geolocation error:', err);
      let msg = 'Could not access your location. Please check browser permissions or search by city name.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Location permission was denied. Please enter your city name in the search box.';
      }
      showError(msg, 'Location Access Denied');
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
});

/**
 * Unit Switcher (°C and °F)
 */
unitCelsiusBtn.addEventListener('click', () => {
  if (state.currentUnit === 'celsius') return;
  state.currentUnit = 'celsius';
  unitCelsiusBtn.classList.add('active');
  unitFahrenheitBtn.classList.remove('active');

  // Re-render cached data with new unit
  if (state.lastWeatherData && state.lastLocation) {
    renderFullDashboard(state.lastWeatherData, state.lastLocation);
  }
});

unitFahrenheitBtn.addEventListener('click', () => {
  if (state.currentUnit === 'fahrenheit') return;
  state.currentUnit = 'fahrenheit';
  unitFahrenheitBtn.classList.add('active');
  unitCelsiusBtn.classList.remove('active');

  // Re-render cached data with new unit
  if (state.lastWeatherData && state.lastLocation) {
    renderFullDashboard(state.lastWeatherData, state.lastLocation);
  }
});

/**
 * Dark / Light Theme Toggle
 */
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  state.theme = newTheme;

  themeToggleBtn.innerHTML = newTheme === 'light'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
});

/**
 * Retry button on error banner
 */
retryBtn.addEventListener('click', () => {
  const query = cityInput.value.trim() || 'London';
  loadWeatherForCity(query);
});

// ==============================================================================
// 9. INITIAL LOAD
// ==============================================================================
// Start by loading a default world capital so the dashboard immediately shows data
window.addEventListener('DOMContentLoaded', () => {
  const initialCity = 'London';
  cityInput.value = initialCity;
  loadWeatherForCity(initialCity);
});
