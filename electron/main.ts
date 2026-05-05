import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Start backend unless it's already provided by Vite dev server
  if (!process.env.VITE_DEV_SERVER_URL) {
    process.env.NODE_ENV = 'production';
    await startServer();
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "网络监控专业版 (NetMonitor PRO) - Root Enabled",
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production, we load from the local server we just started
    mainWindow.loadURL('http://localhost:3000');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
