# RoadMap SubItem

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.21-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3.6-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Aplicación moderna de gestión de tareas con subitems anidados infinitamente, construida con React + TypeScript (frontend) y Go + PostgreSQL (backend).

## Ejecutar localmente : Ubicado en el root donde esta docker-compose.yml
- docker compose down (solo si esta arriba el contenedor y vas a la url y no funciona)
- docker compose build --no-cache
- docker compose up -d

- http://localhost:3000/




## 🚀 Características

- ✅ **Tareas y subitems anidados infinitamente** - Estructura de árbol recursiva
- 🎯 **Drag & Drop jerárquico** - Reordena y anida tareas fácilmente
- 📊 **Porcentaje de avance automático** - Calcula el progreso basado en subitems completados
- 🔢 **Contador de subitems** - Muestra cantidad directa y total de subitems
- 📥 **Importar/Exportar JSON** - Guarda y restaura tu estructura de tareas
- 🌙 **Modo oscuro permanente** - Interfaz minimalista y moderna

## 🛠️ Tecnologías

### Frontend
- React 18 + TypeScript
- TailwindCSS (modo oscuro)
- React Query para data fetching
- dnd-kit para drag & drop
- Vite como bundler

### Backend
- Go (Golang)
- Fiber framework
- GORM como ORM
- PostgreSQL

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn
- Go 1.21+
- PostgreSQL 15+ (o usar Docker Compose)
- Docker y Docker Compose (opcional)

## 🚀 Instalación y Ejecución

### Opción A: Docker Compose (Recomendado - Todo en contenedores)

La forma más fácil de levantar todo el proyecto:

```bash
# Construir y levantar todos los servicios
docker compose up -d --build

# O usar el Makefile
make rebuild
```

Esto levantará:
- **PostgreSQL** en el puerto `5432`
- **Backend (Go)** en el puerto `8080`
- **Frontend (React)** en el puerto `3000`

La aplicación estará disponible en: `http://localhost:3000`

**Comandos útiles con Docker Compose:**

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Detener todos los servicios
docker compose down

# Reconstruir y levantar
docker compose up -d --build

# Ver estado de los contenedores
docker compose ps
```

**O usar el Makefile:**

```bash
make up          # Levantar servicios
make down        # Detener servicios
make build       # Construir imágenes
make rebuild     # Reconstruir y levantar
make logs        # Ver logs
make clean       # Limpiar todo (incluyendo volúmenes)
```

### Opción B: Desarrollo Local (Sin Docker)

#### 1. Base de Datos (PostgreSQL)

##### Opción B1: Usando Docker solo para PostgreSQL

```bash
docker compose up -d postgres
```

##### Opción B2: PostgreSQL local

Asegúrate de tener PostgreSQL corriendo y crea la base de datos:

```sql
CREATE DATABASE roadmap_subitem;
```

#### 2. Backend (Go)

```bash
cd backend

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales si es necesario
# Por defecto:
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=roadmap_subitem
# PORT=8080

# Instalar dependencias
go mod download

# Ejecutar el servidor
go run main.go
```

El backend estará disponible en `http://localhost:8080`

#### 3. Frontend (React)

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## 📡 API Endpoints

- `GET /api/tasks` - Obtener todas las tareas (estructura jerárquica)
- `POST /api/tasks` - Crear nueva tarea o subitem
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea y sus subitems
- `POST /api/import` - Importar tareas desde JSON
- `GET /api/export` - Exportar tareas a JSON

## 🎯 Uso

### Crear una tarea
- Escribe el título en el campo de entrada y presiona Enter o haz clic en "Agregar Tarea"

### Agregar subitems
- Haz clic en el botón "+ Subitem" en cualquier tarea
- Los subitems pueden tener sus propios subitems (anidación infinita)

### Reordenar tareas
- Arrastra y suelta tareas usando el icono de arrastre (⋮⋮)
- Puedes mover tareas dentro de otras tareas para crear subitems

### Cambiar estado
- Usa el selector de estado en cada tarea (Pendiente, En curso, Completado)
- El porcentaje de avance se calcula automáticamente

### Importar/Exportar
- **Exportar**: Descarga un archivo JSON con toda la estructura de tareas
- **Importar**: Carga un archivo JSON para restaurar tareas (reemplaza las existentes)

## 📁 Estructura del Proyecto

```
SubItem/
├── backend/
│   ├── controllers/     # Controladores de la API
│   ├── database/        # Configuración de base de datos
│   ├── models/          # Modelos de datos
│   ├── routes/          # Definición de rutas
│   ├── main.go          # Punto de entrada del backend
│   └── go.mod           # Dependencias de Go
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # Servicios de API
│   │   ├── types/       # Tipos TypeScript
│   │   ├── utils/       # Utilidades
│   │   ├── App.tsx      # Componente principal
│   │   └── main.tsx     # Punto de entrada
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml    # Configuración de PostgreSQL
└── README.md
```

## 🔧 Desarrollo

### Backend
```bash
cd backend
go run main.go
```

### Frontend
```bash
cd frontend
npm run dev
```

### Build de producción

#### Frontend
```bash
cd frontend
npm run build
```

Los archivos estáticos se generarán en `frontend/dist/`

#### Backend
```bash
cd backend
go build -o roadmap-subitem main.go
./roadmap-subitem
```

## 📝 Notas

- El modo oscuro está activado permanentemente
- Las tareas se ordenan automáticamente por el campo `order`
- Al eliminar una tarea, se eliminan recursivamente todos sus subitems
- El porcentaje de avance considera la tarea misma y todos sus subitems anidados

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `backend/.env`
- Si usas Docker, verifica que el contenedor esté activo: `docker ps`

### Error de CORS
- Asegúrate de que el backend esté corriendo en el puerto 8080
- Verifica la configuración de CORS en `backend/main.go`

### Problemas con drag & drop
- Asegúrate de usar un navegador moderno
- Verifica la consola del navegador para errores

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.


