const { app, BrowserWindow, dialog, Notification, systemPreferences } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;
let reminderInterval;
let workflowInterval;

async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434');
    if (res.ok) return true;
  } catch (err) {
    return false;
  }
  return false;
}

// Background scheduler for reminders
async function pollReminders() {
  try {
    const res = await fetch('http://localhost:3000/api/reminders/poll');
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.reminders && data.reminders.length > 0) {
      data.reminders.forEach(task => {
        if (Notification.isSupported()) {
          new Notification({
            title: 'Niko Reminder',
            body: task.title,
            silent: false
          }).show();
        }
      });
    }
  } catch (err) {
    // Next.js might not be up yet, silently ignore
  }
}

// Background scheduler for workflows
async function pollWorkflows() {
  try {
    const res = await fetch('http://localhost:3000/api/workflows/cron');
    if (!res.ok) return;
    await res.json();
  } catch (err) {
    // Silently ignore if Next.js is down
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hidden', // Sleek modern look for macOS
    titleBarOverlay: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure the Database is routed to a safe location
const userDataPath = app.getPath('userData');
// Pass this to Next.js process
process.env.DATABASE_URL = `file:${path.join(userDataPath, 'dev.db')}`;

app.on('ready', async () => {
  // Request microphone permissions explicitly on macOS
  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
  }

  // Check for Ollama
  const isOllamaRunning = await checkOllama();
  if (!isOllamaRunning) {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Ollama Not Found',
      message: 'Niko OS requires Ollama to be running on your machine.',
      detail: 'Please start Ollama. The application will continue to boot, but features may not work.'
    });
  }

  createWindow();

  // Start polling reminders every 10 seconds
  reminderInterval = setInterval(pollReminders, 10000);
  
  // Start polling workflows every minute (60000 ms)
  workflowInterval = setInterval(pollWorkflows, 60000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (nextProcess) nextProcess.kill();
});

app.on('before-quit', () => {
  if (reminderInterval) clearInterval(reminderInterval);
  if (workflowInterval) clearInterval(workflowInterval);
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
