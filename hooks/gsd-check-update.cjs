#!/usr/bin/env node
// Check for GSD updates in background, write result to cache
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const homeDir = os.homedir();
const cwd = process.cwd();
const cacheDir = path.join(homeDir, '.claude', 'cache');
const cacheFile = path.join(cacheDir, 'gsd-update-check.json');
const repoArtifacts = [
  path.join('.agents', 'repo.md'),
  path.join('.agents', 'contexts', 'state.md'),
  path.join('.agents', 'contexts', 'session-index.md')
];

// VERSION file locations (check project first, then global)
const projectVersionFile = path.join(cwd, '.claude', 'get-shit-done', 'VERSION');
const globalVersionFile = path.join(homeDir, '.claude', 'get-shit-done', 'VERSION');

const findGitRoot = (startDir) => {
  let current = startDir;
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
};

const emitRepoLocalBootstrapNote = () => {
  try {
    const projectRoot = findGitRoot(cwd);
    const presentArtifacts = repoArtifacts
      .map((relativePath) => path.join(projectRoot, relativePath))
      .filter((artifactPath) => fs.existsSync(artifactPath));

    if (presentArtifacts.length === 0) {
      return;
    }

    const lines = [
      'Repo-local supplements:',
      ...presentArtifacts.map((artifactPath) => `- ${artifactPath}`)
    ];

    process.stdout.write(`${lines.join('\n')}\n`);
  } catch (error) {
    // Silent fail to keep SessionStart non-blocking.
  }
};

const spawnUpdateCheck = () => {
  try {
    if (process.env.AGENTS_DISABLE_UPDATE_CHECK === '1') {
      return;
    }

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Debounce: don't check if we checked recently (last 24 hours)
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (cache.checked && (now - cache.checked) < 86400) {
          return;
        }
      } catch (e) {
        // Corrupted cache, proceed with check
      }
    }

    // Run check in background (spawn background process, windowsHide prevents console flash)
    const child = spawn(process.execPath, ['-e', `
      const fs = require('fs');
      const { execSync } = require('child_process');

      const cacheFile = ${JSON.stringify(cacheFile)};
      const projectVersionFile = ${JSON.stringify(projectVersionFile)};
      const globalVersionFile = ${JSON.stringify(globalVersionFile)};

      // Check project directory first (local install), then global
      let installed = '0.0.0';
      try {
        if (fs.existsSync(projectVersionFile)) {
          installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
        } else if (fs.existsSync(globalVersionFile)) {
          installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
        }
      } catch (e) {}

      let latest = null;
      try {
        latest = execSync('npm view get-shit-done-cc version', { encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();
      } catch (e) {}

      const result = {
        update_available: latest && installed !== latest,
        installed,
        latest: latest || 'unknown',
        checked: Math.floor(Date.now() / 1000)
      };

      fs.writeFileSync(cacheFile, JSON.stringify(result));
    `], {
      stdio: 'ignore',
      windowsHide: true,
      detached: true  // Required on Windows for proper process detachment
    });

    child.unref();
  } catch (error) {
    // Silent fail to keep SessionStart non-blocking.
  }
};

emitRepoLocalBootstrapNote();
spawnUpdateCheck();
