package database

import (
	"fmt"
	"log"
	"os"

	"roadmap-subitem/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}

// ResetDatabase completely resets the database by dropping all tables and recreating
func ResetDatabase() {
	log.Println("Resetting database...")
	
	// Drop old tables if they exist
	DB.Migrator().DropTable("tasks")
	DB.Migrator().DropTable("subitems")
	
	// Drop the new tables if they exist
	DB.Migrator().DropTable(&models.Item{})
	DB.Migrator().DropTable("items")
	DB.Migrator().DropTable(&models.Level{})
	DB.Migrator().DropTable("levels")
	
	log.Println("Old tables dropped")
}

func Migrate() {
	// Reset database completely
	ResetDatabase()
	
	// Create levels table first (no dependencies)
	err := DB.AutoMigrate(&models.Level{})
	if err != nil {
		log.Fatal("Failed to migrate levels table:", err)
	}
	log.Println("Levels table created")
	
	// Create items table (without FK constraint - we'll add it manually)
	err = DB.AutoMigrate(&models.Item{})
	if err != nil {
		log.Fatal("Failed to migrate items table:", err)
	}
	log.Println("Items table created")
	
	// Add foreign key constraint manually after both tables exist
	// Check if constraint already exists
	var constraintExists int
	DB.Raw(`
		SELECT COUNT(*) 
		FROM information_schema.table_constraints 
		WHERE constraint_name = 'fk_items_level_id' 
		AND table_name = 'items'
	`).Scan(&constraintExists)
	
	if constraintExists == 0 {
		err = DB.Exec(`
			ALTER TABLE items 
			ADD CONSTRAINT fk_items_level_id 
			FOREIGN KEY (level_id) 
			REFERENCES levels(id) 
			ON DELETE SET NULL
		`).Error
		if err != nil {
			log.Printf("Warning: Could not add foreign key constraint (may already exist): %v", err)
		} else {
			log.Println("Foreign key constraint added")
		}
	}
	
	log.Println("Database migration completed - levels and items tables created")
	
	// Optional: Seed with sample data
	seedDatabase()
}

// seedDatabase creates sample data for testing
func seedDatabase() {
	// Check if items already exist
	var count int64
	DB.Model(&models.Item{}).Count(&count)
	if count > 0 {
		log.Println("Database already has items, skipping seed")
		return
	}

	log.Println("Seeding database with sample data...")
	
	// Create root item (task)
	rootID := "00000000-0000-0000-0000-000000000001"
	root := models.Item{
		ID:          rootID,
		Title:       "Tarea Raíz de Ejemplo",
		Description: "Esta es una tarea raíz de ejemplo",
		Status:      "todo",
		LevelID:     nil, // Root task has no level
		Order:       0,
	}
	DB.Create(&root)

	// Create level 0 for this root item
	level0ID := "00000000-0000-0000-0000-000000000010"
	level0 := models.Level{
		ID:       level0ID,
		ItemID:   rootID,
		LevelNum: 0,
		Order:    0,
	}
	DB.Create(&level0)

	// Create subitems associated with level 0
	subitem1ID := "00000000-0000-0000-0000-000000000002"
	subitem1 := models.Item{
		ID:          subitem1ID,
		Title:       "Subitem 1",
		Description: "Primer subitem",
		Status:      "todo",
		LevelID:     &level0ID,
		Order:       0,
	}
	DB.Create(&subitem1)

	subitem2ID := "00000000-0000-0000-0000-000000000003"
	subitem2 := models.Item{
		ID:          subitem2ID,
		Title:       "Subitem 2",
		Description: "Segundo subitem",
		Status:      "doing",
		LevelID:     &level0ID,
		Order:       1,
	}
	DB.Create(&subitem2)

	log.Println("Sample data seeded successfully")
}


