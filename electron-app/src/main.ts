import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    title: 'POO Cardápio - Pedidos',
  })

  const htmlPath = path.join(__dirname, 'renderer/index.html')
  mainWindow.loadURL(`file://${htmlPath}`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('get-config', () => {
  const configPath = path.join(__dirname, 'config/config.json')
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config
  } catch (error) {
    console.error('Erro ao carregar configuração:', error)
    return null
  }
})

ipcMain.handle('save-config', (_event, config: any) => {
  const configPath = path.join(__dirname, 'config/config.json')
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Erro ao salvar configuração:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
})

