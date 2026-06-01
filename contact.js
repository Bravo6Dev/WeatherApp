(function () {
    'use strict';

    const THEME_STORAGE_KEY = 'weather-app-theme';

    function $(selector) {
        return document.querySelector(selector);
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
                const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme, true);
            });
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', function (event) {
            if (getStoredTheme()) return;
            applyTheme(event.matches ? 'dark' : 'light', false);
        });
    }

    function initializeFormSimulation() {
        const form = $('#contact-form');
        const feedback = $('#contact-feedback');
        if (!form || !feedback) return;

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            const name = $('#contact-name');
            const topic = $('#contact-topic');
            const nameValue = name && name.value ? name.value.trim() : 'there';
            const topicValue = topic && topic.value ? topic.value : 'General';

            feedback.textContent = 'Thanks, ' + nameValue + '. Your ' + topicValue.toLowerCase() + ' message was captured locally for simulation only.';
            form.reset();
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initializeTheme();
        initializeFormSimulation();
    });
})();