package controllers

import (
	"roadmap-subitem/database"
	"roadmap-subitem/models"

	"github.com/google/uuid"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// GetTasks returns all tasks in hierarchical structure
func GetTasks(c *fiber.Ctx) error {
	var tasks []models.Task
	result := database.DB.Order("\"order\" ASC").Find(&tasks)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	tree := models.BuildTree(tasks)
	return c.JSON(fiber.Map{"tasks": tree})
}

// CreateTask creates a new task or subitem
func CreateTask(c *fiber.Ctx) error {
	var task models.Task
	if err := c.BodyParser(&task); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Generate UUID if not provided
	if task.ID == "" {
		task.ID = uuid.New().String()
	}

	// Set default status if not provided
	if task.Status == "" {
		task.Status = "todo"
	}

	// Get max order for the parent (or root if no parent)
	var maxOrder int
	query := database.DB.Model(&models.Task{})
	if task.ParentID != nil {
		query = query.Where("parent_id = ?", *task.ParentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	query.Select("COALESCE(MAX(\"order\"), -1)").Scan(&maxOrder)
	task.Order = maxOrder + 1

	result := database.DB.Create(&task)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	return c.Status(201).JSON(task)
}

// UpdateTask updates a task
func UpdateTask(c *fiber.Ctx) error {
	id := c.Params("id")
	var task models.Task

	if err := database.DB.First(&task, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	var updateData models.Task
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update allowed fields
	if updateData.Title != "" {
		task.Title = updateData.Title
	}
	if updateData.Description != "" || updateData.Description == "" {
		task.Description = updateData.Description
	}
	if updateData.Status != "" {
		task.Status = updateData.Status
	}
	// Handle parentId update
	parentChanged := false
	if updateData.ParentID != nil {
		// Prevent circular reference
		if *updateData.ParentID == task.ID {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot set parent to itself"})
		}
		// Check if parent is a descendant
		if isDescendant(database.DB, *updateData.ParentID, task.ID) {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot set parent to a descendant"})
		}
		if task.ParentID == nil || *task.ParentID != *updateData.ParentID {
			parentChanged = true
			task.ParentID = updateData.ParentID
		}
	} else if task.ParentID != nil && updateData.ParentID != nil {
		// Moving to root (parentId set to nil) - only if explicitly set
		parentChanged = true
		task.ParentID = nil
	}

	// Recalculate order ONLY when parent changes, NOT when status changes
	if parentChanged {
		var maxOrder int
		query := database.DB.Model(&models.Task{})
		if task.ParentID != nil {
			query = query.Where("parent_id = ?", *task.ParentID)
		} else {
			query = query.Where("parent_id IS NULL")
		}
		query.Where("id != ?", task.ID).Select("COALESCE(MAX(\"order\"), -1)").Scan(&maxOrder)
		task.Order = maxOrder + 1
	}
	// Only update order if explicitly provided (for drag & drop)
	if updateData.Order >= 0 && updateData.Order != task.Order {
		task.Order = updateData.Order
	}

	result := database.DB.Save(&task)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	return c.JSON(task)
}

// DeleteTask deletes a task and all its descendants recursively
func DeleteTask(c *fiber.Ctx) error {
	id := c.Params("id")
	
	// Delete all descendants first
	if err := deleteDescendants(database.DB, id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Delete the task itself
	result := database.DB.Delete(&models.Task{}, "id = ?", id)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
	}

	return c.JSON(fiber.Map{"message": "Task deleted successfully"})
}

// isDescendant checks if candidateId is a descendant of ancestorId
func isDescendant(db *gorm.DB, candidateId, ancestorId string) bool {
	var task models.Task
	if err := db.First(&task, "id = ?", candidateId).Error; err != nil {
		return false
	}

	if task.ParentID == nil {
		return false
	}

	if *task.ParentID == ancestorId {
		return true
	}

	return isDescendant(db, *task.ParentID, ancestorId)
}

// deleteDescendants recursively deletes all descendants
func deleteDescendants(db *gorm.DB, parentId string) error {
	var children []models.Task
	if err := db.Where("parent_id = ?", parentId).Find(&children).Error; err != nil {
		return err
	}

	for _, child := range children {
		if err := deleteDescendants(db, child.ID); err != nil {
			return err
		}
		if err := db.Delete(&child).Error; err != nil {
			return err
		}
	}

	return nil
}

// ImportTasks imports tasks from JSON
func ImportTasks(c *fiber.Ctx) error {
	var data struct {
		Tasks []models.TaskResponse `json:"tasks"`
	}

	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	// Clear existing tasks
	if err := database.DB.Exec("DELETE FROM tasks").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Import tasks recursively
	if err := importTasksRecursive(database.DB, data.Tasks, nil); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Tasks imported successfully"})
}

// importTasksRecursive imports tasks recursively
func importTasksRecursive(db *gorm.DB, tasks []models.TaskResponse, parentID *string) error {
	for i, taskResp := range tasks {
		taskID := taskResp.ID
		// Generate UUID if not provided
		if taskID == "" {
			taskID = uuid.New().String()
		}

		task := models.Task{
			ID:          taskID,
			Title:       taskResp.Title,
			Description: taskResp.Description,
			Status:      taskResp.Status,
			ParentID:    parentID,
			Order:       i,
		}

		if err := db.Create(&task).Error; err != nil {
			return err
		}

		if len(taskResp.Subitems) > 0 {
			parentIDStr := task.ID
			if err := importTasksRecursive(db, taskResp.Subitems, &parentIDStr); err != nil {
				return err
			}
		}
	}
	return nil
}

// ExportTasks exports all tasks as JSON
func ExportTasks(c *fiber.Ctx) error {
	var tasks []models.Task
	result := database.DB.Order("\"order\" ASC").Find(&tasks)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	tree := models.BuildTree(tasks)
	return c.JSON(fiber.Map{"tasks": tree})
}

