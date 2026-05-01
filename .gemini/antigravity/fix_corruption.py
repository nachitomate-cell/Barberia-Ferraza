
import os

path = r'gestion-interna\index.html'
with open(path, 'rb') as f:
    content = f.read()

# Buscamos la parte corrompida. 
# Usamos una parte de la cadena que sea única y fácil de encontrar.
target = b"document.getElementById('canjeMsg').className = 'text-xs text-center mt-      async function cargarSettingsFirestore()"

# El reemplazo:
# 1. Terminar el catch de canjearPremio
# 2. Terminar la función canjearPremio
# 3. Iniciar openManualBookingModal
replacement = b"""document.getElementById('canjeMsg').className = 'text-xs text-center mt-2 text-red-400';
          document.getElementById('canjeMsg').classList.remove('hidden');
        }
      }

      function openManualBookingModal() {
        document.getElementById('manualBookingModal').classList.replace('hidden', 'flex');
        const sel = document.getElementById('mb-servicio');
        const srvs = _serviciosCache || [];
        sel.innerHTML = '<option value="">- Servicio -</option>';"""

if target in content:
    # También queremos limpiar la basura que quedó después de la función cargarSettingsFirestore hasta el inicio del siguiente bloque.
    # La basura es algo como:
    #         // Ya no es necesario ...
    #       }
    # ?</option>';
    
    # Vamos a buscar el inicio de la basura y el final.
    start_idx = content.find(target)
    
    # Buscamos el siguiente 'srvs.forEach' que sabemos que viene después.
    end_marker = b"srvs.forEach(s => sel.innerHTML"
    end_idx = content.find(end_marker)
    
    if end_idx > start_idx:
        new_content = content[:start_idx] + replacement + b"\n        " + content[end_idx:]
        with open(path, 'wb') as f:
            f.write(new_content)
        print("Reemplazo exitoso")
    else:
        print("No se encontró el marcador de fin")
else:
    print("No se encontró el texto objetivo")
