package models

import (
	"time"

	"gorm.io/gorm"
)

// Item represents a task (root item) or subitem associated with a level
type Item struct {
	ID          string    `json:"id" gorm:"type:uuid;primary_key"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	Status      string    `json:"status" gorm:"default:'todo';index"` // todo, doing, done
	LevelID     *string   `json:"levelId" gorm:"type:uuid;index"`    // null = root task, otherwise points to a level
	Order       int       `json:"order" gorm:"default:0;index"`       // order within the same level
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships (commented out to avoid FK constraint during migration)
	// Level *Level `json:"-" gorm:"foreignKey:LevelID"`
}

// ItemResponse represents the hierarchical structure for API responses
type ItemResponse struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Status      string         `json:"status"`
	LevelID     *string        `json:"levelId"`     // null = root task
	LevelNum    *int           `json:"levelNum"`    // Level number if associated with a level
	Order       int            `json:"order"`
	Subitems    []ItemResponse `json:"subitems,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// BuildTree builds a hierarchical tree structure from items and levels
// Items with LevelID = null are root tasks
// Items with LevelID point to a level, and levels belong to items (which can be root items or subitems)
// This function handles nested subitems recursively up to MAX_DEPTH levels
const MAX_DEPTH = 7

func BuildTree(items []Item, levels []Level) []ItemResponse {
	if len(items) == 0 {
		return []ItemResponse{}
	}

	// Create maps for O(1) lookup
	itemMap := make(map[string]*ItemResponse)
	levelMap := make(map[string]*Level) // level ID -> Level
	levelsByItemID := make(map[string][]*Level) // item ID -> []Level (levels belonging to this item)

	// Index levels by their item ID and by level ID
	for i := range levels {
		level := &levels[i]
		levelMap[level.ID] = level
		if _, exists := levelsByItemID[level.ItemID]; !exists {
			levelsByItemID[level.ItemID] = []*Level{}
		}
		levelsByItemID[level.ItemID] = append(levelsByItemID[level.ItemID], level)
	}

	// First pass: create all item responses and store in map
	for i := range items {
		item := items[i]
		levelNum := (*int)(nil)
		if item.LevelID != nil {
			if level, exists := levelMap[*item.LevelID]; exists {
				num := level.LevelNum
				levelNum = &num
			}
		}
		
		itemResp := &ItemResponse{
			ID:          item.ID,
			Title:       item.Title,
			Description: item.Description,
			Status:      item.Status,
			LevelID:     item.LevelID,
			LevelNum:    levelNum,
			Order:       item.Order,
			Subitems:    []ItemResponse{},
			CreatedAt:   item.CreatedAt,
			UpdatedAt:   item.UpdatedAt,
		}
		itemMap[item.ID] = itemResp
	}

	// Second pass: build the tree structure recursively
	// Items with LevelID belong to a level, and levels belong to items (which can be root items or subitems)
	// We need to build this recursively to handle nested subitems
	var rootItems []ItemResponse
	
	// Helper function to recursively build subitems for an item
	var buildSubitems func(itemID string, depth int) []ItemResponse
	buildSubitems = func(itemID string, depth int) []ItemResponse {
		if depth >= MAX_DEPTH {
			return []ItemResponse{} // Stop at max depth
		}
		
		// Find all levels that belong to this item
		itemLevels, hasLevels := levelsByItemID[itemID]
		if !hasLevels || len(itemLevels) == 0 {
			return []ItemResponse{}
		}
		
		var subitems []ItemResponse
		
		// For each level belonging to this item, find all items in that level
		for _, level := range itemLevels {
			// Find all items that belong to this level
			for i := range items {
				item := items[i]
				if item.LevelID != nil && *item.LevelID == level.ID {
					// This item belongs to this level
					subitemResp := *itemMap[item.ID]
					// Recursively build subitems for this subitem
					subitemResp.Subitems = buildSubitems(item.ID, depth+1)
					subitems = append(subitems, subitemResp)
				}
			}
		}
		
		// Sort subitems by order
		if len(subitems) > 1 {
			sortItems(&subitems)
		}
		
		return subitems
	}

	// Third pass: add root items (items with LevelID = null) and build their subitems
	for i := range items {
		item := items[i]
		if item.LevelID == nil {
			// Root item - add to root list
			rootItemResp := *itemMap[item.ID]
			// Recursively build subitems starting at depth 0
			rootItemResp.Subitems = buildSubitems(item.ID, 0)
			rootItems = append(rootItems, rootItemResp)
		}
	}

	// Sort root items by order
	sortItems(&rootItems)
	return rootItems
}

// sortItems recursively sorts items by order
func sortItems(items *[]ItemResponse) {
	if items == nil || len(*items) <= 1 {
		return
	}
	
	// Insertion sort (efficient for mostly-sorted data)
	for i := 1; i < len(*items); i++ {
		key := (*items)[i]
		j := i - 1
		
		// Move elements greater than key one position ahead
		for j >= 0 && (*items)[j].Order > key.Order {
			(*items)[j+1] = (*items)[j]
			j--
		}
		(*items)[j+1] = key
	}

	// Sort children recursively
	for i := range *items {
		if len((*items)[i].Subitems) > 0 {
			sortItems(&(*items)[i].Subitems)
		}
	}
}

// CountSubitems counts direct and nested subitems
func (i *ItemResponse) CountSubitems() (direct int, total int) {
	direct = len(i.Subitems)
	total = direct
	for _, subitem := range i.Subitems {
		_, nested := subitem.CountSubitems()
		total += nested
	}
	return
}

// CalculateProgress calculates completion percentage
func (i *ItemResponse) CalculateProgress() (completed int, total int, percentage float64) {
	total = 1 // Count self
	completed = 0
	if i.Status == "done" {
		completed = 1
	}

	for _, subitem := range i.Subitems {
		subCompleted, subTotal, _ := subitem.CalculateProgress()
		completed += subCompleted
		total += subTotal
	}

	if total > 0 {
		percentage = float64(completed) / float64(total) * 100
	}
	return
}


