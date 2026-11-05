import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../dist/analytics.js', import.meta.url), 'utf8')
  .replace(/^import \{[^\n]+\} from '\.\/analytics-config\.js';\n/, '');
const index = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const about = readFileSync(new URL('../dist/about.html', import.meta.url), 'utf8');
const creator = readFileSync(new URL('../dist/ricardo-roza-rui.html', import.meta.url), 'utf8');
const config = readFileSync(new URL('../dist/analytics-config.js', import.meta.url), 'utf8');

const WEBSITE_ID = '12345678-1234-1234-1234-123456789abc';
function renderTracker({ id = WEBSITE_ID, hostname = 'dreamer-archalo.github.io', gpc = false, dnt = '0' } = {}) {
  const scripts = [];
  const events = [];
  const observers = [];
  const play = { disabled: false, dataset: {}, listeners: {}, addEventListener(type, cb) { this.listeners[type] = cb; } };
  const playing = { hidden: true };
  const document = {
    head: { append(script) { scripts.push(script); } },
    getElementById(id) { return id === 'playBtn' ? play : id === 'playingUI' ? playing : null; },
    createElement(tag) {
      assert.equal(tag, 'script');
      return { dataset: {}, listeners: {}, addEventListener(type, cb) { this.listeners[type] = cb; } };
    },
  };
  class MutationObserver {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe(element, options) { assert.equal(element, playing); assert.deepEqual(Array.from(options.attributeFilter), ['hidden']); }
    disconnect() { this.disconnected = true; }
  }
  const window = {};
  vm.runInNewContext(source, {
    ANALYTICS_WEBSITE_ID: id,
    ANALYTICS_SCRIPT_URL: 'https://cloud.umami.is/script.js',
    document, window, location: { hostname },
    navigator: { globalPrivacyControl: gpc, doNotTrack: dnt }, MutationObserver,
  });
  return { scripts, events, play, playing, observers, window };
}

assert.match(config, /ANALYTICS_WEBSITE_ID\s*=\s*''/, 'Must remain disabled until the owner supplies an Umami website ID');
for (const html of [index, about, creator]) {
  assert.match(html, /src="\.\/analytics\.js"/, 'Every public page should load the optional tracker');
  assert.match(html, /href="\.\/privacy\.html"/, 'Privacy information should be accessible');
}
assert.match(index, /event\.target\?\.dataset\?\.analyticsOptional==='true'/, 'An analytics connection error must not become a fatal startup error');

assert.equal(renderTracker({ id: '' }).scripts.length, 0, 'The default empty ID must not load a third-party script');
assert.equal(renderTracker({ hostname: 'localhost' }).scripts.length, 0, 'Local development must be excluded');
assert.equal(renderTracker({ gpc: true }).scripts.length, 0, 'Global Privacy Control must be respected');
assert.equal(renderTracker({ dnt: '1' }).scripts.length, 0, 'Do Not Track must be respected');

const t = renderTracker();
assert.equal(t.scripts.length, 1);
const script = t.scripts[0];
assert.equal(script.src, 'https://cloud.umami.is/script.js');
assert.equal(script.dataset.websiteId, WEBSITE_ID);
assert.equal(script.dataset.domains, 'dreamer-archalo.github.io');
assert.equal(script.dataset.analyticsOptional, 'true');
t.play.listeners.click();
t.play.listeners.click();
t.playing.hidden = false;
t.observers[0].cb();
assert.equal(t.observers[0].disconnected, true);
t.window.umami = { track(name) { t.events.push(name); } };
script.listeners.load();
assert.deepEqual(t.events, ['game_load_requested', 'game_entered'], 'Track exactly one load request and one actual game entry');
console.log('Visitor analytics: inactive by default, privacy signals respected, events are optional and de-duplicated.');
