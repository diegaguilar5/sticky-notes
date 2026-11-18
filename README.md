# Sticky Notes

Sticky notes locales para macOS, hechas con Electron. Quedan siempre visibles en pantalla, sin ícono en el Dock (viven en la barra de menú).

## Instalación
```bash
git clone https://github.com/diegaguilar5/sticky-notes.git
cd sticky-notes
npm install
npm start
```
Solo macOS. Si `npm install` deja Electron a medias, corré `npm rebuild electron`.

## Atajos
| Acción | Atajo |
|---|---|
| Mostrar / ocultar todas las notas | `⌘⇧P` (global) |
| Nueva nota | `⌘⇧N` (global) o el botón `+` |
| Alternar checklist en la línea | `⌘L` o escribir `[] ` al inicio |
| Marcar / desmarcar checkbox | clic o `⌘Enter` |

Los atajos globales se cambian en `SHORTCUT_TOGGLE` y `SHORTCUT_NEW` de `main.js`.

## Funciones
- **Varias notas:** cada una es su propia ventana, que se mueve y se redimensiona.
- **4 colores:** amarillo, rosa, azul y verde, con los puntitos de la barra superior.
- **Checklists:** Enter en un checkbox crea otro; Enter en uno vacío (o Backspace al inicio) lo quita.
- **Las hechas bajan solas:** al marcar un ítem pasa al final; al desmarcarlo sube encima de las hechas.
- **Contador `2/5`** de tareas hechas sobre el total.
- **Botón `✓`** para borrar todas las hechas de una vez.
- **Menú de la barra:** nueva nota, mostrar/ocultar, iniciar con el Mac y salir.

## Datos
Se guardan automáticamente en `~/Library/Application Support/sticky-notes/notes.json`.
