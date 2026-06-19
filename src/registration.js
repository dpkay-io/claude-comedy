const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const PACKAGE_VERSION = require(path.join(PACKAGE_ROOT, 'package.json')).version;
const PLUGIN_NAME = 'claude-comedy';
const MARKETPLACE_NAME = `${PLUGIN_NAME}-local`;
const PLUGIN_ID = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;

const PLUGIN_RUNTIME_DIRS = ['.claude-plugin', 'hooks', 'src', 'skills'];
const PLUGIN_RUNTIME_FILES = ['package.json'];

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const DEFAULT_PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins');
const DEFAULT_SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');

const LEGACY_SYMLINK = path.join(CLAUDE_DIR, 'skills', PLUGIN_NAME);
const LEGACY_CACHE_DIR = path.join(DEFAULT_PLUGINS_DIR, 'cache', 'local', PLUGIN_NAME);

function paths() {
  const pluginsDir = process.env.CLAUDE_COMEDY_PLUGINS_DIR || DEFAULT_PLUGINS_DIR;
  const settingsPath = process.env.CLAUDE_COMEDY_SETTINGS_PATH || DEFAULT_SETTINGS_PATH;
  const cacheDir = path.join(pluginsDir, 'cache', MARKETPLACE_NAME, PLUGIN_NAME);
  const versionDir = path.join(cacheDir, PACKAGE_VERSION);
  const installedPath = path.join(pluginsDir, 'installed_plugins.json');
  const knownMarketplacesPath = path.join(pluginsDir, 'known_marketplaces.json');
  return { pluginsDir, settingsPath, cacheDir, versionDir, installedPath, knownMarketplacesPath };
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}

function isRegistered() {
  const { installedPath, versionDir } = paths();
  const installed = readJsonSafe(installedPath, { plugins: {} });
  const entries = installed.plugins?.[PLUGIN_ID];
  if (!entries?.length) return false;
  try {
    return fs.existsSync(path.join(versionDir, '.claude-plugin', 'plugin.json'));
  } catch {
    return false;
  }
}

function register() {
  if (isRegistered()) return { alreadyRegistered: true };

  cleanupLegacy();

  const { pluginsDir, settingsPath, cacheDir, versionDir, installedPath, knownMarketplacesPath } = paths();

  fs.mkdirSync(cacheDir, { recursive: true });
  removePath(versionDir);
  fs.mkdirSync(versionDir, { recursive: true });

  for (const dir of PLUGIN_RUNTIME_DIRS) {
    const src = path.join(PACKAGE_ROOT, dir);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(versionDir, dir), { recursive: true });
  }
  for (const file of PLUGIN_RUNTIME_FILES) {
    const src = path.join(PACKAGE_ROOT, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(versionDir, file));
  }

  const knownMarketplaces = readJsonSafe(knownMarketplacesPath, {});
  knownMarketplaces[MARKETPLACE_NAME] = {
    source: { source: 'directory', path: PACKAGE_ROOT },
    installLocation: PACKAGE_ROOT,
    lastUpdated: new Date().toISOString(),
  };
  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(knownMarketplacesPath, JSON.stringify(knownMarketplaces, null, 2));

  const installed = readJsonSafe(installedPath, { version: 2, plugins: {} });
  if (!installed.plugins) installed.plugins = {};
  installed.plugins[PLUGIN_ID] = [{
    scope: 'user',
    installPath: versionDir,
    version: PACKAGE_VERSION,
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  }];
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));

  const settings = readJsonSafe(settingsPath, {});
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
    source: { source: 'directory', path: PACKAGE_ROOT },
  };
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  settings.enabledPlugins[PLUGIN_ID] = true;
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  return { alreadyRegistered: false };
}

function unregister() {
  cleanupLegacy();

  const { settingsPath, cacheDir, installedPath, knownMarketplacesPath } = paths();
  let removed = false;

  const installed = readJsonSafe(installedPath, { version: 2, plugins: {} });
  if (installed.plugins?.[PLUGIN_ID]) {
    delete installed.plugins[PLUGIN_ID];
    fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));
    removed = true;
  }

  const knownMarketplaces = readJsonSafe(knownMarketplacesPath, {});
  if (knownMarketplaces[MARKETPLACE_NAME]) {
    delete knownMarketplaces[MARKETPLACE_NAME];
    fs.writeFileSync(knownMarketplacesPath, JSON.stringify(knownMarketplaces, null, 2));
  }

  const settings = readJsonSafe(settingsPath, {});
  if (settings.enabledPlugins?.[PLUGIN_ID]) {
    delete settings.enabledPlugins[PLUGIN_ID];
  }
  if (settings.extraKnownMarketplaces?.[MARKETPLACE_NAME]) {
    delete settings.extraKnownMarketplaces[MARKETPLACE_NAME];
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  removePath(cacheDir);

  return { removed };
}

function cleanupLegacy() {
  removePath(LEGACY_SYMLINK);
  removePath(LEGACY_CACHE_DIR);

  const { installedPath, settingsPath } = paths();
  const legacyId = `${PLUGIN_NAME}@local`;

  const installed = readJsonSafe(installedPath, { version: 2, plugins: {} });
  if (installed.plugins?.[legacyId]) {
    delete installed.plugins[legacyId];
    fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2));
  }

  const settings = readJsonSafe(settingsPath, {});
  if (settings.enabledPlugins?.[legacyId]) {
    delete settings.enabledPlugins[legacyId];
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }
}

function removePath(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // doesn't exist or can't remove — fine
  }
}

module.exports = { isRegistered, register, unregister, PLUGIN_ID, MARKETPLACE_NAME, PACKAGE_ROOT };
