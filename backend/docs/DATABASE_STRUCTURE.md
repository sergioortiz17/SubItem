# Estructura de Base de Datos - RoadMap SubItem

## Modelo de Datos: Materialized Path (Ruta Materializada) + Adjacency List

### Tabla: `tasks`

La aplicación usa un modelo híbrido **Materialized Path + Adjacency List** para almacenar la jerarquía de tareas:

```
┌─────────────┬─────────────────────────────────────────┐
│ Campo       │ Descripción                              │
├─────────────┼─────────────────────────────────────────┤
│ id          │ UUID (Primary Key)                       │
│ title       │ Título de la tarea                       │
│ description │ Descripción opcional                     │
│ status      │ Estado: 'todo', 'doing', 'done'          │
│ parent_id   │ UUID del padre (NULL para raíz)          │
│ path        │ Ruta materializada: "/root-id/child-id"   │
│ depth       │ Nivel de profundidad (0 = raíz)         │
│ order       │ Orden dentro del mismo nivel             │
│ created_at  │ Timestamp de creación                    │
│ updated_at  │ Timestamp de actualización               │
│ deleted_at  │ Soft delete (GORM)                      │
└─────────────┴─────────────────────────────────────────┘
```

### Índices

Para optimizar las consultas, se han agregado índices en:
- `parent_id`: Para búsquedas rápidas de hijos
- `order`: Para ordenamiento eficiente
- `status`: Para filtros por estado

### Cómo Funciona

1. **Almacenamiento**: Todas las tareas se guardan en una tabla plana con:
   - `parent_id`: Apunta al padre (para compatibilidad y consultas rápidas)
   - `path`: Ruta completa desde la raíz (ej: "/root-id/parent-id/task-id")
   - `depth`: Nivel de profundidad (0 = raíz, 1 = primer nivel, etc.)

2. **Consulta**: Se obtienen todas las tareas ordenadas por:
   - `depth` (raíces primero)
   - `path` (orden natural del árbol)
   - `order` (orden dentro del mismo nivel)

3. **Construcción del Árbol**: El backend construye el árbol jerárquico en memoria usando `BuildTree()`, aprovechando el orden natural del `path`

### Ejemplo de Datos

```
ID          | Title      | Parent ID | Path                    | Depth | Order
------------|------------|-----------|-------------------------|-------|------
uuid-1      | Tarea 1    | NULL      | /uuid-1                 | 0     | 0
uuid-2      | Tarea 2    | NULL      | /uuid-2                 | 0     | 1
uuid-3      | Subitem 1  | uuid-1    | /uuid-1/uuid-3          | 1     | 0
uuid-4      | Subitem 2  | uuid-1    | /uuid-1/uuid-4          | 1     | 1
uuid-5      | Sub-sub    | uuid-3    | /uuid-1/uuid-3/uuid-5   | 2     | 0
```

Se convierte en:
```
Tarea 1
  └─ Subitem 1
      └─ Sub-sub
  └─ Subitem 2
Tarea 2
```

### Ventajas del Materialized Path

- ✅ **Consultas más rápidas**: El `path` permite encontrar todos los descendientes con una simple consulta LIKE
- ✅ **Ordenamiento natural**: Ordenar por `path` automáticamente ordena el árbol
- ✅ **Menos recursión**: No necesitas consultas recursivas para construir el árbol
- ✅ **Índices eficientes**: Los índices en `path` y `depth` aceleran las consultas
- ✅ **Compatibilidad**: Mantiene `parent_id` para consultas rápidas de padre directo
- ✅ **Permite anidamiento infinito**: Sin límites de profundidad

### Desventajas

- ⚠️ Requiere actualizar paths cuando se mueven tareas (pero se hace automáticamente)
- ⚠️ El `path` puede ser largo para árboles muy profundos (pero UUIDs son cortos)

### Optimizaciones Implementadas

1. **Índices en campos clave**: `parent_id`, `order`, `status`
2. **Ordenamiento en consulta**: PostgreSQL ordena antes de enviar datos
3. **Algoritmo eficiente**: `BuildTree()` usa mapas para O(1) lookup
4. **Sorting optimizado**: Insertion sort para datos mayormente ordenados


