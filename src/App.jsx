import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { evaluate, formatNumber, pairQuery, supportedPairs } from './conversion.js';

const HISTORY_KEY = 'humanunits:history:v1';
const PINS_KEY = 'humanunits:pins:v1';
const examples = ['10 km in miles', '72 f to c', '5 lb to kg'];

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable. */ }
}

export default function App() {
  const [query, setQuery] = createSignal('');
  const [history, setHistory] = createSignal(load(HISTORY_KEY));
  const [pins, setPins] = createSignal(load(PINS_KEY));
  const [copied, setCopied] = createSignal(false);
  const [installPrompt, setInstallPrompt] = createSignal(null);
  const [updateReady, setUpdateReady] = createSignal(false);
  const catalog = supportedPairs();
  const popularPairs = catalog.flatMap(group => group.pairs.filter(pair => pair.popular)).filter((pair, index, pairs) =>
    index < pairs.findIndex(other => other.from.symbol === pair.to.symbol && other.to.symbol === pair.from.symbol)
  );
  const [selectedCategory, setSelectedCategory] = createSignal(catalog[0]?.category || '');
  const selectedGroup = createMemo(() => catalog.find(group => group.category === selectedCategory()) || catalog[0]);
  const [selectedFrom, setSelectedFrom] = createSignal(catalog[0]?.units[0]?.symbol || '');
  const [selectedTo, setSelectedTo] = createSignal(catalog[0]?.units[1]?.symbol || '');
  const [page, setPage] = createSignal(location.hash === '#pairs' ? 'pairs' : 'converter');
  const handleHashChange = () => setPage(location.hash === '#pairs' ? 'pairs' : 'converter');
  addEventListener('hashchange', handleHashChange);
  onCleanup(() => removeEventListener('hashchange', handleHashChange));
  onMount(() => {
    const offerInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const offerUpdate = () => setUpdateReady(true);
    addEventListener('beforeinstallprompt', offerInstall);
    addEventListener('humanunits:update-ready', offerUpdate);
    onCleanup(() => {
      removeEventListener('beforeinstallprompt', offerInstall);
      removeEventListener('humanunits:update-ready', offerUpdate);
    });
  });
  const conversion = createMemo(() => evaluate(query()));
  const resultText = createMemo(() => {
    const value = conversion();
    return value ? `${formatNumber(value.result)} ${value.to.symbol}` : '';
  });

  function remember(value = conversion()) {
    if (!value) return;
    const entry = { query: pairQuery(value.from, value.to, value.value), result: `${formatNumber(value.result)} ${value.to.symbol}` };
    const next = [entry, ...history().filter(item => item.query !== entry.query)].slice(0, 8);
    setHistory(next);
    save(HISTORY_KEY, next);
  }

  function submit(event) {
    event.preventDefault();
    remember();
  }

  function chooseQuery(text) {
    setQuery(text);
    remember(evaluate(text));
  }

  function chooseCategory(category) {
    const group = catalog.find(item => item.category === category);
    setSelectedCategory(category);
    setSelectedFrom(group?.units[0]?.symbol || '');
    setSelectedTo(group?.units[1]?.symbol || '');
  }

  function chooseFrom(symbol) {
    const group = selectedGroup();
    const from = group?.units.find(unit => unit.symbol === symbol);
    const compatibleTo = group?.units.find(unit => unit !== from && unit.conversionGroup === from?.conversionGroup);
    setSelectedFrom(symbol);
    if (!group?.units.some(unit => unit.symbol === selectedTo() && unit !== from && unit.conversionGroup === from?.conversionGroup)) setSelectedTo(compatibleTo?.symbol || '');
  }

  function chooseSelectedPair(event) {
    event.preventDefault();
    const group = selectedGroup();
    const from = group?.units.find(unit => unit.symbol === selectedFrom());
    const to = group?.units.find(unit => unit.symbol === selectedTo());
    if (from && to && from !== to && from.conversionGroup === to.conversionGroup) chooseQuery(`1 ${from.query} in ${to.query}`);
  }

  function removeRecent(event, queryToRemove) {
    event.stopPropagation();
    const next = history().filter(item => item.query !== queryToRemove);
    setHistory(next);
    save(HISTORY_KEY, next);
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
    setQuery(pairQuery(value.to, value.from, value.result));
    requestAnimationFrame(() => remember());
  }

  async function copy() {
    if (!resultText()) return;
    try {
      await navigator.clipboard.writeText(resultText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { setCopied(false); }
  }

  function togglePin() {
    const value = conversion();
    if (!value) return;
    const pair = { from: value.from.symbol, to: value.to.symbol, query: pairQuery(value.from, value.to) };
    const exists = pins().some(item => item.from === pair.from && item.to === pair.to);
    const next = exists ? pins().filter(item => item.from !== pair.from || item.to !== pair.to) : [pair, ...pins()].slice(0, 8);
    setPins(next);
    save(PINS_KEY, next);
  }

  const pinned = createMemo(() => {
    const value = conversion();
    return value && pins().some(item => item.from === value.from.symbol && item.to === value.to.symbol);
  });

  return <>
    <header class="site-header">
      <a class="brand" href={import.meta.env.BASE_PATH} aria-label="Human Units home"><span aria-hidden="true">HU</span> Human Units</a>
      <Show when={installPrompt()}><button class="install-button" type="button" onClick={install}>Install app</button></Show>
    </header>

    <main>
      <Show when={page() === 'converter'} fallback={
        <section class="pairs-page" aria-labelledby="pairs-title">
          <a class="back-link" href="#">← Converter</a>
          <h1 id="pairs-title">All conversion pairs</h1>

          <section class="popular-pairs" aria-labelledby="popular-pairs-title">
            <div class="pairs-section-heading"><h2 id="popular-pairs-title">Popular conversions</h2><span>{popularPairs.length} pairs</span></div>
            <div class="pair-grid"><For each={popularPairs}>{pair =>
              <a href="#" onClick={() => chooseQuery(pair.query)} title={`${pair.from.name} to ${pair.to.name}`}>
                <strong>{pair.from.symbol} <span aria-hidden="true">→</span> {pair.to.symbol}</strong>
                <small>{pair.from.name} to {pair.to.name}</small>
              </a>
            }</For></div>
          </section>

          <section class="pair-finder" aria-labelledby="pair-finder-title">
            <div class="pairs-section-heading"><div><h2 id="pair-finder-title">Every other pair</h2><p>Choose a category, then the two units.</p></div><span>{catalog.length} categories</span></div>
            <form onSubmit={chooseSelectedPair}>
              <label class="category-field">Category<select value={selectedCategory()} onChange={event => chooseCategory(event.currentTarget.value)}><For each={catalog}>{group => <option value={group.category}>{group.category}</option>}</For></select></label>
              <div class="unit-fields">
                <label>From<select value={selectedFrom()} onChange={event => chooseFrom(event.currentTarget.value)}><For each={selectedGroup()?.units}>{unit => <option value={unit.symbol}>{unit.name} ({unit.symbol})</option>}</For></select></label>
                <span aria-hidden="true">→</span>
                <label>To<select value={selectedTo()} onChange={event => setSelectedTo(event.currentTarget.value)}><For each={selectedGroup()?.units}>{unit => <option value={unit.symbol} disabled={unit.symbol === selectedFrom() || unit.conversionGroup !== selectedGroup()?.units.find(item => item.symbol === selectedFrom())?.conversionGroup}>{unit.name} ({unit.symbol})</option>}</For></select></label>
              </div>
              <button class="use-pair" type="submit" disabled={selectedFrom() === selectedTo()}>Use this pair <span aria-hidden="true">→</span></button>
            </form>
          </section>
        </section>
      }>
      <section class="hero" aria-label="Unit converter">
        <form onSubmit={submit} class="converter" role="search">
          <div class="converter-heading"><label for="conversion-input">What would you like to convert?</label><a href="#pairs">Browse all pairs <span aria-hidden="true">→</span></a></div>
          <div class="input-wrap">
            <input id="conversion-input" value={query()} onInput={event => { setQuery(event.currentTarget.value); setCopied(false); }}
              inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="10 km in miles" aria-describedby="input-hint" />
          </div>
          <p id="input-hint" class="hint">Try {examples.map((text, index) => <><button type="button" class="text-button" onClick={() => chooseQuery(text)}>{text}</button>{index < examples.length - 1 ? ', ' : ''}</>)}</p>
        </form>

        <div class="result-card" classList={{ invalid: query().trim() && !conversion() }}>
          <div class="result-heading">
            <span>{conversion() ? conversion().from.category : 'Result'}</span>
            <Show when={conversion()}><span>{formatNumber(conversion().value)} {conversion().from.symbol}</span></Show>
          </div>
          <div class="result" aria-live="polite" aria-atomic="true">
            <Show when={conversion()} fallback={<span class="empty-result">Your result appears here.</span>}>
              <strong>{formatNumber(conversion().result)}</strong> <span>{conversion().to.symbol}</span>
            </Show>
          </div>
          <Show when={conversion()}>
            <div class="actions">
              <button type="button" onClick={swap}><span aria-hidden="true">⇄</span> Swap</button>
              <button type="button" onClick={copy}><span aria-hidden="true">□</span> {copied() ? 'Copied!' : 'Copy result'}</button>
              <button type="button" onClick={togglePin} aria-pressed={pinned()}><span aria-hidden="true">{pinned() ? '★' : '☆'}</span> {pinned() ? 'Pinned' : 'Pin pair'}</button>
            </div>
          </Show>
        </div>
      </section>

      <div class="collections">
        <section aria-labelledby="pinned-title">
          <div class="section-title"><h2 id="pinned-title">Pinned pairs <small>Saved on this device</small></h2><span>{pins().length}</span></div>
          <Show when={pins().length} fallback={<p class="empty">Pin the conversions you use most.</p>}>
            <ul><For each={pins()}>{item => <li><button onClick={() => chooseQuery(item.query)}><span>{item.from} → {item.to}</span><small>Convert</small></button></li>}</For></ul>
          </Show>
        </section>
        <section aria-labelledby="recent-title">
          <div class="section-title"><h2 id="recent-title">Recent</h2><Show when={history().length}><button class="clear" onClick={() => { setHistory([]); save(HISTORY_KEY, []); }}>Clear</button></Show></div>
          <Show when={history().length} fallback={<p class="empty">Press Enter to add a conversion here.</p>}>
            <ul><For each={history()}>{item => <li class="recent-item"><button onClick={() => chooseQuery(item.query)}><span>{item.query}</span><strong>{item.result}</strong></button><button class="remove-recent" type="button" onClick={event => removeRecent(event, item.query)} aria-label={`Remove ${item.query} from recent conversions`}><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 4 8 8m0-8-8 8"/></svg></button></li>}</For></ul>
          </Show>
        </section>
      </div>
      </Show>
    </main>

    <footer><span>Private · Works offline · No tracking</span><span>{catalog.length} categories · MIT licensed</span></footer>
    <Show when={updateReady()}><aside class="update-notice" role="status"><span><strong>Update ready</strong> Refresh to use the latest version.</span><button type="button" onClick={() => location.reload()}>Refresh</button></aside></Show>
  </>;
}
