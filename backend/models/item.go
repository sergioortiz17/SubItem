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
// Items with LevelID point to a level, and levels belong to root tasks
func BuildTree(items []Item, levels []Level) []ItemResponse {
	if len(items) == 0 {
		return []ItemResponse{}
	}

	// Create maps for O(1) lookup
	itemMap := make(map[string]*ItemResponse)
	levelMap := make(map[string]*Level) // level ID -> Level
	levelsByItemID := make(map[string][]*Level) // item ID -> []Level (levels belonging to this item)
	var rootItems []ItemResponse

	// Index levels by their item ID
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

	// Second pass: build the tree structure using levels
	// Items with LevelID belong to a level, and levels belong to root items
	for i := range items {
		item := items[i]
		if item.LevelID != nil {
			// This item belongs to a level
			if level, exists := levelMap[*item.LevelID]; exists {
				// Find the root item that owns this level
				if rootItem, exists := itemMap[level.ItemID]; exists {
					// Add this item as a subitem of the root item
					rootItem.Subitems = append(rootItem.Subitems, *itemMap[item.ID])
				}
			}
		}
	}

	// Third pass: add root items (items with LevelID = null) to the result
	for i := range items {
		item := items[i]
		if item.LevelID == nil {
			// Root item - add to root list
			rootItems = append(rootItems, *itemMap[item.ID])
		}
	}

	// Sort by order (recursively)
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

