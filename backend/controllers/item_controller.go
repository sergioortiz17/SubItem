package controllers

import (
	"roadmap-subitem/database"
	"roadmap-subitem/models"

	"github.com/google/uuid"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const MAX_DEPTH = 7 // Maximum depth of subitems

// calculateItemDepth calculates the maximum depth of an item in the tree
// Returns the depth (0 = root, 1 = first level subitem, etc.)
func calculateItemDepth(itemID string) (int, error) {
	var allItems []models.Item
	var allLevels []models.Level
	
	if err := database.DB.Find(&allItems).Error; err != nil {
		return 0, err
	}
	if err := database.DB.Find(&allLevels).Error; err != nil {
		return 0, err
	}
	
	// Build a map of levels by item ID
	levelsByItemID := make(map[string][]models.Level)
	for _, level := range allLevels {
		levelsByItemID[level.ItemID] = append(levelsByItemID[level.ItemID], level)
	}
	
	// Build a map of items by level ID
	itemsByLevelID := make(map[string][]models.Item)
	for _, item := range allItems {
		if item.LevelID != nil {
			itemsByLevelID[*item.LevelID] = append(itemsByLevelID[*item.LevelID], item)
		}
	}
	
	// Recursive function to calculate depth
	var calculateDepth func(id string, visited map[string]bool) int
	calculateDepth = func(id string, visited map[string]bool) int {
		if visited[id] {
			return 0 // Cycle detected, return 0
		}
		visited[id] = true
		
		maxDepth := 0
		// Find all levels belonging to this item
		levels, hasLevels := levelsByItemID[id]
		if hasLevels {
			for _, level := range levels {
				// Find all items in this level
				items, hasItems := itemsByLevelID[level.ID]
				if hasItems {
					for _, item := range items {
						depth := calculateDepth(item.ID, visited) + 1
						if depth > maxDepth {
							maxDepth = depth
						}
					}
				}
			}
		}
		return maxDepth
	}
	
	visited := make(map[string]bool)
	return calculateDepth(itemID, visited), nil
}

// isDescendantOf checks if potentialDescendant is a descendant of ancestor
func isDescendantOf(potentialDescendantID, ancestorID string, visited map[string]bool) bool {
	if visited[potentialDescendantID] {
		return false // Cycle detected
	}
	visited[potentialDescendantID] = true
	
	if potentialDescendantID == ancestorID {
		return true
	}
	
	// Get the item
	var item models.Item
	if err := database.DB.First(&item, "id = ?", potentialDescendantID).Error; err != nil {
		return false
	}
	
	// If this item has no level, it's a root item, so it can't be a descendant
	if item.LevelID == nil {
		return false
	}
	
	// Find the level
	var level models.Level
	if err := database.DB.First(&level, "id = ?", *item.LevelID).Error; err != nil {
		return false
	}
	
	// Check if the parent item is the ancestor or a descendant of the ancestor
	if level.ItemID == ancestorID {
		return true
	}
	
	// Recursively check parent
	return isDescendantOf(level.ItemID, ancestorID, visited)
}

// GetItems returns all items in hierarchical structure
func GetItems(c *fiber.Ctx) error {
	var items []models.Item
	var levels []models.Level
	
	// Query all items ordered by level_id (NULL first = root tasks), then by order
	result := database.DB.
		Order("CASE WHEN level_id IS NULL THEN 0 ELSE 1 END ASC").
		Order("\"order\" ASC").
		Find(&items)
	
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	// Query all levels
	levelResult := database.DB.
		Order("level_num ASC").
		Order("\"order\" ASC").
		Find(&levels)
	
	if levelResult.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": levelResult.Error.Error()})
	}

	// Build tree structure using items and levels
	tree := models.BuildTree(items, levels)
	return c.JSON(fiber.Map{"items": tree})
}

// CreateItemRequest represents the request body for creating an item
type CreateItemRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	ItemID      *string `json:"itemId"`   // If provided, creates subitem in level 0 of this item
	LevelID     *string `json:"levelId"`  // If provided, creates subitem in this specific level
}

// CreateItem creates a new item (task or subitem)
func CreateItem(c *fiber.Ctx) error {
	var req CreateItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item := models.Item{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		LevelID:     nil,
		Order:       0,
	}

	// Set default status if not provided
	if item.Status == "" {
		item.Status = "todo"
	}

	// Handle level assignment
	if req.ItemID != nil {
		// Check depth before creating subitem
		depth, err := calculateItemDepth(*req.ItemID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to calculate depth: " + err.Error()})
		}
		if depth >= MAX_DEPTH-1 {
			return c.Status(400).JSON(fiber.Map{"error": "Maximum depth reached. Cannot create more than 7 levels of subitems"})
		}
		
		// Creating a subitem - find or create level 0 for this item
		var level models.Level
		result := database.DB.Where("item_id = ? AND level_num = 0", *req.ItemID).First(&level)
		if result.Error == gorm.ErrRecordNotFound {
			// Create level 0 for this item
			level = models.Level{
				ID:       uuid.New().String(),
				ItemID:   *req.ItemID,
				LevelNum: 0,
				Order:    0,
			}
			if err := database.DB.Create(&level).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to create level: " + err.Error()})
			}
		} else if result.Error != nil {
			return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
		}
		item.LevelID = &level.ID
	} else if req.LevelID != nil {
		// Creating a subitem in a specific level
		// Find the level to get its item ID
		var level models.Level
		if err := database.DB.First(&level, "id = ?", *req.LevelID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Level not found"})
		}
		
		// Check depth before creating subitem
		depth, err := calculateItemDepth(level.ItemID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to calculate depth: " + err.Error()})
		}
		if depth >= MAX_DEPTH-1 {
			return c.Status(400).JSON(fiber.Map{"error": "Maximum depth reached. Cannot create more than 7 levels of subitems"})
		}
		
		item.LevelID = req.LevelID
	}
	// If neither ItemID nor LevelID is provided, it's a root task (LevelID = nil)

	// Get max order for the level (or root if no level)
	var maxOrder int
	query := database.DB.Model(&models.Item{})
	if item.LevelID != nil {
		query = query.Where("level_id = ?", *item.LevelID)
	} else {
		query = query.Where("level_id IS NULL")
	}
	query.Select("COALESCE(MAX(\"order\"), -1)").Scan(&maxOrder)
	item.Order = maxOrder + 1

	result := database.DB.Create(&item)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	// Reload the item to ensure we have all fields properly set
	var createdItem models.Item
	database.DB.First(&createdItem, "id = ?", item.ID)
	
	return c.Status(201).JSON(createdItem)
}

// UpdateItem updates an item
func UpdateItem(c *fiber.Ctx) error {
	id := c.Params("id")
	var item models.Item

	if err := database.DB.First(&item, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "Item not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Parse update data into a map to check which fields are actually provided
	var updateDataMap map[string]interface{}
	if err := c.BodyParser(&updateDataMap); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update allowed fields only if they are provided
	if title, ok := updateDataMap["title"].(string); ok && title != "" {
		item.Title = title
	}
	if description, ok := updateDataMap["description"]; ok {
		if descStr, ok := description.(string); ok {
			item.Description = descStr
		}
	}
	if status, ok := updateDataMap["status"].(string); ok && status != "" {
		item.Status = status
	}
	
	// Handle levelId update (moving between levels or to root)
	levelChanged := false
	if levelIdRaw, ok := updateDataMap["levelId"]; ok {
		if levelIdRaw == nil {
			// Explicitly set to nil (moving to root)
			if item.LevelID != nil {
				levelChanged = true
				item.LevelID = nil
			}
		} else if levelIdStr, ok := levelIdRaw.(string); ok {
			// Set to a specific level
			if item.LevelID == nil || *item.LevelID != levelIdStr {
				levelIdPtr := &levelIdStr
				levelChanged = true
				item.LevelID = levelIdPtr
			}
		}
	}

	// Handle itemId update (moving to a different item's level 0)
	if itemIdRaw, ok := updateDataMap["itemId"]; ok {
		if itemIdStr, ok := itemIdRaw.(string); ok {
			// Prevent moving an item into itself or its descendants
			// Check if the target item is a descendant of the item being moved
			var targetItem models.Item
			if err := database.DB.First(&targetItem, "id = ?", itemIdStr).Error; err != nil {
				return c.Status(404).JSON(fiber.Map{"error": "Target item not found"})
			}
			
			// Check if target is a descendant (would create a cycle)
			visited := make(map[string]bool)
			if isDescendantOf(targetItem.ID, item.ID, visited) {
				return c.Status(400).JSON(fiber.Map{"error": "Cannot move item into its own descendant"})
			}
			
			// Check depth before moving
			depth, err := calculateItemDepth(itemIdStr)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to calculate depth: " + err.Error()})
			}
			if depth >= MAX_DEPTH-1 {
				return c.Status(400).JSON(fiber.Map{"error": "Maximum depth reached. Cannot create more than 4 levels of subitems"})
			}
			
			// Find or create level 0 for this item
			var level models.Level
			result := database.DB.Where("item_id = ? AND level_num = 0", itemIdStr).First(&level)
			if result.Error == gorm.ErrRecordNotFound {
				// Create level 0 for this item
				level = models.Level{
					ID:       uuid.New().String(),
					ItemID:   itemIdStr,
					LevelNum: 0,
					Order:    0,
				}
				if err := database.DB.Create(&level).Error; err != nil {
					return c.Status(500).JSON(fiber.Map{"error": "Failed to create level: " + err.Error()})
				}
			} else if result.Error != nil {
				return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
			}
			item.LevelID = &level.ID
			levelChanged = true
		}
	}

	// Recalculate order when level changes
	if levelChanged {
		var maxOrder int
		query := database.DB.Model(&models.Item{})
		if item.LevelID != nil {
			query = query.Where("level_id = ?", *item.LevelID)
		} else {
			query = query.Where("level_id IS NULL")
		}
		query.Where("id != ?", item.ID).Select("COALESCE(MAX(\"order\"), -1)").Scan(&maxOrder)
		item.Order = maxOrder + 1
	}
	
	// Only update order if explicitly provided and different (for drag & drop)
	if orderRaw, ok := updateDataMap["order"]; ok {
		if orderFloat, ok := orderRaw.(float64); ok {
			orderInt := int(orderFloat)
			if orderInt >= 0 && orderInt != item.Order {
				item.Order = orderInt
			}
		}
	}

	result := database.DB.Save(&item)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	// Reload the item to ensure we have the latest data
	var updatedItem models.Item
	database.DB.First(&updatedItem, "id = ?", item.ID)
	
	return c.JSON(updatedItem)
}

// DeleteItem deletes an item and all its descendants recursively
func DeleteItem(c *fiber.Ctx) error {
	id := c.Params("id")
	
	// Delete all items in levels belonging to this item
	var levels []models.Level
	if err := database.DB.Where("item_id = ?", id).Find(&levels).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Delete all items in these levels
	for _, level := range levels {
		if err := database.DB.Unscoped().Where("level_id = ?", level.ID).Delete(&models.Item{}).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		// Delete the level
		if err := database.DB.Unscoped().Delete(&level).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}

	// Delete the item itself
	result := database.DB.Unscoped().Delete(&models.Item{}, "id = ?", id)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Item not found"})
	}

	return c.JSON(fiber.Map{"message": "Item deleted successfully"})
}

// ImportItems imports items and levels from JSON
// Supports both formats: with levels (new format) and without levels (old format, for backward compatibility)
func ImportItems(c *fiber.Ctx) error {
	var data struct {
		Items  []models.Item  `json:"items"`
		Levels []models.Level `json:"levels,omitempty"` // Optional: for backward compatibility
	}

	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON format"})
	}

	// Clear existing items and levels (hard delete)
	if err := database.DB.Unscoped().Exec("DELETE FROM items").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if err := database.DB.Unscoped().Exec("DELETE FROM levels").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Separate root items from subitems
	var rootItems []models.Item
	var subitems []models.Item
	for _, item := range data.Items {
		if item.LevelID == nil {
			rootItems = append(rootItems, item)
		} else {
			subitems = append(subitems, item)
		}
	}

	// If levels are provided, import them first (but they need items to exist first)
	// So we'll import levels after items
	var levelsToImport []models.Level
	if len(data.Levels) > 0 {
		levelsToImport = data.Levels
	} else {
		// Backward compatibility: no levels provided, create them automatically
		// Group items by levelId to find which items need levels
		levelIdToItems := make(map[string][]models.Item)
		for _, item := range subitems {
			if item.LevelID != nil {
				levelIdToItems[*item.LevelID] = append(levelIdToItems[*item.LevelID], item)
			}
		}

		// For each unique levelId, create a level
		// We'll assign it to root items in order
		rootItemIndex := 0
		for levelId, itemsInLevel := range levelIdToItems {
			if len(itemsInLevel) > 0 {
				// Find a root item to assign this level to
				var parentItemID string
				if rootItemIndex < len(rootItems) {
					parentItemID = rootItems[rootItemIndex].ID
					rootItemIndex++
				} else if len(rootItems) > 0 {
					// Reuse first root item if we run out
					parentItemID = rootItems[0].ID
				} else {
					// No root items, we'll create a dummy one later
					// For now, skip this level - we'll handle it after creating dummy root
					continue
				}

				// Create the level
				newLevel := models.Level{
					ID:       levelId,
					ItemID:   parentItemID,
					LevelNum: 0,
					Order:    0,
				}
				levelsToImport = append(levelsToImport, newLevel)
			}
		}

		// If we have subitems but no root items, create a dummy root
		if len(rootItems) == 0 && len(subitems) > 0 {
			dummyRoot := models.Item{
				ID:          uuid.New().String(),
				Title:       "Imported Root",
				Description: "Auto-created root for imported subitems",
				Status:      "todo",
				LevelID:     nil,
				Order:       0,
			}
			rootItems = append(rootItems, dummyRoot)
			
			// Create levels for any remaining levelIds
			levelIdToItems = make(map[string][]models.Item)
			for _, item := range subitems {
				if item.LevelID != nil {
					levelIdToItems[*item.LevelID] = append(levelIdToItems[*item.LevelID], item)
				}
			}
			
			// Check which levelIds don't have levels yet
			existingLevelIds := make(map[string]bool)
			for _, level := range levelsToImport {
				existingLevelIds[level.ID] = true
			}
			
			for levelId, itemsInLevel := range levelIdToItems {
				if !existingLevelIds[levelId] && len(itemsInLevel) > 0 {
					newLevel := models.Level{
						ID:       levelId,
						ItemID:   dummyRoot.ID,
						LevelNum: 0,
						Order:    0,
					}
					levelsToImport = append(levelsToImport, newLevel)
				}
			}
		}
	}

	// Import root items first
	for _, item := range rootItems {
		if item.ID == "" {
			item.ID = uuid.New().String()
		}
		if err := database.DB.Create(&item).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to import root item: " + err.Error()})
		}
	}

	// Import levels (they reference root items which now exist)
	for _, level := range levelsToImport {
		if level.ID == "" {
			level.ID = uuid.New().String()
		}
		if err := database.DB.Create(&level).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to import level: " + err.Error()})
		}
	}

	// Now import all subitems (they reference levels which now exist)
	for _, item := range subitems {
		if item.ID == "" {
			item.ID = uuid.New().String()
		}
		if err := database.DB.Create(&item).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to import item: " + err.Error()})
		}
	}

	return c.JSON(fiber.Map{"message": "Items imported successfully"})
}

// ExportItems exports all items and levels as JSON
func ExportItems(c *fiber.Ctx) error {
	var items []models.Item
	result := database.DB.Order("\"order\" ASC").Find(&items)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": result.Error.Error()})
	}

	var levels []models.Level
	levelResult := database.DB.Order("level_num ASC").Order("\"order\" ASC").Find(&levels)
	if levelResult.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": levelResult.Error.Error()})
	}

	return c.JSON(fiber.Map{
		"items":  items,
		"levels": levels,
	})
}

