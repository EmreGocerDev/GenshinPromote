const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Window controls
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close:    () => ipcRenderer.send('win:close'),

    // Settings
    getSettings: ()     => ipcRenderer.invoke('settings:get'),
    setSettings: (data) => ipcRenderer.invoke('settings:set', data),

    // Genshin data
    fetchData: () => ipcRenderer.invoke('genshin:fetch'),

    // Gemini AI Team Builder
    buildTeam: (avatars) => ipcRenderer.invoke('gemini:team-build', avatars),
    buildGeneral: (opts) => ipcRenderer.invoke('gemini:general', opts),
    buildCharTeam: (opts) => ipcRenderer.invoke('gemini:character', opts),
    buildAbyssTeam: (opts) => ipcRenderer.invoke('gemini:abyss', opts),
    rateTeam: (opts) => ipcRenderer.invoke('gemini:rate', opts),


});
