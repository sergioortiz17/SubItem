# Arquitectura del Frontend

Este proyecto sigue los principios de **Clean Architecture** y **SOLID** para mantener el código organizado, mantenible y testeable.

## Estructura de Carpetas

```
frontend/src/
├── domain/                    # Capa de Dominio (Lógica de Negocio)
│   ├── entities/             # Entidades del dominio
│   │   └── Item.ts           # Definición de entidades Item
│   ├── repositories/        # Interfaces de repositorios (DIP)
│   │   └── IItemRepository.ts
│   └── services/             # Servicios de dominio
│       ├── ItemTreeService.ts      # Operaciones sobre árboles de items
│       └── ItemValidationService.ts # Validaciones de negocio
│
├── application/              # Capa de Aplicación (Casos de Uso)
│   └── useCases/
│       ├── MoveItemUseCase.ts      # Caso de uso: Mover item
│       └── ReorderItemUseCase.ts   # Caso de uso: Reordenar item
│
├── infrastructure/           # Capa de Infraestructura (Implementaciones)
│   ├── repositories/
│   │   └── ItemRepository.ts # Implementación concreta del repositorio
│   └── di/
│       └── container.ts      # Contenedor de inyección de dependencias
│
├── presentation/            # Capa de Presentación (UI)
│   └── hooks/
│       ├── useDragAndDrop.ts       # Hook para drag and drop
│       └── useItemsRefactored.ts   # Hooks de React Query con DI
│
├── components/              # Componentes React
├── types/                   # Tipos TypeScript (DTOs)
├── utils/                   # Utilidades generales
└── services/               # Servicios legacy (en proceso de migración)
```

## Principios Aplicados

### 1. Single Responsibility Principle (SRP)
- **ItemTreeService**: Responsable solo de operaciones sobre árboles
- **ItemValidationService**: Responsable solo de validaciones
- **useDragAndDrop**: Responsable solo de la lógica de drag and drop
- Cada caso de uso tiene una única responsabilidad

### 2. Open/Closed Principle (OCP)
- Los servicios usan tipos genéricos (`ItemTreeLike`) que permiten extender sin modificar
- Las interfaces permiten agregar nuevas implementaciones sin cambiar el código existente

### 3. Liskov Substitution Principle (LSP)
- Cualquier implementación de `IItemRepository` puede sustituir a otra sin romper el código

### 4. Interface Segregation Principle (ISP)
- `IItemRepository` define solo los métodos necesarios para operaciones de items
- No fuerza a implementar métodos innecesarios

### 5. Dependency Inversion Principle (DIP)
- Los casos de uso dependen de `IItemRepository` (abstracción), no de `ItemRepository` (implementación)
- El contenedor de DI (`container.ts`) inyecta las dependencias
- Los hooks se crean con el repositorio inyectado

## Flujo de Datos

```
Componente React
    ↓
Hook de Presentación (useItems, useDragAndDrop)
    ↓
Caso de Uso (MoveItemUseCase, ReorderItemUseCase)
    ↓
Servicio de Dominio (ItemTreeService, ItemValidationService)
    ↓
Repositorio (IItemRepository)
    ↓
API HTTP (ItemRepository implementación)
```

## Beneficios

1. **Testabilidad**: Cada capa puede testearse independientemente
2. **Mantenibilidad**: Cambios en una capa no afectan otras
3. **Escalabilidad**: Fácil agregar nuevas funcionalidades
4. **Reutilización**: Los servicios de dominio pueden usarse en diferentes contextos
5. **Desacoplamiento**: La UI no depende directamente de la API

## Migración en Progreso

Algunos componentes aún usan los hooks y servicios legacy (`hooks/useItems.ts`, `services/api.ts`). 
Estos se están migrando gradualmente a la nueva arquitectura para mantener la estabilidad.

