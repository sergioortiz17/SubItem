package models

import (
	"time"

	"gorm.io/gorm"
)

// Level represents a level in the hierarchy for a specific item
type Level struct {
	ID        string    `json:"id" gorm:"type:uuid;primary_key"`
	ItemID    string    `json:"itemId" gorm:"type:uuid;not null;index"` // The parent item this level belongs to
	LevelNum  int       `json:"levelNum" gorm:"not null;index"`         // Level number (0 = first level, 1 = second, etc.)
	Order     int       `json:"order" gorm:"default:0;index"`           // Order within the same level
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships (commented out to avoid FK constraint during migration)
	// Item   Item    `json:"-" gorm:"foreignKey:ItemID"`
	// Items  []Item  `json:"items,omitempty" gorm:"foreignKey:LevelID"`
}

