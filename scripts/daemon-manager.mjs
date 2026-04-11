#!/usr/bin/env node
/**
 * daemon-manager.mjs
 * 
 * Lightweight local Background Daemon Manager for periodic maintenance.
 * Subcommands:
 *   start   - Spawns the daemon locally in the background
 *   stop    - Kills the daemon process
 *   status  - Shows if the daemon is running
 *   add-project - Adds a project root to the watch set
 *   remove-project - Removes a project root from the watch set
 *   list-projects - Prints the watched project roots
 *   run     - Internal detached process loop
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(__filename), '..');

const pidsDir = path.join(AGENTS_ROOT, '.pids');
const pidFile = path.join(pidsDir, 'daemon.pid');
const logFile = path.join(pidsDir, 'daemon.log');
const stateFile = path.join(pidsDir, 'daemon-state.json');
const syncScript = path.join(AGENTS_ROOT, 'scripts', 'memory-sync-tools.mjs');
const artifactAutomationScript = path.join(AGENTS_ROOT, 'scripts', 'rpi-artifact-automation.mjs');

const ONE_HOUR_MS = 60 * 60 * 1000;
const ARTIFACT_SCAN_INTERVAL_MS = 15 * 1000;

const log = (msg) => {
  const ts = new Date().toISOString();
  fs.appendFileSync(logFile, `[${ts}] ${msg}\n`);
};

const getStatus = () => {
  if (!fs.existsSync(pidFile)) return { running: false, pid: null };
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (isNaN(pid)) return { running: false, pid: null };
  try {
    process.kill(pid, 0); // Check if process exists
    return { running: true, pid };
  } catch (e) {
    if (e.code === 'ESRCH') {
      // Process is dead, clean up pid
      fs.unlinkSync(pidFile);
      return { running: false, pid: null };
    }
    throw e;
  }
};

const loadState = () => {
  if (!fs.existsSync(stateFile)) {
    return { projectRoots: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const projectRoots = Array.isArray(parsed.projectRoots)
      ? parsed.projectRoots.map((item) => path.resolve(item))
      : parsed.projectRoot
        ? [path.resolve(parsed.projectRoot)]
        : [];
    return { ...parsed, projectRoots };
  } catch {
    return { projectRoots: [] };
  }
};

const normalizeProjectRoots = (input) => {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return [...new Set(values.map((item) => path.resolve(item)).filter(Boolean))].sort();
};

const saveState = (state) => {
  if (!fs.existsSync(pidsDir)) {
    fs.mkdirSync(pidsDir, { recursive: true });
  }

  const projectRoots = normalizeProjectRoots(state.projectRoots ?? state.projectRoot);
  fs.writeFileSync(stateFile, JSON.stringify({
    ...state,
    projectRoots,
    projectRoot: projectRoots[0] ?? null
  }, null, 2));
};

const projectArgOrCwd = (value) => path.resolve(value || process.env.AGENTS_PROJECT_ROOT || process.cwd());

const addProjectToState = (projectRoot) => {
  const state = loadState();
  const projectRoots = normalizeProjectRoots([...(state.projectRoots ?? []), projectRoot]);
  saveState({ ...state, projectRoots });
  return projectRoots;
};

const removeProjectFromState = (projectRoot) => {
  const state = loadState();
  const normalized = path.resolve(projectRoot);
  const projectRoots = normalizeProjectRoots((state.projectRoots ?? []).filter((item) => path.resolve(item) !== normalized));
  saveState({ ...state, projectRoots });
  return projectRoots;
};

const start = () => {
  const status = getStatus();
  const projectRoot = projectArgOrCwd(process.argv[3]);

  if (status.running) {
    const projectRoots = addProjectToState(projectRoot);
    console.log(`Daemon is already running with PID ${status.pid}`);
    console.log(`Added project: ${projectRoot}`);
    console.log(`Watching ${projectRoots.length} project${projectRoots.length === 1 ? '' : 's'}.`);
    return;
  }
  if (!fs.existsSync(pidsDir)) {
    fs.mkdirSync(pidsDir, { recursive: true });
  }

  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  saveState({ projectRoots: [projectRoot] });

  log('Starting daemon...');
  const child = spawn(process.execPath, [__filename, 'run'], {
    detached: true,
    stdio: ['ignore', out, err],
    env: {
      ...process.env,
      AGENTS_DAEMON_PROJECT_ROOT: projectRoot
    }
  });

  fs.writeFileSync(pidFile, child.pid.toString() + '\n');
  child.unref();

  console.log(`Daemon started in background with PID ${child.pid}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Logs available at ${logFile}`);
};

const stop = () => {
  const status = getStatus();
  if (!status.running) {
    console.log('Daemon is not running.');
    return;
  }
  try {
    process.kill(status.pid, 'SIGTERM');
    console.log(`Stopped daemon (PID ${status.pid}).`);
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  } catch (e) {
    console.error(`Failed to stop daemon: ${e.message}`);
  }
};

const runLoop = () => {
  log('Daemon loop initialized.');
  
  const tickMemory = () => {
    log('Running hourly memory consolidation...');
    try {
      if (fs.existsSync(syncScript)) {
        const result = spawnSync(process.execPath, [syncScript, 'consolidate'], {
          encoding: 'utf8',
          env: process.env
        });
        if (result.status === 0) {
          log('Consolidation succeeded.');
        } else {
          log(`Consolidation failed: ${result.stderr || result.stdout}`);
        }
      } else {
        log(`WARNING: memory-sync-tools.mjs not found at ${syncScript}`);
      }
    } catch (e) {
      log(`Error running consolidation: ${e.message}`);
    }
  };

  const tickArtifacts = () => {
    try {
      if (!fs.existsSync(artifactAutomationScript)) {
        log(`WARNING: rpi-artifact-automation.mjs not found at ${artifactAutomationScript}`);
        return;
      }

      const state = loadState();
      const projectRoots = normalizeProjectRoots(
        state.projectRoots?.length
          ? state.projectRoots
          : process.env.AGENTS_DAEMON_PROJECT_ROOT
            ? [process.env.AGENTS_DAEMON_PROJECT_ROOT]
            : process.env.AGENTS_PROJECT_ROOT
              ? [process.env.AGENTS_PROJECT_ROOT]
              : [process.cwd()]
      );

      for (const projectRoot of projectRoots) {
        const result = spawnSync(
          process.execPath,
          [artifactAutomationScript, 'scan', '--project-root', projectRoot],
          {
            encoding: 'utf8',
            env: process.env
          }
        );

        if (result.status === 0) {
          const payload = result.stdout?.trim();
          if (payload) {
            log(`Artifact scan (${projectRoot}): ${payload}`);
          }
        } else {
          log(`Artifact scan failed (${projectRoot}): ${result.stderr || result.stdout}`);
        }
      }
    } catch (e) {
      log(`Error running artifact scan: ${e.message}`);
    }
  };

  // Run once on startup, then every hour
  tickMemory();
  tickArtifacts();
  setInterval(tickMemory, ONE_HOUR_MS);
  setInterval(tickArtifacts, ARTIFACT_SCAN_INTERVAL_MS);

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gently.');
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch(e){}
    }
    process.exit(0);
  });
};

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'status': {
    const status = getStatus();
    const daemonState = loadState();
    const projectRoots = normalizeProjectRoots(daemonState.projectRoots ?? daemonState.projectRoot);
    const location = projectRoots.length > 0 ? ` for ${projectRoots.length} project${projectRoots.length === 1 ? '' : 's'}` : '';
    console.log(`Daemon is ${status.running ? 'RUNNING (PID ' + status.pid + ')' : 'STOPPED'}${location}`);
    for (const projectRoot of projectRoots) {
      console.log(`- ${projectRoot}`);
    }
    break;
  }
  case 'add-project': {
    const projectRoot = projectArgOrCwd(process.argv[3]);
    const projectRoots = addProjectToState(projectRoot);
    console.log(`Added project: ${projectRoot}`);
    console.log(`Watching ${projectRoots.length} project${projectRoots.length === 1 ? '' : 's'}.`);
    break;
  }
  case 'remove-project': {
    const projectRoot = projectArgOrCwd(process.argv[3]);
    const projectRoots = removeProjectFromState(projectRoot);
    console.log(`Removed project: ${projectRoot}`);
    console.log(`Watching ${projectRoots.length} project${projectRoots.length === 1 ? '' : 's'}.`);
    break;
  }
  case 'list-projects': {
    const daemonState = loadState();
    const projectRoots = normalizeProjectRoots(daemonState.projectRoots ?? daemonState.projectRoot);
    for (const projectRoot of projectRoots) {
      console.log(projectRoot);
    }
    break;
  }
  case 'run':
    runLoop();
    break;
  default:
    console.log('Usage: node scripts/daemon-manager.mjs <start|stop|status|add-project|remove-project|list-projects> [project-root]');
    process.exit(1);
}
