package handlers

import (
	"net/http"
	"strconv"

	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
)

type MenuHandler struct{}

func NewMenuHandler() *MenuHandler {
	return &MenuHandler{}
}

func (h *MenuHandler) GetAll(c *gin.Context) {
	panelType := c.Query("panel_type")
	categoryID := c.Query("category_id")
	availableOnly := c.Query("available") == "true"

	query := `SELECT m.id, m.category_id, c.name, c.panel_type, m.name, COALESCE(m.description, ''),
			  m.price, m.quantity, COALESCE(m.image_url, ''), m.available, m.created_at, m.updated_at
			  FROM menu_items m JOIN categories c ON m.category_id = c.id WHERE 1=1`
	var args []interface{}
	argIdx := 1

	if panelType != "" {
		query += " AND c.panel_type = $" + strconv.Itoa(argIdx)
		args = append(args, panelType)
		argIdx++
	}
	if categoryID != "" {
		query += " AND m.category_id = $" + strconv.Itoa(argIdx)
		args = append(args, categoryID)
		argIdx++
	}
	if availableOnly {
		query += " AND m.available = true AND m.quantity > 0"
	}

	query += " ORDER BY c.panel_type, c.name, m.name"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения меню"})
		return
	}
	defer rows.Close()

	var items []models.MenuItem
	for rows.Next() {
		var item models.MenuItem
		if err := rows.Scan(
			&item.ID, &item.CategoryID, &item.CategoryName, &item.PanelType,
			&item.Name, &item.Description, &item.Price, &item.Quantity,
			&item.ImageURL, &item.Available, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			continue
		}
		items = append(items, item)
	}

	if items == nil {
		items = []models.MenuItem{}
	}

	c.JSON(http.StatusOK, items)
}

func (h *MenuHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var item models.MenuItem
	err = database.DB.QueryRow(
		`SELECT m.id, m.category_id, c.name, c.panel_type, m.name, COALESCE(m.description, ''),
		 m.price, m.quantity, COALESCE(m.image_url, ''), m.available, m.created_at, m.updated_at
		 FROM menu_items m JOIN categories c ON m.category_id = c.id WHERE m.id = $1`, id,
	).Scan(
		&item.ID, &item.CategoryID, &item.CategoryName, &item.PanelType,
		&item.Name, &item.Description, &item.Price, &item.Quantity,
		&item.ImageURL, &item.Available, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Блюдо не найдено"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *MenuHandler) Create(c *gin.Context) {
	var req models.CreateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	// Check that user has access to this category's panel
	role := c.GetString("role")
	if role != "admin" {
		var panelType string
		err := database.DB.QueryRow("SELECT panel_type FROM categories WHERE id = $1", req.CategoryID).Scan(&panelType)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Категория не найдена"})
			return
		}
		if panelType != role {
			c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этой категории"})
			return
		}
	}

	var item models.MenuItem
	err := database.DB.QueryRow(
		`INSERT INTO menu_items (category_id, name, description, price, quantity, image_url)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, category_id, name, COALESCE(description, ''), price, quantity, COALESCE(image_url, ''), available, created_at, updated_at`,
		req.CategoryID, req.Name, req.Description, req.Price, req.Quantity, req.ImageURL,
	).Scan(&item.ID, &item.CategoryID, &item.Name, &item.Description, &item.Price, &item.Quantity, &item.ImageURL, &item.Available, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания блюда: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *MenuHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req models.UpdateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	// Check access
	role := c.GetString("role")
	if role != "admin" {
		var panelType string
		err := database.DB.QueryRow(
			"SELECT c.panel_type FROM menu_items m JOIN categories c ON m.category_id = c.id WHERE m.id = $1", id,
		).Scan(&panelType)
		if err != nil || panelType != role {
			c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к этому блюду"})
			return
		}
	}

	if req.Name != "" {
		database.DB.Exec("UPDATE menu_items SET name = $1, updated_at = NOW() WHERE id = $2", req.Name, id)
	}
	if req.Description != "" {
		database.DB.Exec("UPDATE menu_items SET description = $1, updated_at = NOW() WHERE id = $2", req.Description, id)
	}
	if req.Price > 0 {
		database.DB.Exec("UPDATE menu_items SET price = $1, updated_at = NOW() WHERE id = $2", req.Price, id)
	}
	if req.Quantity >= 0 {
		database.DB.Exec("UPDATE menu_items SET quantity = $1, updated_at = NOW() WHERE id = $2", req.Quantity, id)
	}
	if req.ImageURL != "" {
		database.DB.Exec("UPDATE menu_items SET image_url = $1, updated_at = NOW() WHERE id = $2", req.ImageURL, id)
	}
	if req.Available != nil {
		database.DB.Exec("UPDATE menu_items SET available = $1, updated_at = NOW() WHERE id = $2", *req.Available, id)
	}

	var item models.MenuItem
	err = database.DB.QueryRow(
		`SELECT m.id, m.category_id, c.name, c.panel_type, m.name, COALESCE(m.description, ''),
		 m.price, m.quantity, COALESCE(m.image_url, ''), m.available, m.created_at, m.updated_at
		 FROM menu_items m JOIN categories c ON m.category_id = c.id WHERE m.id = $1`, id,
	).Scan(
		&item.ID, &item.CategoryID, &item.CategoryName, &item.PanelType,
		&item.Name, &item.Description, &item.Price, &item.Quantity,
		&item.ImageURL, &item.Available, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Блюдо не найдено"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *MenuHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	result, err := database.DB.Exec("DELETE FROM menu_items WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления блюда"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Блюдо не найдено"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Блюдо удалено"})
}
