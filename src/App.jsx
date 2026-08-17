import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { evaluate, formatValue, supportedUnits } from './conversion.js';

const HISTORY_KEY = 'humanunits:history:v1';
const PINS_KEY = 'humanunits:pins:v1';
const PRECISION_KEY = 'humanunits:precision:v1';
const examples = ['10 km in miles', '72 f to c', '5 lb to kg'];
const appRoot = import.meta.env.BASE_PATH === './' ? '/' : import.meta.env.BASE_PATH;
const licensePath = `${appRoot}license`;
const symbolPairQuery = (from, to, value = 1) => `${value} ${from.symbol} in ${to.symbol}`;

function AboutPage(props) {
  return <section class="about-page" aria-labelledby="about-title">
    <h1 id="about-title">About Human Units</h1>
    <section><h2>What it is</h2><p>Human Units is a fast unit converter designed around natural-language input.</p></section>
    <section><h2>Privacy</h2><p>It works offline, requires no account, and includes no tracking. Recent conversions and pinned pairs are stored only in local storage on this device.</p></section>
    <section><h2>Conversion coverage</h2><p>Explore many everyday, scientific, computing, and specialist measurement categories. Where ambiguity matters, the catalog distinguishes units such as US and Imperial measurements.</p></section>
    <section><h2>Accuracy</h2><p>Most ordinary conversions are deterministic. Quantities such as temperature, fuel economy, and calendar durations receive the special handling their definitions require.</p></section>
    <section><h2>Open source</h2><p>Human Units is open-source software provided under the <a href={licensePath} onClick={event => props.onNavigate(event, licensePath)}>MIT License</a>.</p></section>
    <section><h2>Install</h2><p>You can install Human Units as a PWA when your browser and device support it. The Install action appears in the header when installation is available.</p></section>
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
    <header class="library-heading">
      <p class="eyebrow">Your conversions</p>
      <h1 id="library-title">Library</h1>
      <p>Pinned pairs and recent conversions are stored on this device.</p>
    </header>

    <div class="library-grid">
      <section class="library-panel" aria-labelledby="library-pins-title">
        <div class="library-section-heading">
          <div><h2 id="library-pins-title">Pinned Pairs</h2></div>
          <span class="library-count" aria-label={`${props.pins.length} of 8 pinned pairs`}>{props.pins.length} / 8</span>
        </div>
        <Show when={props.pins.length} fallback={<p class="library-empty">Pin a conversion pair to keep it close at hand.</p>}>
          <ul class="library-list"><For each={props.pins}>{item => <li class="library-item">
            <button class="library-reuse" type="button" onClick={() => props.onReusePin(item)} aria-label={`Convert ${item.from} to ${item.to}`}>
              <span class="library-pair">{item.from} <span aria-hidden="true">→</span> {item.to}</span>
              <small>Convert</small>
            </button>
            <button class="library-remove" type="button" onClick={() => props.onUnpin(item.from, item.to)} aria-label={`Unpin ${item.from} to ${item.to}`} title="Unpin pair">
              <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 4 8 8m0-8-8 8"/></svg>
            </button>
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

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable. */ }
}

function loadPrecision() {
  try {
    const value = JSON.parse(localStorage.getItem(PRECISION_KEY));
    return [6, 10, 15].includes(value) ? value : 6;
  } catch { return 6; }
}

export default function App() {
  const [query, setQuery] = createSignal('');
  const [recentConversions, setRecentConversions] = createSignal(load(HISTORY_KEY).map(entry => {
    const value = evaluate(entry.query);
    return value ? { ...entry, query: symbolPairQuery(value.from, value.to, formatValue(value.value, value.from, value.clockStyle)) } : entry;
  }));
  const [pins, setPins] = createSignal(load(PINS_KEY).map(item => ({
    ...item,
    query: `1 ${item.from} in ${item.to}`
  })));
  const [copied, setCopied] = createSignal(false);
  const [precision, setPrecision] = createSignal(loadPrecision());
  const [installPrompt, setInstallPrompt] = createSignal(null);
  const [updateReady, setUpdateReady] = createSignal(false);
  const catalog = supportedUnits();
  const unitCount = catalog.reduce((total, group) => total + group.units.length, 0);
  const popularPairSymbols = [['km', 'mi'], ['°C', '°F'], ['kg', 'lb'], ['cm', 'in'], ['L', 'gal (US)'], ['min/mi', 'min/km']];
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
  let queryDirty = false;
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
  const pageFromLocation = () => location.pathname.replace(/\/$/, '').endsWith('/license') ? 'license' : location.hash === '#pairs' ? 'pairs' : location.hash === '#library' ? 'library' : location.hash === '#about' ? 'about' : 'converter';
  const [page, setPage] = createSignal(pageFromLocation());
  const handleLocationChange = () => setPage(pageFromLocation());
  const handleInternalLink = (event, url) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, '', url);
    handleLocationChange();
    scrollTo({ top: 0, behavior: 'auto' });
  };
  const handleHashChange = handleLocationChange;
  addEventListener('hashchange', handleHashChange);
  addEventListener('popstate', handleLocationChange);
  onCleanup(() => {
    removeEventListener('hashchange', handleHashChange);
    removeEventListener('popstate', handleLocationChange);
  });
  onMount(() => {
    const offerInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const offerUpdate = () => setUpdateReady(true);
    const installed = () => setInstallPrompt(null);
    addEventListener('beforeinstallprompt', offerInstall);
    addEventListener('appinstalled', installed);
    addEventListener('humanunits:update-ready', offerUpdate);
    if (matchMedia('(pointer: fine)').matches) conversionInput?.focus({ preventScroll: true });
    onCleanup(() => {
      removeEventListener('beforeinstallprompt', offerInstall);
      removeEventListener('appinstalled', installed);
      removeEventListener('humanunits:update-ready', offerUpdate);
    });
  });
  const conversion = createMemo(() => evaluate(query()));
  const resultText = createMemo(() => {
    const value = conversion();
    return value ? `${formatValue(value.result, value.to, value.clockStyle, precision())} ${value.to.symbol}` : '';
  });

  function fitResult() {
    cancelAnimationFrame(resultFitFrame);
    resultFitFrame = requestAnimationFrame(() => {
      const number = resultDisplay?.querySelector('strong');
      const unit = resultDisplay?.querySelector(':scope > span:not(.empty-result)');
      if (!number || !unit) return;

      number.style.fontSize = '';
      unit.style.fontSize = '';
      const styles = getComputedStyle(resultDisplay);
      const available = resultDisplay.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      const numberSize = parseFloat(getComputedStyle(number).fontSize);
      const unitSize = parseFloat(getComputedStyle(unit).fontSize);
      const required = number.getBoundingClientRect().width + unit.getBoundingClientRect().width + gap;
      if (required <= available || !Number.isFinite(required)) return;

      const scale = available / required * 0.98;
      number.style.fontSize = `${numberSize * scale}px`;
      unit.style.fontSize = `${unitSize * scale}px`;
    });
  }

  createEffect(() => {
    resultText();
    queueMicrotask(fitResult);
  });

  onMount(() => {
    if (!resultDisplay || !('ResizeObserver' in window)) return;
    let previousWidth = resultDisplay.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = resultDisplay.clientWidth;
      if (width === previousWidth) return;
      previousWidth = width;
      fitResult();
    });
    observer.observe(resultDisplay);
    onCleanup(() => {
      observer.disconnect();
      cancelAnimationFrame(resultFitFrame);
    });
  });

  createEffect(() => {
    const selection = browseSelection();
    if (page() !== 'converter' || !selection) return;
    setBrowseSelection(null);
    queueMicrotask(() => {
      if (!conversionInput || conversionInput.value !== selection.query) return;
      conversionInput.focus();
      conversionInput.setSelectionRange(selection.start, selection.end);
      // Browsers normally scroll the selection end into view. Browse queries can
      // be wider than the field, so put the selected amount back on screen.
      conversionInput.scrollLeft = 0;
    });
  });

  function remember(value = conversion()) {
    if (!value) return false;
    const entry = { query: symbolPairQuery(value.from, value.to, formatValue(value.value, value.from, value.clockStyle, precision())), result: `${formatValue(value.result, value.to, value.clockStyle, precision())} ${value.to.symbol}` };
    const next = [entry, ...recentConversions().filter(item => item.query !== entry.query)].slice(0, 8);
    setRecentConversions(next);
    save(HISTORY_KEY, next);
    queryDirty = false;
    return true;
  }

  function submit(event) {
    event.preventDefault();
    remember();
  }

  function clearQuery() {
    setQuery('');
    setCopied(false);
    queryDirty = false;
  }

  function chooseQuery(text) {
    setQuery(text);
    queryDirty = false;
  }

  function chooseExampleQuery(text) {
    chooseQuery(text);
    remember(evaluate(text));
  }

  function chooseBrowseQuery(text) {
    const amount = text.match(/^[+-]?(?:(?:\d+(?::\d+)+(?:\.\d+)?)|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i);
    setBrowseSelection(amount ? { query: text, start: amount.index, end: amount[0].length } : null);
    chooseQuery(text);
    if (page() !== 'converter') {
      window.history.pushState(null, '', appRoot);
      handleLocationChange();
    }
    scrollTo({ top: 0, behavior: 'auto' });
  }

  function toggleCategory(category) {
    setExpanded(current => current.includes(category) ? [] : [category]);
  }

  function isCompatible(unit, category) {
    const from = selectedFrom();
    return !from || (from.symbol !== unit.symbol && (from.category === category || from.conversionGroup === 'pace-speed' && unit.conversionGroup === 'pace-speed'));
  }

  function chooseUnit(unit, category) {
    const from = selectedFrom();
    if (!from) {
      setSelectedFrom({ ...unit, category });
      setSearch('');
      setExpanded([category]);
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
    save(HISTORY_KEY, next);
  }

  function promotePin(item) {
    const current = pins();
    const index = current.findIndex(pin => pin.from === item.from && pin.to === item.to);
    if (index <= 0) return;
    const next = [current[index], ...current.slice(0, index), ...current.slice(index + 1)];
    setPins(next);
    save(PINS_KEY, next);
  }

  function reusePinnedQuery(item) {
    promotePin(item);
    chooseBrowseQuery(item.query);
  }

  function removeLibraryRecent(queryToRemove) {
    const next = recentConversions().filter(item => item.query !== queryToRemove);
    setRecentConversions(next);
    save(HISTORY_KEY, next);
  }

  function removeLibraryPin(from, to) {
    const next = pins().filter(item => item.from !== from || item.to !== to);
    setPins(next);
    save(PINS_KEY, next);
  }

  function clearLibraryRecent() {
    setRecentConversions([]);
    save(HISTORY_KEY, []);
  }

  async function install() {
    const prompt = installPrompt();
    if (!prompt) return;
    await prompt.prompt();
    setInstallPrompt(null);
  }

  function swap() {
    const value = conversion();
    if (!value) return;
    const amount = value.clockStyle ? formatValue(value.result, value.to, true, 15) : String(value.result);
    setQuery(symbolPairQuery(value.to, value.from, amount));
    queryDirty = false;
    requestAnimationFrame(() => remember());
  }

  function choosePrecision(value) {
    setPrecision(value);
    save(PRECISION_KEY, value);
  }

  async function copy() {
    if (!resultText()) return;
    remember();
    try {
      await navigator.clipboard.writeText(resultText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { setCopied(false); }
  }

  function togglePin() {
    const value = conversion();
    if (!value) return;
    const pair = { from: value.from.symbol, to: value.to.symbol, query: symbolPairQuery(value.from, value.to) };
    const exists = pins().some(item => item.from === pair.from && item.to === pair.to);
    const next = exists ? pins().filter(item => item.from !== pair.from || item.to !== pair.to) : [pair, ...pins()].slice(0, 8);
    setPins(next);
    save(PINS_KEY, next);
  }

  const pinned = createMemo(() => {
    const value = conversion();
    return value && pins().some(item => item.from === value.from.symbol && item.to === value.to.symbol);
  });
  const quickReuse = createMemo(() => pins().slice(0, 3));

  return <div class="app-shell" classList={{ 'convert-shell': page() === 'converter' }}>
    <header class="site-header">
      <a class="brand" href={appRoot} onClick={event => handleInternalLink(event, appRoot)} aria-label="Human Units home">
        <svg class="brand-mark" aria-hidden="true" viewBox="0 0 36 36"><rect width="36" height="36" rx="7"/><path d="M8.5 9v18M8.5 18h8M16.5 9v18M21 9v11.5c0 4.2 2.2 6.5 5.4 6.5s5.1-2.3 5.1-6.5V9M5.5 13h3M5.5 23h3"/></svg>
        <span>Human Units</span>
      </a>
      <div class="header-actions">
        <nav aria-label="Primary navigation">
          <a href={appRoot} onClick={event => handleInternalLink(event, appRoot)} aria-current={page() === 'converter' ? 'page' : undefined}>Convert</a>
          <a href={`${appRoot}#pairs`} onClick={event => handleInternalLink(event, `${appRoot}#pairs`)} aria-current={page() === 'pairs' ? 'page' : undefined}>Browse</a>
          <a href={`${appRoot}#library`} onClick={event => handleInternalLink(event, `${appRoot}#library`)} aria-current={page() === 'library' ? 'page' : undefined}>Library</a>
          <a href={`${appRoot}#about`} onClick={event => handleInternalLink(event, `${appRoot}#about`)} aria-current={page() === 'about' ? 'page' : undefined}>About</a>
        </nav>
        <Show when={installPrompt()}><button class="install-button" type="button" onClick={install}>Install</button></Show>
      </div>
    </header>

    <main classList={{ 'convert-main': page() === 'converter' }}>
      <Show when={page() === 'converter'} fallback={<Show when={page() === 'pairs'} fallback={<Show when={page() === 'library'} fallback={<Show when={page() === 'about'} fallback={<LicensePage />}><AboutPage onNavigate={handleInternalLink} /></Show>}><LibraryPage pins={pins()} recents={recentConversions()} onReuse={chooseBrowseQuery} onReusePin={reusePinnedQuery} onUnpin={removeLibraryPin} onRemoveRecent={removeLibraryRecent} onClear={clearLibraryRecent} /></Show>}>
        <section class="browse-page" aria-labelledby="browse-title">
          <div class="browse-heading">
            <div><h1 id="browse-title">Browse supported units</h1><p>Explore the units and measurement categories supported by Human Units.</p></div>
            <strong>{unitCount} units across {catalog.length} categories</strong>
          </div>

          <div class="browse-search"><label for="unit-search">Search units or categories</label><div class="browse-search-field"><input id="unit-search" type="search" value={search()} onInput={event => setSearch(event.currentTarget.value)} placeholder="Search units or categories…" autocomplete="off" /><Show when={search()}><button class="clear-search" type="button" onClick={() => setSearch('')} aria-label="Clear unit search"><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10m0-10L5 15"/></svg></button></Show></div></div>
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
            <For each={categorySections}>{([sectionName, groups]) => <section class="category-section" aria-labelledby={`section-${sectionName.replace(/\W/g, '-').toLowerCase()}`}><h3 id={`section-${sectionName.replace(/\W/g, '-').toLowerCase()}`}>{sectionName}</h3><div class="category-grid"><For each={groups}>{group => <article class="category-item"><button class="category-card" type="button" aria-expanded={expanded().includes(group.category)} onClick={() => toggleCategory(group.category)}><span><strong>{titleCase(group.category)}</strong><small>{group.units.length} units</small></span><span aria-hidden="true">{expanded().includes(group.category) ? '−' : '+'}</span></button><Show when={expanded().includes(group.category)}><div class="unit-panel"><p class="sr-only">Choose a unit from {titleCase(group.category)}. The first unit becomes the source; then choose a compatible destination.</p><div class="unit-chips"><For each={group.units}>{unit => <button type="button" classList={{ selected: selectedFrom()?.category === group.category && selectedFrom()?.symbol === unit.symbol, compatible: selectedFrom() && isCompatible(unit, group.category) }} disabled={selectedFrom() && !isCompatible(unit, group.category) && !(selectedFrom()?.category === group.category && selectedFrom()?.symbol === unit.symbol)} onClick={() => chooseUnit(unit, group.category)} aria-pressed={selectedFrom()?.category === group.category && selectedFrom()?.symbol === unit.symbol} title={unit.name}><strong>{unit.symbol}</strong><span>{unit.name}</span></button>}</For></div></div></Show></article>}</For></div></section>}</For>
          </section></Show>
          </Show>
        </section>
      </Show>}>
      <section class="hero" aria-label="Unit converter">
        <div class="converter-composer" classList={{ invalid: query().trim() && !conversion() }}>
          <form onSubmit={submit} class="converter" role="search">
            <div class="converter-heading"><label for="conversion-input">What would you like to convert?</label></div>
            <div class="input-wrap">
              <input ref={conversionInput} id="conversion-input" value={query()} onInput={event => { setQuery(event.currentTarget.value); setCopied(false); queryDirty = true; }} onBlur={() => { if (queryDirty) remember(); }} onKeyDown={event => { if (event.key === 'Escape' && query()) { event.preventDefault(); clearQuery(); } }}
                inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="10 km in miles" aria-describedby="input-hint" />
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
                <strong>{formatValue(conversion().result, conversion().to, conversion().clockStyle, precision())}</strong> <span>{conversion().to.symbol}</span>
              </Show>
            </div>
            <Show when={conversion()}>
              <div class="actions">
                <button type="button" onClick={swap} aria-label="Swap units using full precision"><span aria-hidden="true">⇄</span> Swap</button>
                <button type="button" onClick={copy}><span aria-hidden="true">□</span> {copied() ? 'Copied!' : 'Copy result'}</button>
                <button type="button" onClick={togglePin} aria-pressed={pinned()}><span aria-hidden="true">{pinned() ? '★' : '☆'}</span> {pinned() ? 'Pinned' : 'Pin pair'}</button>
              </div>
            </Show>
          </div>
        </div>
      </section>

      <Show when={quickReuse().length}>
        <section class="quick-reuse" aria-labelledby="quick-reuse-title">
          <div class="quick-reuse-heading">
            <h2 id="quick-reuse-title">Quick Reuse</h2>
            <a href={`${appRoot}#library`} onClick={event => handleInternalLink(event, `${appRoot}#library`)}>View library</a>
          </div>
          <div class="quick-reuse-grid"><For each={quickReuse()}>{item => <button type="button" onClick={() => reusePinnedQuery(item)} aria-label={`Reuse pinned conversion ${item.from} to ${item.to}`}>
            <small>Pinned</small>
            <strong>{item.from} <span aria-hidden="true">→</span> {item.to}</strong>
          </button>}</For></div>
        </section>
      </Show>
      </Show>
    </main>

    <footer><span>Private · Works offline · No tracking</span><a href={licensePath} onClick={event => handleInternalLink(event, licensePath)}>MIT licensed</a></footer>
    <Show when={updateReady()}><aside class="update-notice" role="status"><span><strong>Update ready</strong> Refresh to use the latest version.</span><button type="button" onClick={() => dispatchEvent(new Event('humanunits:apply-update'))}>Refresh</button></aside></Show>
  </div>;
}
