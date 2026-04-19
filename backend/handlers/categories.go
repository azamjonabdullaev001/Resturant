package handlers

import (
	"net/http"
	"strconv"

	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{}
}

func (h *CategoryHandler) GetAll(c *gin.Context) {
	panelType := c.Query("panel_type")

	var query string
	var args []interface{}

	if panelType != "" {
		query = "SELECT id, name, panel_type, COALESCE(description, ''), created_at FROM categories WHERE panel_type = $1 ORDER BY name"
		args = append(args, panelType)
	} else {
		query = "SELECT id, name, panel_type, COALESCE(description, ''), created_at FROM categories ORDER BY panel_type, name"
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения категорий"})
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		if err := rows.Scan(&cat.ID, &cat.Name, &cat.PanelType, &cat.Description, &cat.CreatedAt); err != nil {
			continue
		}
		categories = append(categories, cat)
	}

	if categories == nil {
		categories = []models.Category{}
	}

	c.JSON(http.StatusOK, categories)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req models.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	validPanels := map[string]bool{
		"shashlik": true, "samsa": true, "national": true,
		"dessert": true, "drinks": true,
	}
	if !validPanels[req.PanelType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный тип панели"})
		return
	}

	var cat models.Category
	err := database.DB.QueryRow(
		`INSERT INTO categories (name, panel_type, description) VALUES ($1, $2, $3)
		 RETURNING id, name, panel_type, COALESCE(description, ''), created_at`,
		req.Name, req.PanelType, req.Description,
	).Scan(&cat.ID, &cat.Name, &cat.PanelType, &cat.Description, &cat.CreatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания категории"})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	var cat models.Category
	err = database.DB.QueryRow(
		`UPDATE categories SET name = COALESCE(NULLIF($1, ''), name), description = $2
		 WHERE id = $3 RETURNING id, name, panel_type, COALESCE(description, ''), created_at`,
		req.Name, req.Description, id,
	).Scan(&cat.ID, &cat.Name, &cat.PanelType, &cat.Description, &cat.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Категория не найдена"})
		return
	}

	c.JSON(http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	result, err := database.DB.Exec("DELETE FROM categories WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления категории (возможно, есть связанные блюда)"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Категория не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Категория удалена"})
}
