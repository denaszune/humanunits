(() => {
  const key = 'humanunits:theme:v1';
  const root = document.documentElement;
  let preference = 'system';

  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {}

  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;

  const resolved = preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  root.style.colorScheme = resolved;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = resolved === 'dark' ? '#121212' : '#f6f2e8';
})();
