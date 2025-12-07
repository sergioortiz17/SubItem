package models

import (
	"time"

	"gorm.io/gorm"
)

type Task struct {
	ID          string    `json:"id" gorm:"type:uuid;primary_key"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	Status      string    `json:"status" gorm:"default:'todo'"` // todo, doing, done
	ParentID    *string   `json:"parentId" gorm:"type:uuid"`
	Order       int       `json:"order" gorm:"default:0"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Self-referential relationship
	Parent   *Task   `json:"-" gorm:"foreignKey:ParentID"`
	Children []Task  `json:"subitems,omitempty" gorm:"foreignKey:ParentID"`
}

// TaskResponse represents the hierarchical structure for API responses
type TaskResponse struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Status      string         `json:"status"`
	ParentID    *string        `json:"parentId"`
	Order       int            `json:"order"`
	Subitems    []TaskResponse `json:"subitems,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// BuildTree builds a hierarchical tree structure from a flat list of tasks
func BuildTree(tasks []Task) []TaskResponse {
	// Create a map for quick lookup
	taskMap := make(map[string]*TaskResponse)
	var rootTasks []TaskResponse

	// First pass: create all task responses
	for _, task := range tasks {
		taskResp := TaskResponse{
			ID:          task.ID,
			Title:       task.Title,
			Description: task.Description,
			Status:      task.Status,
			ParentID:    task.ParentID,
			Order:       task.Order,
			Subitems:    []TaskResponse{},
			CreatedAt:   task.CreatedAt,
			UpdatedAt:   task.UpdatedAt,
		}
		taskMap[task.ID] = &taskResp
	}

	// Second pass: build the tree
	for _, task := range tasks {
		taskResp := taskMap[task.ID]
		if task.ParentID == nil {
			// Root task
			rootTasks = append(rootTasks, *taskResp)
		} else {
			// Child task
			if parent, exists := taskMap[*task.ParentID]; exists {
				parent.Subitems = append(parent.Subitems, *taskResp)
			}
		}
	}

	// Sort by order
	sortTasks(&rootTasks)
	return rootTasks
}

// sortTasks recursively sorts tasks by order
func sortTasks(tasks *[]TaskResponse) {
	if tasks == nil {
		return
	}
	
	// Simple bubble sort by order (can be optimized)
	for i := 0; i < len(*tasks)-1; i++ {
		for j := i + 1; j < len(*tasks); j++ {
			if (*tasks)[i].Order > (*tasks)[j].Order {
				(*tasks)[i], (*tasks)[j] = (*tasks)[j], (*tasks)[i]
			}
		}
	}

	// Sort children recursively
	for i := range *tasks {
		sortTasks(&(*tasks)[i].Subitems)
	}
}

// CountSubitems counts direct and nested subitems
func (t *TaskResponse) CountSubitems() (direct int, total int) {
	direct = len(t.Subitems)
	total = direct
	for _, subitem := range t.Subitems {
		_, nested := subitem.CountSubitems()
		total += nested
	}
	return
}

// CalculateProgress calculates completion percentage
func (t *TaskResponse) CalculateProgress() (completed int, total int, percentage float64) {
	total = 1 // Count self
	completed = 0
	if t.Status == "done" {
		completed = 1
	}

	for _, subitem := range t.Subitems {
		subCompleted, subTotal, _ := subitem.CalculateProgress()
		completed += subCompleted
		total += subTotal
	}

	if total > 0 {
		percentage = float64(completed) / float64(total) * 100
	}
	return
}

