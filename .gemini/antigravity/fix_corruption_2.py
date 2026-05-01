
import os

path = r'gestion-interna\index.html'
with open(path, 'rb') as f:
    content = f.read()

start_marker = b"async function cargarSettingsFirestore() {"
garbage_marker = b"</script>"

idx_start = content.find(start_marker)
if idx_start == -1:
    print("No se encontró start_marker")
    exit(1)

toggle_fn_marker = b"function toggleTheme() {"
idx_toggle = content.find(toggle_fn_marker, idx_start)

if idx_toggle == -1:
    print("No se encontró toggle_fn_marker")
    exit(1)

# Buscamos la basura que empieza con </script> después de toggleTheme
idx_garbage = content.find(garbage_marker, idx_toggle)
if idx_garbage == -1:
    print("No se encontró garbage_marker")
    exit(1)

# Buscamos el final de la basura (el siguiente '}')
idx_end_garbage = content.find(b"}", idx_garbage)
if idx_end_garbage == -1:
    print("No se encontró el final de la basura")
    exit(1)

# Reconstrucción con el stub correcto en UTF-8
stub_text = """async function cargarSettingsFirestore() {
        // Ya no es necesario - AppState.init() suscribe onConfigChange
        // que alimenta _configCache automáticamente. Esta función queda
        // como stub por compatibilidad con llamadas externas.
      }

    """
stub = stub_text.encode('utf-8')

new_content = (
    content[:idx_start] + 
    stub + 
    content[idx_toggle:idx_garbage] + 
    content[idx_end_garbage + 1:]
)

with open(path, 'wb') as f:
    f.write(new_content)

print("Reparación de la segunda corrupción completada con éxito.")
