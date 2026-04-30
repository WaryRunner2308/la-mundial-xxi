const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

let mainWindow;
let retryCount = 0;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // 1 second

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'), // Agregar icon si existe
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'La Mundial - Calculadora de Precios',
    show: false // Mostrar cuando esté listo
  });

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  loadApp();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadApp() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // Desarrollo: http://localhost:5173 con reintentos limitados
    mainWindow.loadURL('http://localhost:5173/').catch((err) => {
      retryCount++;
      if (retryCount <= MAX_RETRIES) {
        console.log(`\\n🚀 Cargando Vite dev server... Reintento ${retryCount}/${MAX_RETRIES} en ${RETRY_INTERVAL / 1000}s. Error: ${err.message}`);
        setTimeout(loadApp, RETRY_INTERVAL);
      } else {
        console.error('❌ No se pudo cargar el servidor Vite después de max reintentos. Cargando página de error.');
        mainWindow.loadFile(path.join(__dirname, 'error.html'));
      }
    });
  } else {
    // Producción: archivo local
    const distPath = path.join(__dirname, '../frontend/dist/index.html');
    console.log(`📁 Cargando producción desde: ${distPath}`);
    mainWindow.loadFile(distPath).catch((err) => {
      console.error('❌ Error cargando build de producción:', err.message);
      // Fallback a error.html si falla
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
    });
  }
}

// Registrar protocolo custom para vite en dev (opcional)
app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const pathname = request.url.replace('app://./', '');
    callback({ path: path.normalize(path.join(__dirname, pathname)) });
  });
  createWindow();

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Manejo graceful shutdown
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
  }
});
