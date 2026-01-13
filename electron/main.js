const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startServer } = require('../server/index.js');

let mainWindow;
let serverPort;

async function createWindow() {
  // Start server if not already running
  if (!serverPort) {
    try {
      // Pass 0 to let the OS assign a random free port
      serverPort = await startServer(0);
      console.log('Electron: Internal server started on port', serverPort);
    } catch (err) {
      console.error('Electron: Failed to start internal server', err);
      app.quit();
      return;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: '渴鹅图论',
    icon: path.join(__dirname, '../resources/icon256x256.ico')
  });

  // Remove menu for a cleaner look (optional)
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
