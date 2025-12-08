package routes

import (
	"roadmap-subitem/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Item routes
	api.Get("/items", controllers.GetItems)
	api.Post("/items", controllers.CreateItem)
	api.Put("/items/:id", controllers.UpdateItem)
	api.Delete("/items/:id", controllers.DeleteItem)

	// Import/Export routes
	api.Post("/import", controllers.ImportItems)
	api.Get("/export", controllers.ExportItems)
}


