// Preload scripts can contain node APIs that are exposed to the renderer.
// However, we are not using any node APIs in the renderer, so we can leave it empty.
// We'll use contextBridge to expose an API if needed in the future.

const { contextBridge } = require('electron');

// Example of exposing an API to the renderer:
// contextBridge.exposeInMainWorld('electronAPI', {
//   // Some function that can be called from the renderer
//   // For example, to read a file, etc.
// });

// For now, we expose nothing, but we can expose the versions of Node.js, Chrome, and Electron.
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

// We can also expose helper functions if needed.
// For example, a function to open a file dialog, etc.
// But we are not using any in this application.