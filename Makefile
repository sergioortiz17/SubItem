.PHONY: up down build rebuild logs clean

# Levantar todos los servicios
up:
	docker compose up -d

# Detener todos los servicios
down:
	docker compose down

# Construir las imágenes
build:
	docker compose build

# Reconstruir y levantar
rebuild:
	docker compose up -d --build

# Ver logs
logs:
	docker compose logs -f

# Ver logs de un servicio específico
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f postgres

# Limpiar todo (incluyendo volúmenes)
clean:
	docker compose down -v
	docker system prune -f

# Estado de los contenedores
ps:
	docker compose ps

# Ejecutar comandos en el backend
backend-shell:
	docker compose exec backend sh

# Ejecutar comandos en el frontend
frontend-shell:
	docker compose exec frontend sh

