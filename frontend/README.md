# UNICEN - frontend

Interfaz de inicio de sesión para el sistema académico, creada con React, TypeScript y Vite.

## Inicio local

1. Inicia el backend en `http://localhost:3010`.
2. Desde esta carpeta ejecuta:

   ```bash
   npm install
   npm run dev
   ```

La URL del backend se configura con `VITE_API_URL`. Puedes copiar `.env.example` a `.env` para cambiarla.

## Cuentas de demostración

- Estudiante: `estudiante@unicen.edu.bo` / `Estudiante123!` (inscripciones e historial académico)
- Docente: `docente@unicen.edu.bo` / `Docente123!` (registro, edición y eliminación de notas)

La aplicación obtiene un JWT del backend y valida la sesión existente al recargar la página.
