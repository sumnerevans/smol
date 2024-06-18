function ThemeManager(options) {
  var defaultTheme = options.defaultTheme;
  var enableAutoDetectTheme = options.enableAutoDetectTheme.toLowerCase() === 'true';

  var darkThemeMatch = window.matchMedia(
    defaultTheme === 'light' ?
      '(prefers-color-scheme: dark)' :
      '(prefers-color-scheme: dark), (prefers-color-scheme: no-preference)'
  );

  function detectThemeAndSwitchStyle() {
    var theme = localStorage.getItem('themeOverride');
    if (theme !== 'light' && theme !== 'dark') {
      if (theme === 'browser' || enableAutoDetectTheme) {
        theme = darkThemeMatch.matches ? 'dark' : 'light';
      } else {
        theme = defaultTheme;
      }
    }

    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    for (let el of document.getElementsByTagName("img")) {
      if (el.src.match(/https:\/\/notbyai.fyi\/img/)) {
        if (theme === 'dark') {
          el.src = 'https://notbyai.fyi/img/written-by-human-not-by-ai-black.svg';
        } else {
          el.src = 'https://notbyai.fyi/img/written-by-human-not-by-ai-white.svg';
        }
      }
    }
  }

  this.switch = function (themeOverride) {
    localStorage.setItem('themeOverride', themeOverride);
    detectThemeAndSwitchStyle();
  };

  // If there's an override, then apply it, otherwise, don't incur the
  // overhead of determining whether or not to switch themes.
  var themeOverride = localStorage.getItem('themeOverride');
  if (themeOverride === 'light' || themeOverride === 'dark') {
    detectThemeAndSwitchStyle();
  }

  // If theme auto-detection is enabled, then add a listenr on the matchMedia.
  darkThemeMatch.addEventListener("change", detectThemeAndSwitchStyle);
}

window.theme = new ThemeManager(document.getElementById('dark-theme-script').dataset);
