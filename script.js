(function () {
    'use strict';

    const CONFIG = {
        API_BASE: 'https://api.open-meteo.com/v1',

        GEOCODING_BASE: 'https://geocoding-api.open-meteo.com/v1',

        DEFAULT_LAT: 32.8873,
        DEFAULT_LON: 13.1875,
        DEFAULT_CITY: 'Tripoli, Libya',

        TEMP_UNIT: 'celsius',

        WIND_UNIT: 'kmh',

        REFRESH_INTERVAL: 5 * 60 * 1000,
    };

    const THEME_STORAGE_KEY = 'weather-app-theme';


    /**
     * The Open-Meteo API returns WMO weather codes.
     * This map translates WMO codes into human-readable descriptions,
     * Material Symbols icon names, and clarity status for the glass card.
     */
    const WMO_CODES = {
        0: { label: 'Clear Sky', icon: 'wb_sunny', clarity: 'Optimal Clarity', filled: true },
        1: { label: 'Mainly Clear', icon: 'wb_sunny', clarity: 'Optimal Clarity', filled: false },
        2: { label: 'Partly Cloudy', icon: 'partly_cloudy_day', clarity: 'Good Clarity', filled: true },
        3: { label: 'Overcast', icon: 'cloud', clarity: 'Reduced Clarity', filled: false },
        45: { label: 'Foggy', icon: 'foggy', clarity: 'Low Clarity', filled: false },
        48: { label: 'Depositing Rime Fog', icon: 'foggy', clarity: 'Low Clarity', filled: false },
        51: { label: 'Light Drizzle', icon: 'rainy', clarity: 'Moderate Clarity', filled: false },
        53: { label: 'Moderate Drizzle', icon: 'rainy', clarity: 'Moderate Clarity', filled: false },
        55: { label: 'Dense Drizzle', icon: 'rainy', clarity: 'Low Clarity', filled: false },
        56: { label: 'Light Freezing Drizzle', icon: 'severe_cold', clarity: 'Low Clarity', filled: false },
        57: { label: 'Dense Freezing Drizzle', icon: 'severe_cold', clarity: 'Low Clarity', filled: false },
        61: { label: 'Slight Rain', icon: 'rainy', clarity: 'Moderate Clarity', filled: false },
        63: { label: 'Moderate Rain', icon: 'rainy', clarity: 'Low Clarity', filled: false },
        65: { label: 'Heavy Rain', icon: 'thunderstorm', clarity: 'Poor Clarity', filled: false },
        66: { label: 'Light Freezing Rain', icon: 'severe_cold', clarity: 'Low Clarity', filled: false },
        67: { label: 'Heavy Freezing Rain', icon: 'severe_cold', clarity: 'Poor Clarity', filled: false },
        71: { label: 'Slight Snowfall', icon: 'ac_unit', clarity: 'Moderate Clarity', filled: false },
        73: { label: 'Moderate Snowfall', icon: 'ac_unit', clarity: 'Low Clarity', filled: false },
        75: { label: 'Heavy Snowfall', icon: 'ac_unit', clarity: 'Poor Clarity', filled: false },
        77: { label: 'Snow Grains', icon: 'ac_unit', clarity: 'Low Clarity', filled: false },
        80: { label: 'Slight Rain Showers', icon: 'rainy', clarity: 'Moderate Clarity', filled: false },
        81: { label: 'Moderate Rain Showers', icon: 'rainy', clarity: 'Low Clarity', filled: false },
        82: { label: 'Violent Rain Showers', icon: 'thunderstorm', clarity: 'Poor Clarity', filled: false },
        85: { label: 'Slight Snow Showers', icon: 'ac_unit', clarity: 'Moderate Clarity', filled: false },
        86: { label: 'Heavy Snow Showers', icon: 'ac_unit', clarity: 'Low Clarity', filled: false },
        95: { label: 'Thunderstorm', icon: 'thunderstorm', clarity: 'Poor Clarity', filled: false },
        96: { label: 'Thunderstorm with Hail', icon: 'thunderstorm', clarity: 'Poor Clarity', filled: false },
        99: { label: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm', clarity: 'Poor Clarity', filled: false },
    };

    function getWeatherInfo(code) {
        return WMO_CODES[code] || { label: 'Unknown', icon: 'help', clarity: 'Data Unavailable', filled: false };
    }

    /**
     * Maps a UV index value to a human-readable category label.
     * Categories follow the EPA UV Index scale.
     */
    function getUVLabel(uvIndex) {
        if (uvIndex <= 2) return 'Low';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High';
        if (uvIndex <= 10) return 'Very High';
        return 'Extreme';
    }

    function getUVPercentage(uvIndex) {
        return Math.min((uvIndex / 11) * 100, 100);
    }

    /**
     * Converts a wind direction in degrees to a 16-point compass label
     * (e.g., NNW, ESE, S).
     */
    function getWindDirection(degrees) {
        const directions = [
            'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
            'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
        ];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }


    /**
     * Calculates the approximate dew point from temperature (°F) and relative humidity (%).
     * Uses the Magnus formula adapted for Fahrenheit.
     */
    function calculateDewPoint(tempF, humidity) {
        const tempC = (tempF - 32) * (5 / 9);
        const a = 17.27;
        const b = 237.7;
        const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
        const dewPointC = (b * alpha) / (a - alpha);
        return Math.round((dewPointC * 9 / 5) + 32);
    }


    /**
     * Returns a descriptive note for the visibility value in miles.
     */
    function getVisibilityNote(miles) {
        if (miles >= 10) return 'Perfectly clear sky.';
        if (miles >= 6) return 'Good visibility with minor haze.';
        if (miles >= 3) return 'Moderate visibility, some fog present.';
        if (miles >= 1) return 'Poor visibility, significant fog or mist.';
        return 'Very poor visibility, dense fog.';
    }

    /**
     * Determines pressure trend from the change in pressure over the
     * last few hours. Positive = Rising, Negative = Falling, ~0 = Steady.
     */
    function getPressureTrend(pressureChange) {
        if (pressureChange > 0.5) return { label: 'Rising', icon: 'trending_up', isRising: true };
        if (pressureChange < -0.5) return { label: 'Falling', icon: 'trending_down', isRising: false };
        return { label: 'Steady', icon: 'trending_flat', isRising: null };
    }

    /**
     * Returns a contextual description comparing the "feels like" temperature
     * to the actual temperature.
     */
    function getFeelsLikeNote(feelsLike, actual) {
        const diff = feelsLike - actual;
        if (Math.abs(diff) <= 2) return 'Similar to the actual temperature.';
        if (diff > 2) return 'Feels warmer than the actual temperature due to humidity.';
        return 'Slightly cooler than the actual temperature due to wind chill.';
    }

    /**
     * Returns a short day label: "Today" for today, or the 3-letter day
     * abbreviation for other dates.
     */
    function getDayLabel(dateStr, index) {
        if (index === 0) return 'Today';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function formatDayPreview(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    }

    function findHourlyIndexForDay(timeValues, dateStr) {
        if (!Array.isArray(timeValues)) return -1;

        const preferredIndex = timeValues.indexOf(dateStr + 'T12:00');
        if (preferredIndex !== -1) return preferredIndex;

        const matchingIndexes = [];
        for (let i = 0; i < timeValues.length; i++) {
            if (typeof timeValues[i] === 'string' && timeValues[i].indexOf(dateStr) === 0) {
                matchingIndexes.push(i);
            }
        }

        if (matchingIndexes.length === 0) return -1;
        return matchingIndexes[Math.floor(matchingIndexes.length / 2)];
    }

    function getHourlyValue(hourly, key, index, fallback) {
        if (!hourly || !Array.isArray(hourly[key]) || index < 0 || index >= hourly[key].length) {
            return fallback;
        }

        const value = hourly[key][index];
        return value == null ? fallback : value;
    }

    function getPressureChange(hourly, index) {
        if (!hourly || !Array.isArray(hourly.surface_pressure) || index <= 0 || index >= hourly.surface_pressure.length) {
            return 0;
        }

        const previousPressure = hourly.surface_pressure[index - 1];
        const currentPressure = hourly.surface_pressure[index];
        if (previousPressure == null || currentPressure == null) {
            return 0;
        }

        return currentPressure - previousPressure;
    }

    function getSelectedDayWeather(data, dayIndex) {
        const safeDayIndex = Math.max(0, Math.min(dayIndex, data.daily.time.length - 1));
        const dateStr = data.daily.time[safeDayIndex];
        const hourlyIndex = findHourlyIndexForDay(data.hourly && data.hourly.time, dateStr);
        const isToday = safeDayIndex === 0;
        const fallbackTemperature = (data.daily.temperature_2m_max[safeDayIndex] + data.daily.temperature_2m_min[safeDayIndex]) / 2;
        const dailyWeatherCode = data.daily.weather_code[safeDayIndex];

        return {
            dayIndex: safeDayIndex,
            date: dateStr,
            dayLabel: getDayLabel(dateStr, safeDayIndex),
            isToday: isToday,
            display_weather_code: dailyWeatherCode,
            weather_code: getHourlyValue(data.hourly, 'weather_code', hourlyIndex, isToday ? data.current.weather_code : data.daily.weather_code[safeDayIndex]),
            temperature_2m: getHourlyValue(data.hourly, 'temperature_2m', hourlyIndex, isToday ? data.current.temperature_2m : fallbackTemperature),
            temperature_2m_max: data.daily.temperature_2m_max[safeDayIndex],
            temperature_2m_min: data.daily.temperature_2m_min[safeDayIndex],
            relative_humidity_2m: getHourlyValue(data.hourly, 'relative_humidity_2m', hourlyIndex, isToday ? data.current.relative_humidity_2m : 0),
            apparent_temperature: getHourlyValue(data.hourly, 'apparent_temperature', hourlyIndex, isToday ? data.current.apparent_temperature : fallbackTemperature),
            wind_speed_10m: getHourlyValue(data.hourly, 'wind_speed_10m', hourlyIndex, isToday ? data.current.wind_speed_10m : 0),
            wind_direction_10m: getHourlyValue(data.hourly, 'wind_direction_10m', hourlyIndex, isToday ? data.current.wind_direction_10m : 0),
            surface_pressure: getHourlyValue(data.hourly, 'surface_pressure', hourlyIndex, isToday ? data.current.surface_pressure : 0),
            uv_index: getHourlyValue(data.hourly, 'uv_index', hourlyIndex, isToday ? data.current.uv_index : data.daily.uv_index_max[safeDayIndex]),
            visibility: getHourlyValue(data.hourly, 'visibility', hourlyIndex, isToday ? data.current.visibility : null),
            pressureChange: getPressureChange(data.hourly, hourlyIndex),
        };
    }

    function renderSelectedDay(data, cityName, dayIndex) {
        const selectedDayWeather = getSelectedDayWeather(data, dayIndex);
        updateHeroSection(selectedDayWeather, cityName);
        updateForecastSection(data.daily, selectedDayWeather.dayIndex);
        updateMetricsSection(selectedDayWeather);
        updateAlertBanner(selectedDayWeather);
    }


    function $(selector) {
        return document.querySelector(selector);
    }

    function setText(selector, text) {
        const el = $(selector);
        if (el) el.textContent = text;
    }

    function setHTML(selector, html) {
        const el = $(selector);
        if (el) el.innerHTML = html;
    }

    function getStoredTheme() {
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    }

    function getPreferredTheme() {
        const storedTheme = getStoredTheme();
        if (storedTheme) return storedTheme;

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function updateThemeToggle(theme) {
        const toggle = $('#theme-toggle');
        const icon = $('#theme-toggle-icon');
        const text = $('#theme-toggle-text');
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        const nextLabel = nextTheme === 'dark' ? 'dark mode' : 'light mode';

        if (toggle) {
            toggle.setAttribute('aria-pressed', String(theme === 'dark'));
            toggle.setAttribute('aria-label', 'Switch to ' + nextLabel);
            toggle.title = 'Switch to ' + nextLabel;
        }

        if (icon) {
            icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }

        if (text) {
            text.textContent = theme === 'dark' ? 'Light' : 'Dark';
        }
    }

    function applyTheme(theme, shouldPersist) {
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeToggle(theme);

        if (shouldPersist) {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    }

    function initializeTheme() {
        applyTheme(getPreferredTheme(), false);

        const toggle = $('#theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme, true);
            });
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', function (event) {
            if (getStoredTheme()) return;
            applyTheme(event.matches ? 'dark' : 'light', false);
        });
    }


    let toastTimeout = null;

    /**
     * Shows a toast notification at the bottom-right of the screen.
     * Automatically hides after 4 seconds.
     */
    function showToast(message) {
        let toast = $('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('visible');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function () {
            toast.classList.remove('visible');
        }, 4000);
    }


    /**
     * Fetches current weather and 7-day forecast from the Open-Meteo API.
     * Uses Axios for the HTTP request.
     *
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} - Parsed weather data
     */
    async function fetchWeatherData(lat, lon) {
        try {
            const response = await axios.get(CONFIG.API_BASE + '/forecast', {
                params: {
                    latitude: lat,
                    longitude: lon,
                    current: [
                        'temperature_2m',
                        'relative_humidity_2m',
                        'apparent_temperature',
                        'weather_code',
                        'wind_speed_10m',
                        'wind_direction_10m',
                        'surface_pressure',
                        'uv_index',
                        'visibility',
                    ].join(','),
                    hourly: [
                        'temperature_2m',
                        'relative_humidity_2m',
                        'apparent_temperature',
                        'weather_code',
                        'wind_speed_10m',
                        'wind_direction_10m',
                        'surface_pressure',
                        'uv_index',
                        'visibility',
                    ].join(','),
                    daily: [
                        'weather_code',
                        'temperature_2m_max',
                        'temperature_2m_min',
                        'uv_index_max',
                    ].join(','),
                    temperature_unit: CONFIG.TEMP_UNIT,
                    wind_speed_unit: CONFIG.WIND_UNIT,
                    timezone: 'auto',
                    forecast_days: 7,
                },
            });

            return response.data;
        } catch (error) {
            console.error('Weather API Error:', error.message);
            if (error.response) {
                showToast('Weather data unavailable (Server error: ' + error.response.status + ')');
            } else if (error.request) {
                showToast('Network error — please check your connection.');
            } else {
                showToast('Failed to fetch weather data.');
            }
            throw error;
        }
    }

    /**
     * Searches for a city using the Open-Meteo Geocoding API.
     * Returns the first matching result's coordinates and name.
     *
     * @param {string} query - City name or coordinates
     * @returns {Promise<Object|null>} - { lat, lon, name } or null
     */
    async function searchCity(query) {
        try {
            const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
            if (coordMatch) {
                return {
                    lat: parseFloat(coordMatch[1]),
                    lon: parseFloat(coordMatch[2]),
                    name: coordMatch[1] + ', ' + coordMatch[2],
                };
            }

            const response = await axios.get(CONFIG.GEOCODING_BASE + '/search', {
                params: {
                    name: query,
                    count: 1,
                    language: 'en',
                    format: 'json',
                },
            });

            const results = response.data.results;
            if (!results || results.length === 0) {
                showToast('City not found. Please try another name.');
                return null;
            }

            const first = results[0];
            return {
                lat: first.latitude,
                lon: first.longitude,
                name: first.name + (first.admin1 ? ', ' + first.admin1 : '') + (first.country ? ', ' + first.country : ''),
            };
        } catch (error) {
            console.error('Geocoding API Error:', error.message);
            showToast('City search failed. Please try again.');
            return null;
        }
    }


    /**
     * Updates the hero section with the current weather data.
     */
    function updateHeroSection(selectedDayWeather, cityName) {
        const weatherInfo = getWeatherInfo(selectedDayWeather.display_weather_code);
        const tempUnit = CONFIG.TEMP_UNIT === 'fahrenheit' ? '°' : '°';
        const temp = Math.round(selectedDayWeather.temperature_2m);

        // Location
        setText('#current-location', cityName || CONFIG.DEFAULT_CITY);

        // Temperature
        setText('#current-temp', temp + tempUnit);

        // Condition
        setText('#current-condition', weatherInfo.label);

        // Weather Icon
        const iconEl = $('#current-weather-icon');
        if (iconEl) {
            iconEl.textContent = weatherInfo.icon;
            iconEl.style.fontVariationSettings = weatherInfo.filled
                ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
        }

        setText('#current-clarity', weatherInfo.clarity);

        setText('#current-hilo',
            'H: ' + Math.round(selectedDayWeather.temperature_2m_max) + tempUnit +
            ' L: ' + Math.round(selectedDayWeather.temperature_2m_min) + tempUnit
        );

        const statusLabel = $('#current-status-label');
        const liveDot = $('#current-live-dot');

        if (selectedDayWeather.isToday) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            setText('#last-updated', 'Updated at ' + timeStr);
            if (statusLabel) statusLabel.textContent = 'Live Weather';
            if (liveDot) liveDot.style.opacity = '1';
        } else {
            setText('#last-updated', 'Forecast for ' + formatDayPreview(selectedDayWeather.date));
            if (statusLabel) statusLabel.textContent = 'Selected Forecast';
            if (liveDot) liveDot.style.opacity = '0.4';
        }
    }

    /**
     * Updates the 7-day forecast grid.
     */
    function updateForecastSection(daily, activeDayIndex) {
        const grid = $('#forecast-grid');
        if (!grid) return;

        const tempUnit = CONFIG.TEMP_UNIT === 'fahrenheit' ? '°' : '°';
        let html = '';

        for (let i = 0; i < daily.time.length; i++) {
            const weatherInfo = getWeatherInfo(daily.weather_code[i]);
            const dayLabel = getDayLabel(daily.time[i], i);
            const isActive = i === activeDayIndex;

            const filledStyle = weatherInfo.filled
                ? "style=\"font-variation-settings: 'FILL' 1;\""
                : '';

            html += '<button class="forecast-card' + (isActive ? ' active' : '') + '" type="button" data-day-index="' + i + '" aria-pressed="' + (isActive ? 'true' : 'false') + '">';
            html += '  <span class="forecast-day">' + dayLabel + '</span>';
            html += '  <span class="material-symbols-outlined forecast-icon" ' + filledStyle + '>' + weatherInfo.icon + '</span>';
            html += '  <div class="forecast-temps">';
            html += '    <p class="forecast-high">' + Math.round(daily.temperature_2m_max[i]) + tempUnit + '</p>';
            html += '    <p class="forecast-low">' + Math.round(daily.temperature_2m_min[i]) + tempUnit + '</p>';
            html += '  </div>';
            html += '</button>';
        }

        grid.innerHTML = html;
    }

    /**
     * Updates all the metric cards with detailed weather data.
     */
    function updateMetricsSection(selectedDayWeather) {
        const tempUnit = CONFIG.TEMP_UNIT === 'fahrenheit' ? '°' : '°';

        setText('#wind-speed', Math.round(selectedDayWeather.wind_speed_10m));
        setText('#wind-direction', getWindDirection(selectedDayWeather.wind_direction_10m));
        const windPercent = Math.min((selectedDayWeather.wind_speed_10m / 60) * 100, 100);
        const windGauge = $('#wind-gauge');
        if (windGauge) windGauge.style.width = windPercent + '%';

        // Humidity
        setText('#humidity', Math.round(selectedDayWeather.relative_humidity_2m));
        const actualTemp = selectedDayWeather.temperature_2m;
        const dewPoint = calculateDewPoint(actualTemp, selectedDayWeather.relative_humidity_2m || 1);
        setText('#humidity-note', 'The dew point is ' + dewPoint + tempUnit + ' right now.');

        // UV Index
        const uvIndex = Math.round(selectedDayWeather.uv_index);
        setText('#uv-index', uvIndex);
        setText('#uv-label', getUVLabel(uvIndex));
        const uvDot = $('#uv-dot');
        if (uvDot) uvDot.style.left = getUVPercentage(uvIndex) + '%';

        // Visibility (Open-Meteo returns visibility in meters, convert to miles)
        let visibilityMiles = 10; // default
        if (selectedDayWeather.visibility != null) {
            visibilityMiles = Math.round((selectedDayWeather.visibility / 1609.34) * 10) / 10;
            // Cap at 10 miles for display
            if (visibilityMiles > 10) visibilityMiles = 10;
        }
        setText('#visibility', visibilityMiles);
        setText('#visibility-note', getVisibilityNote(visibilityMiles));

        // Pressure (Open-Meteo returns hPa, convert to inHg)
        const pressureInHg = (selectedDayWeather.surface_pressure * 0.02953).toFixed(2);
        setText('#pressure', pressureInHg);

        const pressureTrendEl = $('#pressure-trend');
        if (pressureTrendEl) {
            const trend = getPressureTrend(selectedDayWeather.pressureChange);
            pressureTrendEl.innerHTML =
                '<span class="material-symbols-outlined pressure-trend-icon">' + trend.icon + '</span>' +
                trend.label;
            if (trend.isRising === false) {
                pressureTrendEl.style.color = 'var(--error)';
            } else if (trend.isRising === true) {
                pressureTrendEl.style.color = 'var(--secondary)';
            } else {
                pressureTrendEl.style.color = 'var(--on-surface-variant)';
            }
        }

        const feelsLike = Math.round(selectedDayWeather.apparent_temperature);
        setText('#feels-like', feelsLike + tempUnit);
        setText('#feels-like-note', getFeelsLikeNote(feelsLike, actualTemp));
    }


    /**
     * Evaluates current weather conditions and generates an alert
     * banner message if any advisory conditions are detected.
     */
    function updateAlertBanner(selectedDayWeather) {
        const alerts = [];

        // High UV alert
        if (selectedDayWeather.uv_index >= 8) {
            alerts.push('Extreme UV index of ' + Math.round(selectedDayWeather.uv_index) + ' — limit outdoor exposure.');
        }

        // High wind alert
        if (selectedDayWeather.wind_speed_10m >= 40) {
            alerts.push('High wind warning: ' + Math.round(selectedDayWeather.wind_speed_10m) + ' km/h winds expected.');
        }

        // Low visibility alert
        if (selectedDayWeather.visibility && selectedDayWeather.visibility < 3000) {
            alerts.push('Low visibility advisory — fog or mist detected in your area.');
        }

        const banner = $('#alert-banner');
        const alertText = $('#alert-text');

        if (!banner || !alertText) {
            return;
        }

        if (alerts.length > 0) {
            alertText.textContent = alerts.join(' | ');
            banner.style.display = 'flex';
        } else {
            // Keep the default pollen advisory if no dynamic alerts
            banner.style.display = 'flex';
        }
    }


    let currentLat = CONFIG.DEFAULT_LAT;
    let currentLon = CONFIG.DEFAULT_LON;
    let currentCityName = CONFIG.DEFAULT_CITY;
    let refreshTimer = null;
    let selectedDayIndex = 0;
    let latestWeatherData = null;

    /**
     * Loads weather data for the given coordinates and updates all UI sections.
     */
    async function loadWeather(lat, lon, cityName) {
        try {
            const data = await fetchWeatherData(lat, lon);

            if (data.current && data.daily && data.hourly) {
                latestWeatherData = data;
                selectedDayIndex = 0;
                renderSelectedDay(data, cityName, selectedDayIndex);
            } else {
                showToast('Received incomplete weather data.');
            }
        } catch (err) {
            // Error already handled in fetchWeatherData
        }
    }

    /**
     * Handles the search input: geocodes the query and reloads weather data.
     */
    async function handleSearch(query) {
        if (!query || !query.trim()) return;

        const result = await searchCity(query.trim());
        if (result) {
            currentLat = result.lat;
            currentLon = result.lon;
            currentCityName = result.name;
            await loadWeather(currentLat, currentLon, currentCityName);
            showToast('Weather updated for ' + result.name);
        }
    }

    /**
     * Sets up the auto-refresh timer to periodically fetch new data.
     */
    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(function () {
            loadWeather(currentLat, currentLon, currentCityName);
        }, CONFIG.REFRESH_INTERVAL);
    }

    function initializeForecastSelection() {
        const grid = $('#forecast-grid');
        if (!grid) return;

        grid.addEventListener('click', function (event) {
            const button = event.target.closest('.forecast-card');
            if (!button || !latestWeatherData) {
                return;
            }

            const nextDayIndex = Number(button.getAttribute('data-day-index'));
            if (Number.isNaN(nextDayIndex) || nextDayIndex === selectedDayIndex) {
                return;
            }

            selectedDayIndex = nextDayIndex;
            renderSelectedDay(latestWeatherData, currentCityName, selectedDayIndex);
        });
    }


    document.addEventListener('DOMContentLoaded', function () {
        initializeTheme();
        initializeForecastSelection();

        // Search input handler
        const searchInput = $('#search-input');

        if (searchInput) {
            // Handle Enter key
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch(searchInput.value);
                }
            });
        }

        const settingsBtn = $('#settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function () {
                showToast('Settings panel coming soon.');
            });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    currentLat = position.coords.latitude;
                    currentLon = position.coords.longitude;
                    currentCityName = currentLat.toFixed(2) + ', ' + currentLon.toFixed(2);
                    loadWeather(currentLat, currentLon, currentCityName);
                },
                function () {
                    loadWeather(currentLat, currentLon, currentCityName);
                }
            );
        } else {
            loadWeather(currentLat, currentLon, currentCityName);
        }

        startAutoRefresh();
    });

})();
