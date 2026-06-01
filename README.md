# README

This file documents the entire project, its architecture, all libraries used, and how to get started.

---

## Project Structure

```
atmospheric-archive/
├── index.html      # HTML structure — semantic
├── theme.css       # Theme tokens for light and dark mode
├── style.css       # All CSS — design tokens, components, responsive
├── script.js       # JavaScript — Axios, weather API, DOM updates
└── README.md       # This documentation file
```

### File Responsibilities

| File         | Purpose                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` | Semantic HTML structure with data-attribute hooks for JS.                                                                                                     |
| `theme.css`  | Light and dark theme token definitions that drive the UI through CSS custom properties.                                                                       |
| `style.css`  | Complete styling system with CSS custom properties, component classes, responsive breakpoints, animations, and loading/error states.                          |
| `script.js`  | Application logic: Axios HTTP calls, Open-Meteo API integration, geolocation, city search, DOM updates, theme persistence, toast notifications, auto-refresh. |
| `README.md`  | Project documentation, library explanations, and configuration guide.                                                                                         |

---

## Libraries & Dependencies

### Axios

**Version:** 1.7.2 (loaded via CDN)  
**Website:** [https://axios-http.com](https://axios-http.com)  
**CDN:** `https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/axios.min.js`

#### What is Axios?

Axios is a **promise-based HTTP client** for JavaScript. It simplifies making HTTP requests (GET, POST, PUT, DELETE, etc.) from the browser and provides a cleaner, more powerful API than the native `fetch()` function.

#### Why We Use Axios Instead of `fetch()`

| Feature                       | `fetch()`                                                            | Axios                                                                   |
| ----------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Automatic JSON parsing        | Requires `response.json()` call                                      | Parses JSON automatically                                               |
| Error handling                | Only rejects on network errors; HTTP errors (404, 500) still resolve | Rejects on any HTTP error status (4xx, 5xx)                             |
| Request/response interceptors | Not available                                                        | Built-in interceptor support for global request/response transformation |
| Request timeout               | Requires `AbortController`                                           | Built-in `timeout` option                                               |
| Request cancellation          | Requires `AbortController`                                           | Legacy and modern cancellation support                                  |
| XSRF/CSRF protection          | Manual implementation                                                | Built-in support                                                        |
| Query parameter serialization | Manual `URLSearchParams`                                             | Automatic `params` object serialization                                 |
| Response schema               | Raw `Response` object                                                | Structured `{ data, status, headers, config }`                          |
| Browser compatibility         | Requires polyfill in older browsers                                  | Works in all browsers including IE11                                    |

In our project, we use Axios specifically for:

1. **Fetching weather data** — `axios.get()` with automatic `params` serialization to build the Open-Meteo API query string from a JavaScript object, which is far cleaner than manually constructing URL parameters.
2. **Geocoding city searches** — `axios.get()` with the Geocoding API, benefiting from automatic JSON response parsing.
3. **Error handling** — Axios distinguishes between network errors (`error.request`), server errors (`error.response`), and configuration errors (`error.message`), allowing us to show specific toast notifications to the user.

Example from our code:
```javascript
const response = await axios.get(CONFIG.API_BASE + '/forecast', {
    params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,...',
        daily: 'weather_code,temperature_2m_max,...',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        timezone: 'auto',
        forecast_days: 7,
    },
});
// response.data is already parsed JSON — no need for .json()
```

---

### Google Fonts — Inter

**URL:** [https://fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter)

### Google Material Symbols

**URL:** [https://fonts.google.com/icons](https://fonts.google.com/icons)

#### What are Material Symbols?

Material Symbols are Google's **open-source icon library** with over 2,500 icons in five style variants (Outlined, Rounded, Sharp, Two Tone, Filled). They are implemented as a variable font, allowing real-time customization of weight, fill, and optical size.

#### Why We Use It

- **Variable font technology**: We dynamically toggle the `FILL` axis via `font-variation-settings` to switch icons between outlined (inactive) and filled (active/primary) states, matching the design system's active state conventions.
- **Weather-specific icons**: Material Symbols includes a rich set of weather icons — `partly_cloudy_day`, `wb_sunny`, `cloud`, `rainy`, `thunderstorm`, `ac_unit`, `foggy`, `severe_cold` — that directly correspond to WMO weather codes.
- **Metric icons**: Icons like `air` (wind), `humidity_low`, `visibility`, `thermostat`, `speed` (pressure), and `wb_sunny` (UV) provide instant visual recognition for each metric card.
- **No image dependencies**: As a font, icons scale infinitely without pixelation and inherit CSS color, keeping our design purely code-based.

---

## Weather API

This project uses the **Open-Meteo API** — a free, open-source weather API that requires **no API key**.

### Open-Meteo Forecast API

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Parameters Used:**

| Parameter          | Value                     | Description                           |
| ------------------ | ------------------------- | ------------------------------------- |
| `latitude`         | Float                     | Geographic latitude coordinate        |
| `longitude`        | Float                     | Geographic longitude coordinate       |
| `current`          | Comma-separated string    | Current weather variables to retrieve |
| `daily`            | Comma-separated string    | Daily forecast variables to retrieve  |
| `temperature_unit` | `fahrenheit` or `celsius` | Temperature output unit               |
| `wind_speed_unit`  | `mph`, `kmh`, `ms`, `kn`  | Wind speed output unit                |
| `timezone`         | `auto`                    | Auto-detect timezone from coordinates |
| `forecast_days`    | `7`                       | Number of forecast days (1–16)        |

**Current Variables Retrieved:**

| Variable               | Description                        | Used For                                    |
| ---------------------- | ---------------------------------- | ------------------------------------------- |
| `temperature_2m`       | Air temperature at 2m above ground | Hero temperature display                    |
| `relative_humidity_2m` | Relative humidity percentage       | Humidity metric card                        |
| `apparent_temperature` | "Feels like" temperature           | Feels Like metric card                      |
| `weather_code`         | WMO weather code                   | Condition label, icon, and clarity status   |
| `wind_speed_10m`       | Wind speed at 10m above ground     | Wind Speed metric card                      |
| `wind_direction_10m`   | Wind direction in degrees          | Wind direction compass label                |
| `surface_pressure`     | Surface air pressure in hPa        | Pressure metric card (converted to inHg)    |
| `uv_index`             | UV index value                     | UV Index metric card                        |
| `visibility`           | Visibility in meters               | Visibility metric card (converted to miles) |

**Daily Variables Retrieved:**

| Variable             | Description               | Used For                            |
| -------------------- | ------------------------- | ----------------------------------- |
| `weather_code`       | WMO weather code per day  | Forecast card icons and labels      |
| `temperature_2m_max` | Maximum daily temperature | Forecast card high temps, hero high |
| `temperature_2m_min` | Minimum daily temperature | Forecast card low temps, hero low   |

### Open-Meteo Geocoding API

**Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`

**Parameters Used:**

| Parameter  | Value  | Description                 |
| ---------- | ------ | --------------------------- |
| `name`     | String | City name to search for     |
| `count`    | `1`    | Number of results to return |
| `language` | `en`   | Language for result names   |
| `format`   | `json` | Response format             |

This API is used when the user types a city name in the search bar. It returns the latitude and longitude of the best matching result, which is then used to fetch weather data.

The search also supports direct coordinate input (e.g., `37.77, -122.42`) which bypasses the geocoding step.

---

## Design System

The visual design follows the **"Weather App"** design system specification, which defines:

- **"No-Line" Rule**: Boundaries are defined solely through background color shifts, never 1px solid borders.
- **Surface Hierarchy**: The UI is treated as a series of physical layers — Base (`#fbf9f8`), Secondary (`#f0eded`), Primary Cards (`#ffffff`), Interactive (`#eae8e7`).
- **Glass & Gradient Rule**: Glassmorphism for floating elements with `backdrop-filter: blur(20px)`, and a signature `primary → primary_container` gradient for the current section.

All design tokens are defined as CSS custom properties in `:root` for easy theming and maintenance.

---

## Features

- **Live Weather Data**: Fetches real-time conditions from the Open-Meteo API using Axios.
- **7-Day Forecast**: Dynamically rendered forecast cards with weather icons, high/low temperatures.
- **City Search**: Search by city name or latitude/longitude coordinates with the Geocoding API.
- **Geolocation**: Automatically detects your location on page load (with user permission).
- **Auto-Refresh**: Weather data refreshes every 5 minutes in the background.
- **Responsive Design**: Adapts gracefully from desktop (1440px) to mobile (480px).
- **Toast Notifications**: User-friendly error and status messages via non-intrusive toasts.
- **Theme Switcher**: Toggle between light and dark mode, with the selected theme saved locally.
- **Loading States**: Skeleton loading animations for smooth data transitions.
- **Accessibility**: Semantic HTML with ARIA labels and keyboard-navigable search.
- **No API Key Required**: Open-Meteo is completely free and open-source.
- **Zero Dependencies to Install**: All libraries loaded via CDN — no `npm install` needed.

---