# Sticky Notes

Sticky notes locales para macOS, hechas con Electron. Quedan siempre visibles en pantalla.

## Uso
```bash
npm install
npm start
```

## Atajos
| Acción | Atajo |
|---|---|
| Mostrar / ocultar todas las notas | `⌘⇧P` |
| Nueva nota | `⌘⇧N` |
| Alternar checklist en la línea | `⌘L` o escribir `[] ` |
| Marcar / desmarcar checkbox | clic o `⌘Enter` |

Los atajos se cambian en `SHORTCUT_TOGGLE` y `SHORTCUT_NEW` de `main.js`.
Las notas se guardan en `~/Library/Application Support/sticky-notes/notes.json`.
