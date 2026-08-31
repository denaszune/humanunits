import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { evaluate, formatValue, pairQuery, supportedUnits } from './conversion.js';
import { movePin, prependPin, quickReusePins, reusePinnedPair } from './pins.js';
import { isHistoryEntry, isPinEntry, readStoredCollection, writeStoredValue } from './storage.js';

const HISTORY_KEY = 'humanunits:history:v1';
const PINS_KEY = 'humanunits:pins:v1';
const PRECISION_KEY = 'humanunits:precision:v1';
const THEME_KEY = 'humanunits:theme:v1';
const THEME_COLORS = { light: '#f6f2e8', dark: '#121212' };
const themeOptions = [
  { value: 'system', label: 'System', description: 'Use device setting' },
  { value: 'light', label: 'Light', description: 'Warm paper' },
  { value: 'dark', label: 'Dark', description: 'Low-light palette' },
];
const examples = ['10 km in miles', '72 f to c', '5 lb to kg'];
const appRoot = import.meta.env.BASE_PATH === './' ? new URL('./', document.baseURI).pathname : import.meta.env.BASE_PATH;
const licensePath = `${appRoot}#license`;
const symbolPairQuery = (from, to, value) => pairQuery(from, to, value);
const formattedResult = (value, precision) => {
  const formatted = formatValue(value.result, value.to, value.clockStyle, precision);
  return value.to.formatIncludesUnit ? formatted : `${formatted} ${value.to.symbol}`;
};
const scrollToTop = (smooth = true, scroller) => {
  const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
  const options = { top: 0, behavior };
  scroller?.scrollTo(options);
  const rootScroller = document.scrollingElement || document.documentElement;
  if (rootScroller !== scroller) rootScroller.scrollTo(options);
};

function AboutPage(props) {
  return <section class="about-page" aria-labelledby="about-title">
    <h1 id="about-title">About Human Units</h1>
    <p class="about-intro">A fast, private unit converter that understands natural language.</p>
    <section><h2>Private by design</h2><p>Human Units works offline, requires no account, and includes no tracking or analytics. Recent conversions and pinned pairs stay in your browser’s local storage on this device.</p></section>
    <section><h2>Coverage and accuracy</h2><p>Convert everyday, scientific, computing, and specialist units—including distinct US and Imperial measurements where their definitions differ.</p><p>Conversions are calculated locally using explicit unit definitions. Temperature, fuel economy, calendar durations, and other special cases use dedicated conversion logic.</p></section>
    <section class="open-source-section"><h2>Open source</h2><p>Human Units is open source and available under the MIT License.</p><div class="open-source-links">
      <a href="https://github.com/denaszune/humanunits"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2.75a9.5 9.5 0 0 0-3 18.51c.48.09.65-.2.65-.46v-1.67c-2.67.58-3.23-1.13-3.23-1.13-.43-1.11-1.06-1.4-1.06-1.4-.87-.6.07-.59.07-.59.96.07 1.47.99 1.47.99.86 1.47 2.25 1.05 2.8.8.09-.62.34-1.05.61-1.29-2.13-.24-4.37-1.07-4.37-4.7 0-1.04.37-1.89.98-2.56-.1-.24-.43-1.21.09-2.52 0 0 .8-.26 2.61.98A9.1 9.1 0 0 1 12 7.43a9 9 0 0 1 2.38.32c1.81-1.24 2.61-.98 2.61-.98.52 1.31.19 2.28.09 2.52.61.67.98 1.52.98 2.56 0 3.64-2.24 4.45-4.38 4.69.35.3.65.88.65 1.78v2.48c0 .26.18.56.66.46A9.5 9.5 0 0 0 12 2.75Z"/></svg>GitHub</a>
      <span aria-hidden="true">·</span>
      <a href={licensePath} onClick={event => props.onNavigate(event, licensePath)}>License</a>
    </div></section>
    <section><h2>Install</h2><p>Install Human Units for quick access and an app-like experience. When installation is supported, Install appears in the header.</p></section>
  </section>;
}

function LicensePage() {
  return <article class="license-page" aria-labelledby="license-title">
    <h1 id="license-title">MIT License</h1>
    <p class="license-copyright">Copyright © 2026 Andrew Loiacono</p>
    <div class="license-text">
      <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
      <p>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
      <p>THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
    </div>
  </article>;
}

function LibraryPage(props) {
  return <section class="library-page" aria-labelledby="library-title">
    <header class="secondary-page-heading">
      <h1 id="library-title">Library</h1>
      <p>Saved on this device.</p>
    </header>

    <div class="library-grid">
      <section class="library-panel" aria-labelledby="library-pins-title">
        <div class="library-section-heading">
          <div><h2 id="library-pins-title">Pinned Pairs</h2></div>
          <span class="library-count" aria-label={`${props.pins.length} of 8 pinned pairs`}>{props.pins.length} / 8</span>
        </div>
        <Show when={props.pins.length} fallback={<p class="library-empty">Pin a conversion pair to keep it close at hand.</p>}>
          <ul class="library-list"><For each={props.pins}>{(item, index) => <li class="library-item library-pin-item">
            <button class="library-reuse" type="button" onClick={() => props.onReusePin(item)} aria-label={`Convert ${item.from} to ${item.to}`}>
              <span class="library-pair">{item.from} <span aria-hidden="true">→</span> {item.to}</span>
            </button>
            <div class="library-pin-actions">
              <button class="library-order" type="button" onClick={() => props.onMovePin(index(), -1)} disabled={index() === 0} aria-label={`Move ${item.from} to ${item.to} up`} title="Move up">
                <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3.5 10 4.5-4.5 4.5 4.5"/></svg>
              </button>
              <button class="library-order" type="button" onClick={() => props.onMovePin(index(), 1)} disabled={index() === props.pins.length - 1} aria-label={`Move ${item.from} to ${item.to} down`} title="Move down">
                <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3.5 6 4.5 4.5L12.5 6"/></svg>
              </button>
              <button class="library-remove" type="button" onClick={() => props.onUnpin(item)} aria-label={`Unpin ${item.from} to ${item.to}`} title="Unpin pair">
                <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 4 8 8m0-8-8 8"/></svg>
              </button>
            </div>
          </li>}</For></ul>
        </Show>
      </section>

      <section class="library-panel" aria-labelledby="library-recent-title">
        <div class="library-section-heading">
          <div><h2 id="library-recent-title">Recent</h2></div>
          <div class="library-section-actions">
            <span class="library-count" aria-label={`${props.recents.length} of 8 recent conversions`}>{props.recents.length} / 8</span>
            <Show when={props.recents.length}><button class="library-clear" type="button" onClick={props.onClear}>Clear</button></Show>
          </div>
        </div>
        <Show when={props.recents.length} fallback={<p class="library-empty">Press Enter on a conversion to add it here.</p>}>
          <ul class="library-list"><For each={props.recents}>{item => <li class="library-item">
            <button class="library-reuse library-recent" type="button" onClick={() => props.onReuse(item.query)} aria-label={`Reuse ${item.query}, result ${item.result}`}>
              <span>{item.query}</span>
              <strong>{item.result}</strong>
            </button>
            <button class="library-remove" type="button" onClick={() => props.onRemoveRecent(item.query)} aria-label={`Remove ${item.query} from recent conversions`} title="Remove recent conversion">
              <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 4 8 8m0-8-8 8"/></svg>
            </button>
          </li>}</For></ul>
        </Show>
      </section>
    </div>
  </section>;
}

function save(key, value) {
  return writeStoredValue(localStorage, key, value);
}

function loadPrecision() {
  try {
    const value = JSON.parse(localStorage.getItem(PRECISION_KEY));
    return [6, 10, 15].includes(value) ? value : 6;
  } catch { return 6; }
}

function loadThemePreference() {
  try {
    const value = JSON.parse(localStorage.getItem(THEME_KEY));
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return 'system'; }
}

function saveThemePreference(value) {
  try {
    if (value === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}

function loadSharedConversion() {
  const params = new URLSearchParams(location.search);
  const sharedQuery = (params.get('q') || '').trim();
  const sharedPrecision = Number(params.get('p'));
  return {
    query: sharedQuery.length <= 500 ? sharedQuery : '',
    precision: [6, 10, 15].includes(sharedPrecision) ? sharedPrecision : null,
  };
}

export default function App() {
  const savedPrecision = loadPrecision();
  const sharedConversion = loadSharedConversion();
  const [query, setQuery] = createSignal(sharedConversion.query);
  const [recentConversions, setRecentConversions] = createSignal(readStoredCollection(localStorage, HISTORY_KEY, isHistoryEntry).map(entry => {
    const value = evaluate(entry.query);
    return value ? { query: symbolPairQuery(value.from, value.to, formatValue(value.value, value.from, value.clockStyle)), result: formattedResult(value, savedPrecision) } : null;
  }).filter(Boolean));
  const [pins, setPins] = createSignal(readStoredCollection(localStorage, PINS_KEY, isPinEntry).map(item => {
    const from = { symbol: item.from, category: item.fromCategory };
    const to = { symbol: item.to, category: item.toCategory };
    const query = symbolPairQuery(from, to);
    const value = evaluate(query);
    return value ? { from: value.from.symbol, to: value.to.symbol, fromCategory: value.from.category, toCategory: value.to.category, query } : null;
  }).filter(Boolean));
  const [copied, setCopied] = createSignal(false);
  const [linkCopied, setLinkCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal(false);
  const [linkCopyError, setLinkCopyError] = createSignal(false);
  const [storageError, setStorageError] = createSignal(false);
  const [precision, setPrecision] = createSignal(sharedConversion.precision ?? savedPrecision);
  const [installPrompt, setInstallPrompt] = createSignal(null);
  const [updateReady, setUpdateReady] = createSignal(false);
  const [dockSuppressed, setDockSuppressed] = createSignal(false);
  const colorSchemeQuery = matchMedia('(prefers-color-scheme: dark)');
  const [themePreference, setThemePreference] = createSignal(loadThemePreference());
  const [systemDark, setSystemDark] = createSignal(colorSchemeQuery.matches);
  const resolvedTheme = createMemo(() => themePreference() === 'system' ? (systemDark() ? 'dark' : 'light') : themePreference());
  const themeLabel = createMemo(() => themeOptions.find(option => option.value === themePreference()).label);
  const catalog = supportedUnits();
  const unitCount = catalog.reduce((total, group) => total + group.units.length, 0);
  const popularPairSymbols = [['km', 'mi'], ['°C', '°F'], ['kg', 'lb'], ['cm', 'ft + in'], ['L', 'gal (US)'], ['min/mi', 'min/km']];
  const popularPairs = popularPairSymbols.map(([fromSymbol, toSymbol]) => {
    const group = catalog.find(item => item.units.some(unit => unit.symbol === fromSymbol) && item.units.some(unit => unit.symbol === toSymbol));
    const from = group?.units.find(unit => unit.symbol === fromSymbol);
    const to = group?.units.find(unit => unit.symbol === toSymbol);
    return from && to ? { from, to, query: symbolPairQuery(from, to) } : null;
  }).filter(Boolean);
  const [search, setSearch] = createSignal('');
  const [expanded, setExpanded] = createSignal([]);
  const [selectedFrom, setSelectedFrom] = createSignal(null);
  const [browseSelection, setBrowseSelection] = createSignal(null);
  let conversionInput;
  let resultDisplay;
  let resultFitFrame;
  let resultObserver;
  let observedResult;
  let quickReuseRef;
  let mainRef;
  let themeButton;
  let themePopover;
  let browseSelectionFrame;
  let queryDirty = false;
  let routeReady = false;
  let copiedTimer;
  let linkCopiedTimer;
  let copyErrorTimer;
  let linkCopyErrorTimer;
  const titleCase = text => text.replace(/(^|\s)\S/g, letter => letter.toUpperCase());
  const categorySections = [
    ['Everyday', ['length', 'temperature', 'mass', 'volume', 'area', 'speed', 'pace', 'time', 'calendar duration', 'fuel economy', 'angle', 'typography']],
    ['Science & engineering', ['frequency', 'acceleration', 'force', 'pressure', 'energy', 'power', 'torque', 'density', 'volumetric flow', 'mass flow', 'dynamic viscosity', 'kinematic viscosity', 'ratio', 'amount of substance', 'catalytic activity', 'molar concentration', 'mass concentration', 'specific energy', 'volumetric energy density', 'thermal conductivity', 'heat transfer coefficient', 'specific heat capacity', 'thermal resistance', 'temperature difference']],
    ['Computing', ['digital storage', 'data rate', 'pixel density', 'symbol rate', 'information content']],
    ['Electrical', ['electric current', 'electric charge', 'voltage', 'resistance', 'conductance', 'capacitance', 'inductance', 'magnetic flux', 'magnetic flux density']],
    ['Light & radiation', ['luminous flux', 'illuminance', 'luminance', 'irradiance', 'radioactivity', 'absorbed dose', 'equivalent dose', 'radiation exposure']],
    ['Other / specialized', ['sound level']]
  ].map(([name, categories]) => [name, categories.map(category => catalog.find(group => group.category === category)).filter(Boolean)]).filter(([, groups]) => groups.length);
  const searchResults = createMemo(() => {
    const needle = search().trim().toLowerCase().replace(/µ/g, 'u');
    if (!needle) return [];
    return catalog.flatMap(group => group.units.filter(unit => isCompatible(unit, group.category) && [group.category, unit.name, unit.symbol, ...unit.aliases].some(value => value.toLowerCase().replace(/µ/g, 'u').includes(needle))).map(unit => ({ ...unit, category: group.category })));
  });
  const compatibleUnits = createMemo(() => {
    const from = selectedFrom();
    if (!from) return [];
    return catalog.flatMap(group => group.units.filter(unit => isCompatible(unit, group.category)).map(unit => ({ ...unit, category: group.category })));
  });
  const pageFromLocation = () => location.hash === '#license' ? 'license' : location.hash === '#pairs' ? 'pairs' : location.hash === '#library' ? 'library' : location.hash === '#about' ? 'about' : 'converter';
  const [page, setPage] = createSignal(pageFromLocation());
  const handleLocationChange = () => setPage(pageFromLocation());
  const handleInternalLink = (event, url) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, '', url);
    handleLocationChange();
    requestAnimationFrame(() => scrollToTop(true, quickReuseRef));
  };
  const handleHashChange = handleLocationChange;
  addEventListener('hashchange', handleHashChange);
  addEventListener('popstate', handleLocationChange);
  onCleanup(() => {
    removeEventListener('hashchange', handleHashChange);
    removeEventListener('popstate', handleLocationChange);
  });
  createEffect(() => {
    const current = page();
    const titles = { converter: 'Human Units — Fast, Private Unit Converter', pairs: 'Browse Units · Human Units', library: 'Library · Human Units', about: 'About · Human Units', license: 'License · Human Units' };
    document.title = titles[current];
    if (routeReady) queueMicrotask(() => mainRef?.focus({ preventScroll: true }));
    routeReady = true;
  });
  createEffect(() => {
    const preference = themePreference();
    const resolved = resolvedTheme();
    if (preference === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme = resolved;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = THEME_COLORS[resolved];
  });
  onMount(() => {
    const offerInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const offerUpdate = () => setUpdateReady(true);
    const installed = () => setInstallPrompt(null);
    const syncSystemTheme = event => setSystemDark(event.matches);
    const syncStoredTheme = event => {
      if (event.key === THEME_KEY) setThemePreference(loadThemePreference());
    };
    addEventListener('beforeinstallprompt', offerInstall);
    addEventListener('appinstalled', installed);
    addEventListener('humanunits:update-ready', offerUpdate);
    addEventListener('storage', syncStoredTheme);
    colorSchemeQuery.addEventListener('change', syncSystemTheme);
    if (matchMedia('(pointer: fine)').matches) conversionInput?.focus({ preventScroll: true });
    onCleanup(() => {
      removeEventListener('beforeinstallprompt', offerInstall);
      removeEventListener('appinstalled', installed);
      removeEventListener('humanunits:update-ready', offerUpdate);
      removeEventListener('storage', syncStoredTheme);
      colorSchemeQuery.removeEventListener('change', syncSystemTheme);
      clearTimeout(copiedTimer);
      clearTimeout(linkCopiedTimer);
      clearTimeout(copyErrorTimer);
      clearTimeout(linkCopyErrorTimer);
      cancelAnimationFrame(browseSelectionFrame);
    });
  });
  const conversion = createMemo(() => evaluate(query()));
  const resultText = createMemo(() => {
    const value = conversion();
    return value ? formattedResult(value, precision()) : '';
  });

  function fitResult() {
    cancelAnimationFrame(resultFitFrame);
    resultFitFrame = requestAnimationFrame(() => {
      const number = resultDisplay?.querySelector('strong');
      const unit = resultDisplay?.querySelector(':scope > span:not(.empty-result)');
      if (!number) return;

      number.style.fontSize = '';
      if (unit) unit.style.fontSize = '';
      const styles = getComputedStyle(resultDisplay);
      const available = resultDisplay.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      const numberSize = parseFloat(getComputedStyle(number).fontSize);
      const unitSize = unit ? parseFloat(getComputedStyle(unit).fontSize) : 0;
      const numberWidth = Math.max(number.getBoundingClientRect().width, number.scrollWidth);
      const unitWidth = unit ? Math.max(unit.getBoundingClientRect().width, unit.scrollWidth) : 0;
      const required = numberWidth + unitWidth + (unit ? gap : 0);
      if (required <= available || !Number.isFinite(required)) return;

      const scale = available / required * 0.98;
      number.style.fontSize = `${numberSize * scale}px`;
      if (unit) unit.style.fontSize = `${unitSize * scale}px`;
    });
  }

  function observeResultSize() {
    if (!resultObserver || !resultDisplay || observedResult === resultDisplay) return;
    if (observedResult) resultObserver.unobserve(observedResult);
    observedResult = resultDisplay;
    resultObserver.observe(observedResult);
  }

  createEffect(() => {
    resultText();
    if (page() !== 'converter') return;
    queueMicrotask(() => {
      observeResultSize();
      fitResult();
    });
  });
  onMount(() => {
    const viewport = window.visualViewport;
    const textInputSelector = 'input:not([type]), input[type="text"], input[type="search"]';
    let restingHeight = viewport?.height ?? innerHeight;
    let keyboardSeen = false;
    let settleTimer;

    const activeTextInput = () => document.activeElement?.matches(textInputSelector) ? document.activeElement : null;
    const currentHeight = () => viewport?.height ?? innerHeight;
    const keyboardIsVisible = () => restingHeight - currentHeight() > Math.max(80, restingHeight * .12);
    const cancelSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    };
    const finishKeyboardClose = () => {
      cancelSettle();
      if (viewport && keyboardIsVisible()) {
        keyboardSeen = true;
        setDockSuppressed(true);
        return;
      }
      restingHeight = Math.max(restingHeight, currentHeight());
      if (keyboardSeen) {
        keyboardSeen = false;
        activeTextInput()?.blur();
      }
      setDockSuppressed(false);
    };
    const settleKeyboardClose = (delay = 500) => {
      cancelSettle();
      settleTimer = setTimeout(finishKeyboardClose, delay);
    };
    const syncViewport = () => {
      cancelSettle();
      if (keyboardIsVisible()) {
        keyboardSeen = true;
        setDockSuppressed(true);
      } else if (keyboardSeen) {
        // Predictive-back gestures can temporarily expand the viewport and then
        // be cancelled. Only commit the close after its geometry has settled.
        settleKeyboardClose();
      } else if (!activeTextInput()) {
        settleKeyboardClose(120);
      }
    };
    const handleFocusIn = event => {
      if (!event.target.matches?.(textInputSelector)) return;
      cancelSettle();
      restingHeight = Math.max(restingHeight, currentHeight());
      keyboardSeen = keyboardIsVisible();
      setDockSuppressed(true);
    };
    const handleFocusOut = event => {
      if (!event.target.matches?.(textInputSelector)) return;
      if (event.relatedTarget?.matches?.(textInputSelector)) return;
      if (viewport) syncViewport();
      else settleKeyboardClose(180);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    onCleanup(() => {
      cancelSettle();
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
    });
  });

  onMount(() => {
    if (!resultDisplay || !('ResizeObserver' in window)) return;
    resultObserver = new ResizeObserver(fitResult);
    observeResultSize();
    onCleanup(() => {
      resultObserver.disconnect();
      cancelAnimationFrame(resultFitFrame);
    });
  });

  createEffect(() => {
    const selection = browseSelection();
    if (page() !== 'converter' || !selection) return;
    cancelAnimationFrame(browseSelectionFrame);
    browseSelectionFrame = requestAnimationFrame(() => {
      if (!conversionInput?.isConnected || conversionInput.value !== selection.query) return;
      conversionInput.focus();
      conversionInput.setSelectionRange(selection.start, selection.end);
      // Browsers normally scroll the selection end into view. Browse queries can
      // be wider than the field, so put the selected amount back on screen.
      conversionInput.scrollLeft = 0;
      setBrowseSelection(null);
    });
  });

  function remember(value = conversion()) {
    if (!value) return false;
    const entry = { query: symbolPairQuery(value.from, value.to, formatValue(value.value, value.from, value.clockStyle, precision())), result: formattedResult(value, precision()) };
    const next = [entry, ...recentConversions().filter(item => item.query !== entry.query)].slice(0, 8);
    setRecentConversions(next);
    persist(HISTORY_KEY, next);
    queryDirty = false;
    return true;
  }

  function sharedUrl(digits = precision()) {
    if (!conversion()) return null;
    const url = new URL(appRoot, location.origin);
    url.searchParams.set('q', query().trim());
    url.searchParams.set('p', String(digits));
    return url;
  }

  function replaceWithSharedUrl(digits = precision()) {
    const url = sharedUrl(digits);
    if (!url) return null;
    window.history.replaceState(window.history.state, '', url);
    return url;
  }

  function clearSharedUrl() {
    const url = new URL(location.href);
    if (!url.searchParams.has('q') && !url.searchParams.has('p')) return;
    url.searchParams.delete('q');
    url.searchParams.delete('p');
    window.history.replaceState(window.history.state, '', url);
  }

  function submit(event) {
    event.preventDefault();
    if (remember()) replaceWithSharedUrl();
    conversionInput?.blur();
  }

  function clearQuery() {
    setQuery('');
    setCopied(false);
    setLinkCopied(false);
    clearSharedUrl();
    queryDirty = false;
  }

  function chooseQuery(text) {
    setQuery(text);
    setLinkCopied(false);
    clearSharedUrl();
    queryDirty = false;
  }

  function chooseExampleQuery(text) {
    chooseQuery(text);
    remember(evaluate(text));
  }

  function chooseBrowseQuery(text) {
    const amount = text.match(/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)\s*(?:ft|foot|feet|')\s*(?:\d+(?:\.\d*)?|\.\d+)\s*(?:in(?:ch(?:es)?)?|")|(?:\d+(?::\d+)+(?:\.\d+)?)|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i);
    setBrowseSelection(amount ? { query: text, start: amount.index, end: amount[0].length } : null);
    chooseQuery(text);
    const go = () => {
      if (page() !== 'converter') {
        window.history.pushState(null, '', appRoot);
        handleLocationChange();
      }
      queueMicrotask(() => scrollToTop(true, quickReuseRef));
    };
    go();
  }

  function toggleCategory(category) {
    setExpanded(current => current.includes(category) ? [] : [category]);
  }

  function isCompatible(unit, category) {
    const from = selectedFrom();
    return !from ? !unit.outputOnly : from.symbol !== unit.symbol && (from.category === category || from.conversionGroup === 'pace-speed' && unit.conversionGroup === 'pace-speed');
  }

  function chooseUnit(unit, category) {
    const from = selectedFrom();
    if (!from) {
      setSelectedFrom({ ...unit, category });
      setSearch('');
      setExpanded([category]);
      scrollToTop();
      return;
    }
    if (!isCompatible(unit, category)) return;
    chooseBrowseQuery(symbolPairQuery(from, unit));
    setSelectedFrom(null);
  }

  function removeRecent(event, queryToRemove) {
    event.stopPropagation();
    const next = recentConversions().filter(item => item.query !== queryToRemove);
    setRecentConversions(next);
    persist(HISTORY_KEY, next);
  }

  function reusePinnedQuery(item) {
    reusePinnedPair(pins(), item, chooseBrowseQuery);
  }

  function removeLibraryRecent(queryToRemove) {
    const next = recentConversions().filter(item => item.query !== queryToRemove);
    setRecentConversions(next);
    persist(HISTORY_KEY, next);
  }

  function removeLibraryPin(pin) {
    const next = pins().filter(item => item.from !== pin.from || item.to !== pin.to || item.fromCategory !== pin.fromCategory || item.toCategory !== pin.toCategory);
    setPins(next);
    persist(PINS_KEY, next);
  }

  function reorderLibraryPin(index, direction) {
    const current = pins();
    const next = movePin(current, index, direction);
    if (next === current) return;
    setPins(next);
    persist(PINS_KEY, next);
  }

  function clearLibraryRecent() {
    setRecentConversions([]);
    persist(HISTORY_KEY, []);
  }

  async function install() {
    const prompt = installPrompt();
    if (!prompt) return;
    await prompt.prompt();
    setInstallPrompt(null);
  }

  function update() {
    dispatchEvent(new Event('humanunits:apply-update'));
  }

  function chooseTheme(value) {
    setThemePreference(value);
    setStorageError(!saveThemePreference(value));
    themePopover?.hidePopover();
    themeButton?.focus();
  }

  function positionThemePopover() {
    const bounds = themeButton?.getBoundingClientRect();
    if (!bounds || !themePopover) return;
    themePopover.style.setProperty('--theme-popover-top', `${bounds.bottom + 8}px`);
    themePopover.style.setProperty('--theme-popover-right', `${Math.max(8, document.body.clientWidth - bounds.right)}px`);
  }

  function swap() {
    const value = conversion();
    if (!value || value.to.outputOnly) return;
    const updateSharedUrl = new URLSearchParams(location.search).has('q');
    const amount = value.to.format === 'feet-inches'
      ? formatValue(value.result, value.to, false, 17)
      : value.clockStyle ? formatValue(value.result, value.to, true, 15) : String(value.result);
    setQuery(symbolPairQuery(value.to, value.from, amount));
    setLinkCopied(false);
    queryDirty = false;
    requestAnimationFrame(() => {
      remember();
      if (updateSharedUrl) replaceWithSharedUrl();
    });
  }

  function choosePrecision(value) {
    setPrecision(value);
    persist(PRECISION_KEY, value);
    setLinkCopied(false);
    if (new URLSearchParams(location.search).has('q')) replaceWithSharedUrl(value);
  }

  async function copy() {
    if (!resultText()) return;
    remember();
    try {
      await navigator.clipboard.writeText(resultText());
      setCopied(true);
      setCopyError(false);
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyError(true);
      clearTimeout(copyErrorTimer);
      copyErrorTimer = setTimeout(() => setCopyError(false), 4000);
    }
  }

  async function copyLink() {
    const url = replaceWithSharedUrl();
    if (!url) return;
    remember();
    try {
      await navigator.clipboard.writeText(url.href);
      setLinkCopied(true);
      setLinkCopyError(false);
      clearTimeout(linkCopiedTimer);
      linkCopiedTimer = setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      setLinkCopied(false);
      setLinkCopyError(true);
      clearTimeout(linkCopyErrorTimer);
      linkCopyErrorTimer = setTimeout(() => setLinkCopyError(false), 4000);
    }
  }

  function togglePin() {
    const value = conversion();
    if (!value) return;
    const pair = { from: value.from.symbol, to: value.to.symbol, fromCategory: value.from.category, toCategory: value.to.category, query: symbolPairQuery(value.from, value.to) };
    const exists = pins().some(item => item.from === pair.from && item.to === pair.to && item.fromCategory === pair.fromCategory && item.toCategory === pair.toCategory);
    const next = exists ? pins().filter(item => item.from !== pair.from || item.to !== pair.to || item.fromCategory !== pair.fromCategory || item.toCategory !== pair.toCategory) : prependPin(pins(), pair);
    setPins(next);
    persist(PINS_KEY, next);
  }

  const pinned = createMemo(() => {
    const value = conversion();
    return value && pins().some(item => item.from === value.from.symbol && item.to === value.to.symbol && item.fromCategory === value.from.category && item.toCategory === value.to.category);
  });
  const quickReuse = createMemo(() => quickReusePins(pins()));

  function persist(key, value) {
    const stored = save(key, value);
    setStorageError(!stored);
    return stored;
  }

  return <div class="app-shell" classList={{ 'convert-shell': page() === 'converter', 'dock-suppressed': dockSuppressed() }}>
    <header class="site-header">
      <a class="brand" href={appRoot} onClick={event => handleInternalLink(event, appRoot)} aria-label="Human Units home">
        <svg class="brand-mark" aria-hidden="true" viewBox="0 0 128 128"><rect width="128" height="128" rx="24"/><path d="M25 22v84M25 64c11-8 25-8 37 0M62 22v47c0 25 9 37 21 37 13 0 21-12 21-37V22" transform="translate(10.24 10.24) scale(.84)"/></svg>
        <span>Human Units</span>
      </a>
      <div class="header-actions">
        <nav class="desktop-primary-nav" aria-label="Primary">
          <a href={appRoot} onClick={event => handleInternalLink(event, appRoot)} aria-current={page() === 'converter' ? 'page' : undefined}>Convert</a>
          <a href={`${appRoot}#pairs`} onClick={event => handleInternalLink(event, `${appRoot}#pairs`)} aria-current={page() === 'pairs' ? 'page' : undefined}>Browse</a>
          <a href={`${appRoot}#library`} onClick={event => handleInternalLink(event, `${appRoot}#library`)} aria-current={page() === 'library' ? 'page' : undefined}>Library</a>
        </nav>
        <nav class="utility-nav" aria-label="Utility">
          <a href={`${appRoot}#about`} onClick={event => handleInternalLink(event, `${appRoot}#about`)} aria-current={page() === 'about' ? 'page' : undefined}>About</a>
        </nav>
        <button ref={themeButton} class="theme-toggle" type="button" popovertarget="theme-picker" aria-haspopup="dialog" aria-label={`Theme: ${themeLabel()}`} title={`Theme: ${themeLabel()}`} onClick={positionThemePopover}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <Show when={themePreference() === 'system'} fallback={<Show when={themePreference() === 'light'} fallback={<path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/>}><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Show>}>
              <rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>
            </Show>
          </svg>
        </button>
        <div ref={themePopover} id="theme-picker" class="theme-popover" popover="auto" role="dialog" aria-labelledby="theme-picker-title">
          <fieldset>
            <legend id="theme-picker-title">Theme</legend>
            <For each={themeOptions}>{option => <label>
              <input type="radio" name="theme" value={option.value} checked={themePreference() === option.value} onChange={() => chooseTheme(option.value)} />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>}</For>
          </fieldset>
        </div>
        <Show when={updateReady()} fallback={<Show when={installPrompt()}><button class="header-action" type="button" onClick={install}>Install</button></Show>}>
          <button class="header-action" type="button" onClick={update}>Update</button>
        </Show>
        <span class="sr-only" role="status"><Show when={updateReady()}>Update available.</Show></span>
      </div>
    </header>

    <Show when={storageError()}><p class="storage-warning" role="alert">This browser blocked local storage. Your pins, history, precision, and theme changes will not survive a reload.</p></Show>

    <main ref={mainRef} tabindex="-1" aria-labelledby={page() === 'pairs' ? 'browse-title' : `${page()}-title`} classList={{ 'convert-main': page() === 'converter' }}>
      <Show when={page() === 'converter'} fallback={<Show when={page() === 'pairs'} fallback={<Show when={page() === 'library'} fallback={<Show when={page() === 'about'} fallback={<LicensePage />}><AboutPage onNavigate={handleInternalLink} /></Show>}><LibraryPage pins={pins()} recents={recentConversions()} onReuse={chooseBrowseQuery} onReusePin={reusePinnedQuery} onMovePin={reorderLibraryPin} onUnpin={removeLibraryPin} onRemoveRecent={removeLibraryRecent} onClear={clearLibraryRecent} /></Show>}>
        <section class="browse-page" aria-labelledby="browse-title">
          <header class="secondary-page-heading">
            <h1 id="browse-title">Browse units</h1>
            <p>{unitCount} units across {catalog.length} categories</p>
          </header>

          <div class="browse-search"><label for="unit-search">Search units or categories</label><div class="browse-search-field"><input id="unit-search" type="search" value={search()} onInput={event => setSearch(event.currentTarget.value)} placeholder="Search…" autocomplete="off" /><Show when={search()}><button class="clear-search" type="button" onClick={() => setSearch('')} aria-label="Clear unit search"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10m0-10L5 15"/></svg></button></Show></div></div>
          <Show when={search().trim()}>
            <section class="search-results" aria-labelledby="search-results-title">
              <div class="browse-section-heading"><h2 id="search-results-title">Search results</h2><span aria-live="polite">{searchResults().length} units</span></div>
              <Show when={searchResults().length} fallback={<p class="empty">{selectedFrom() ? 'No compatible units' : 'No supported units or categories'} match “{search()}”.</p>}>
                <div class="result-grid"><For each={searchResults()}>{unit => <button type="button" onClick={() => chooseUnit(unit, unit.category)} aria-label={`${unit.name}, ${unit.symbol}, ${titleCase(unit.category)}`}><strong>{unit.symbol} <span>— {unit.name}</span></strong><small>{titleCase(unit.category)}</small></button>}</For></div>
              </Show>
            </section>
          </Show>

          <Show when={selectedFrom()}>{from => <section class="destination-picker" aria-labelledby="destination-title"><div class="selection-status" role="status"><span><strong>From: {from().name} ({from().symbol})</strong><small id="destination-title">Choose a destination unit</small></span><button type="button" onClick={() => { setSelectedFrom(null); setSearch(''); }}>Clear</button></div><Show when={!search().trim()}><div class="result-grid"><For each={compatibleUnits()}>{unit => <button type="button" onClick={() => chooseUnit(unit, from().category)}><strong>{unit.symbol} <span>— {unit.name}</span></strong><small>{titleCase(from().category)}</small></button>}</For></div></Show></section>}</Show>

          <Show when={!search().trim()}><Show when={!selectedFrom()}><section class="popular-pairs" aria-labelledby="popular-pairs-title">
            <div class="browse-section-heading"><h2 id="popular-pairs-title">Popular conversions</h2></div>
            <div class="compact-pairs"><For each={popularPairs}>{pair => <a href={appRoot} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); chooseBrowseQuery(pair.query); }} title={`${pair.from.name} to ${pair.to.name}`}><strong>{pair.from.symbol} <span aria-hidden="true">→</span> {pair.to.symbol}</strong></a>}</For></div>
          </section></Show>

          <Show when={!selectedFrom()}><section class="category-browser" aria-labelledby="categories-title">
            <div class="browse-section-heading"><h2 id="categories-title">All categories</h2><span>{catalog.length} categories</span></div>
            <For each={categorySections}>{([sectionName, groups]) => <section class="category-section" aria-labelledby={`section-${sectionName.replace(/\W/g, '-').toLowerCase()}`}><h3 id={`section-${sectionName.replace(/\W/g, '-').toLowerCase()}`}>{sectionName}</h3><div class="category-grid"><For each={groups}>{group => <article class="category-item" classList={{ expanded: expanded().includes(group.category) }}><button class="category-card" type="button" aria-expanded={expanded().includes(group.category)} onClick={() => toggleCategory(group.category)}><span><strong>{titleCase(group.category)}</strong><small>{group.units.length} units</small></span><span aria-hidden="true">{expanded().includes(group.category) ? '−' : '+'}</span></button><Show when={expanded().includes(group.category)}><div class="unit-panel"><p class="sr-only">Choose a unit from {titleCase(group.category)}. The first unit becomes the source; then choose a compatible destination.</p><div class="unit-chips"><For each={group.units}>{unit => <button type="button" classList={{ selected: selectedFrom()?.category === group.category && selectedFrom()?.symbol === unit.symbol, compatible: selectedFrom() && isCompatible(unit, group.category) }} disabled={!isCompatible(unit, group.category)} onClick={() => chooseUnit(unit, group.category)} aria-pressed={selectedFrom()?.category === group.category && selectedFrom()?.symbol === unit.symbol} title={unit.outputOnly ? `${unit.name} (result only)` : unit.name}><strong>{unit.symbol}</strong><span>{unit.name}{unit.outputOnly ? ' (result)' : ''}</span></button>}</For></div></div></Show></article>}</For></div></section>}</For>
          </section></Show>
          </Show>
        </section>
      </Show>}>
      <section class="hero" aria-label="Unit converter">
        <div class="converter-composer" classList={{ invalid: query().trim() && !conversion() }}>
          <form onSubmit={submit} class="converter" role="search">
            <h1 id="converter-title" class="converter-heading"><label for="conversion-input">What would you like to convert?</label></h1>
            <div class="input-wrap">
              <input ref={conversionInput} id="conversion-input" value={query()} onInput={event => { setQuery(event.currentTarget.value); setCopied(false); setLinkCopied(false); clearSharedUrl(); queryDirty = true; }} onBlur={() => { if (queryDirty) remember(); }} onKeyDown={event => { if (event.key === 'Escape' && query()) { event.preventDefault(); clearQuery(); } }}
                inputmode="text" enterkeyhint="done" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="10 km in miles" aria-describedby="input-hint" />
              <button class="clear-query" type="button" onClick={clearQuery} disabled={!query()} aria-label="Clear conversion input">
                <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10m0-10L5 15"/></svg>
              </button>
            </div>
            <p id="input-hint" class="hint">Try {examples.map((text, index) => <><button type="button" class="text-button" onClick={() => chooseExampleQuery(text)}>{text}</button>{index < examples.length - 1 ? ', ' : ''}</>)}</p>
          </form>

          <div class="result-card" classList={{ invalid: query().trim() && !conversion(), valid: Boolean(conversion()), 'precision-10': precision() === 10, 'precision-15': precision() === 15 }}>
            <div class="result-heading">
              <span>{conversion() ? conversion().from.category : 'Result'}</span>
              <div class="precision-control" role="group" aria-label="Significant digits"><span>Significant digits</span><For each={[6, 10, 15]}>{digits => <button type="button" classList={{ selected: precision() === digits }} aria-pressed={precision() === digits} onClick={() => choosePrecision(digits)}>{digits}</button>}</For></div>
            </div>
            <div ref={resultDisplay} class="result" aria-live="polite" aria-atomic="true">
              <Show when={conversion()} fallback={<span class="empty-result">{query().trim() ? 'Enter a complete conversion, such as 10 km in miles.' : 'Your result appears here.'}</span>}>
                <strong classList={{ 'compound-value': conversion().to.format === 'feet-inches' }}>{formatValue(conversion().result, conversion().to, conversion().clockStyle, precision())}</strong> <Show when={!conversion().to.formatIncludesUnit}><span>{conversion().to.symbol}</span></Show>
              </Show>
            </div>
            <Show when={conversion()}>
              <div class="actions">
                <button type="button" onClick={swap} aria-label="Swap units using full precision"><span aria-hidden="true">⇄</span> Swap</button>
                <button type="button" onClick={copy}><span aria-hidden="true"><svg class="button-icon" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></span> {copied() ? 'Copied!' : 'Copy result'}</button>
                <button type="button" onClick={copyLink}><span aria-hidden="true"><svg class="button-icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> {linkCopied() ? 'Link copied' : 'Copy link'}</button>
                <button type="button" onClick={togglePin} aria-pressed={pinned()}><span aria-hidden="true">{pinned() ? '★' : '☆'}</span> {pinned() ? 'Pinned' : 'Pin pair'}</button>
              </div>
              <Show when={copyError()}><p class="action-status" role="status">Could not copy the result. Check clipboard permission and try again.</p></Show>
              <Show when={linkCopyError()}><p class="action-status" role="status">Could not copy the link. Check clipboard permission and try again.</p></Show>
            </Show>
          </div>
        </div>
      </section>

      <Show when={quickReuse().length}>
        <section ref={quickReuseRef} class="quick-reuse" aria-labelledby="quick-reuse-title">
          <div class="quick-reuse-heading">
            <h2 id="quick-reuse-title">Quick Reuse</h2>
            <a href={`${appRoot}#library`} onClick={event => handleInternalLink(event, `${appRoot}#library`)}>View library</a>
          </div>
          <div class="quick-reuse-grid"><For each={quickReuse()}>{item => <button type="button" onClick={() => reusePinnedQuery(item)} aria-label={`Reuse pinned conversion ${item.from} to ${item.to}`}>
            <strong>{item.from} <span aria-hidden="true">→</span> {item.to}</strong>
          </button>}</For></div>
        </section>
      </Show>
      </Show>
    </main>

    <nav class="mobile-primary-nav" aria-label="Primary">
      <a href={appRoot} onClick={event => handleInternalLink(event, appRoot)} aria-current={page() === 'converter' ? 'page' : undefined}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8h14m0 0-3-3m3 3-3 3M20 16H6m0 0 3 3m-3-3 3-3"/></svg>
        <span>Convert</span>
      </a>
      <a href={`${appRoot}#pairs`} onClick={event => handleInternalLink(event, `${appRoot}#pairs`)} aria-current={page() === 'pairs' ? 'page' : undefined}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"/></svg>
        <span>Browse</span>
      </a>
      <a href={`${appRoot}#library`} onClick={event => handleInternalLink(event, `${appRoot}#library`)} aria-current={page() === 'library' ? 'page' : undefined}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4.5h12v15l-6-3.5-6 3.5z"/></svg>
        <span>Library</span>
      </a>
    </nav>
  </div>;
}
