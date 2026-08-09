import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { definirContexte } from './contexte'
import { enregistrerHandlers } from './ipc/index'

// Nom fixé explicitement : sans cela le dossier de données change selon le mode
// de lancement. Bug réel vécu sur Ohmnia.
app.setName('Acustika')

function creerFenetrePrincipale(): void {
  const fenetre = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0d16',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  fenetre.once('ready-to-show', () => fenetre.show())

  fenetre.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    fenetre.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    fenetre.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  definirContexte({ dossierDonnees: app.getPath('userData'), version: app.getVersion() })
  enregistrerHandlers()
  creerFenetrePrincipale()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetrePrincipale()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
