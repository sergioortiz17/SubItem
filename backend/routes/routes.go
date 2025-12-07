package routes

import (
	"roadmap-subitem/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Task routes
	api.Get("/tasks", controllers.GetTasks)
	api.Post("/tasks", controllers.CreateTask)
	api.Put("/tasks/:id", controllers.UpdateTask)
	api.Delete("/tasks/:id", controllers.DeleteTask)

	// Import/Export routes
	api.Post("/import", controllers.ImportTasks)
	api.Get("/export", controllers.ExportTasks)
}


