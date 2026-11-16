const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getNote: (id) => ipcRenderer.invoke('note:get', id),
  saveLines: (id, lines) => ipcRenderer.send('note:save', id, lines),
  setColor: (id, color) => ipcRenderer.send('note:color', id, color),
  newNote: () => ipcRenderer.send('note:new'),
  deleteNote: (id) => ipcRenderer.send('note:delete', id),
});
