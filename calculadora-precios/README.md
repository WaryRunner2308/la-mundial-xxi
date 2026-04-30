# Calculadora de Precios - La Mundial

Aplicación de escritorio para calcular precios de productos con fórmula comercial real.

## 🚀 Cómo Ejecutar

### Opción 1: Aplicación de Escritorio Completa (Recomendado)
```bash
# Desde la raíz del proyecto (calculadora-precios/)
npm run dev
```
Esto inicia automáticamente la aplicación de escritorio con Electron.

### Opción 2: Solo Frontend (para desarrollo)
```bash
cd frontend
npm run dev
# Luego abre http://localhost:5173 en tu navegador
```

### Opción 3: Aplicación de Escritorio por Separado
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Electron (espera a que el frontend esté listo)
cd ..
npx electron .
```

## ✨ Funcionalidades

- ✅ **Dashboard**: Estadísticas rápidas y navegación
- ✅ **Gestión de Productos**: Registrar, listar y buscar productos
- ✅ **Calculadora Inteligente**: Cálculo de precios con fórmula real
  - Precio venta = Costo ÷ (1 - %Ganancia/100)
  - IVA Venezuela 16% automático
  - Utilidad y márgenes calculados

## 🔧 Stack Tecnológico

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Java Spring Boot + SQLite (planeado)
- **Escritorio**: Electron
- **Estado**: Zustand
- **UI**: ShadCN UI components

## 📝 Notas Técnicas

- Puerto frontend: 5173 (forzado)
- Funciona 100% offline
- Datos almacenados localmente en SQLite
- Interfaz responsive y moderna

¡La aplicación está lista para usar!