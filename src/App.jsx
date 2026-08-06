import { createMemo, createSignal, For, Show } from 'solid-js';
import { evaluate, formatNumber, pairQuery } from './conversion.js';

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
  const [query, setQuery] = createSignal('10 km in miles');
  const [history, setHistory] = createSignal(load(HISTORY_KEY));
  const [pins, setPins] = createSignal(load(PINS_KEY));
  const [copied, setCopied] = createSignal(false);
  const conversion = createMemo(() => evaluate(query));
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
      <span class="offline-note">Private · Offline-ready</span>
    </header>

    <main>
      <section class="hero" aria-labelledby="page-title">
        <p class="eyebrow">Say it naturally</p>
        <h1 id="page-title">Convert units without the busywork.</h1>
        <p class="intro">Type a value, its unit, and what you want it converted to.</p>

        <form onSubmit={submit} class="converter" role="search">
          <label for="conversion-input">What would you like to convert?</label>
          <div class="input-wrap">
            <input id="conversion-input" value={query()} onInput={event => { setQuery(event.currentTarget.value); setCopied(false); }}
              inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="input-hint" />
            <kbd aria-hidden="true">Enter</kbd>
          </div>
          <p id="input-hint" class="hint">Try {examples.map((text, index) => <><button type="button" class="text-button" onClick={() => setQuery(text)}>{text}</button>{index < examples.length - 1 ? ', ' : ''}</>)}</p>
        </form>

        <div class="result-card" classList={{ invalid: query().trim() && !conversion() }}>
          <div class="result-heading">
            <span>{conversion() ? conversion().from.category : 'Result'}</span>
            <Show when={conversion()}><span>{formatNumber(conversion().value)} {conversion().from.symbol}</span></Show>
          </div>
          <div class="result" aria-live="polite" aria-atomic="true">
            <Show when={conversion()} fallback={<span class="empty-result">Use a query like “10 km in miles”</span>}>
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
          <div class="section-title"><h2 id="pinned-title">Pinned pairs</h2><span>{pins().length}</span></div>
          <Show when={pins().length} fallback={<p class="empty">Pin the conversions you use most.</p>}>
            <ul><For each={pins()}>{item => <li><button onClick={() => setQuery(item.query)}><span>{item.from} → {item.to}</span><small>Convert</small></button></li>}</For></ul>
          </Show>
        </section>
        <section aria-labelledby="recent-title">
          <div class="section-title"><h2 id="recent-title">Recent</h2><Show when={history().length}><button class="clear" onClick={() => { setHistory([]); save(HISTORY_KEY, []); }}>Clear</button></Show></div>
          <Show when={history().length} fallback={<p class="empty">Press Enter to add a conversion here.</p>}>
            <ul><For each={history()}>{item => <li><button onClick={() => setQuery(item.query)}><span>{item.query}</span><strong>{item.result}</strong></button></li>}</For></ul>
          </Show>
        </section>
      </div>
    </main>

    <footer><span>Eight categories. Zero tracking.</span><span>MIT licensed</span></footer>
  </>;
}
