(() => {
    "use strict";

    const LS_THEME_KEY = "theme";
    const THEMES = {
        LIGHT: "light",
        DARK: "dark",
        AUTO: "auto",
    };

    const body = document.body;
    const defaultConfig = (body.getAttribute("data-theme") || "").toLowerCase();
    const prefersDark = () =>
        window.matchMedia("(prefers-color-scheme: dark)").matches;

    const resolveTheme = () => {
        const stored = localStorage.getItem(LS_THEME_KEY);
        if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored;

        if (defaultConfig === THEMES.LIGHT || defaultConfig === THEMES.DARK) {
            return defaultConfig;
        }

        return prefersDark() ? THEMES.DARK : THEMES.LIGHT;
    };

    const applyTheme = (state) => {
        const theme = state === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
        body.setAttribute("data-theme", theme);
        document.documentElement.classList.toggle(THEMES.DARK, theme === THEMES.DARK);
        document.documentElement.classList.toggle(
            THEMES.LIGHT,
            theme === THEMES.LIGHT
        );
    };

    const toggleTheme = () => {
        const next = resolveTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        localStorage.setItem(LS_THEME_KEY, next);
        applyTheme(next);
    };

    // Apply theme as early as possible to prevent flashes.
    applyTheme(resolveTheme());
    requestAnimationFrame(() => body.classList.remove("notransition"));

    window.addEventListener("DOMContentLoaded", () => {
        const lamp = document.getElementById("mode");
        if (lamp) {
            lamp.addEventListener("click", (event) => {
                event.preventDefault();
                toggleTheme();
            });
        }

        const menuTrigger = document.getElementById("menu-trigger");
        if (menuTrigger) {
            menuTrigger.addEventListener("change", function () {
                const area = document.querySelector(".main-container");
                if (!area) return;

                const open = this.checked;
                area.classList.toggle("blurry", open);
                document.body.classList.toggle("menu-open", open);
            });
        }

        if (defaultConfig === THEMES.AUTO && "matchMedia" in window) {
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", (event) => {
                    const stored = localStorage.getItem(LS_THEME_KEY);
                    if (stored === THEMES.LIGHT || stored === THEMES.DARK) return;
                    applyTheme(event.matches ? THEMES.DARK : THEMES.LIGHT);
                });
        }
    });
})();

