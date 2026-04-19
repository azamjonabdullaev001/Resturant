package handlers

import (
	"net/http"
	"strconv"

	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
)

type TableHandler struct{}

func NewTableHandler() *TableHandler {
	return &TableHandler{}
}

func (h *TableHandler) GetAll(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, table_number, status, created_at FROM tables ORDER BY table_number")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения столов"})
		return
	}
	defer rows.Close()

	var tables []models.Table
	for rows.Next() {
		var t models.Table
		if err := rows.Scan(&t.ID, &t.TableNumber, &t.Status, &t.CreatedAt); err != nil {
			continue
		}
		tables = append(tables, t)
	}

	if tables == nil {
		tables = []models.Table{}
	}

	c.JSON(http.StatusOK, tables)
}

func (h *TableHandler) Create(c *gin.Context) {
	var req models.CreateTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	var table models.Table
	err := database.DB.QueryRow(
		"INSERT INTO tables (table_number) VALUES ($1) RETURNING id, table_number, status, created_at",
		req.TableNumber,
	).Scan(&table.ID, &table.TableNumber, &table.Status, &table.CreatedAt)

	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Стол с таким номером уже существует"})
		return
	}

	c.JSON(http.StatusCreated, table)
}

func (h *TableHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	if req.Status != "free" && req.Status != "occupied" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Статус должен быть 'free' или 'occupied'"})
		return
	}

	var table models.Table
	err = database.DB.QueryRow(
		"UPDATE tables SET status = $1 WHERE id = $2 RETURNING id, table_number, status, created_at",
		req.Status, id,
	).Scan(&table.ID, &table.TableNumber, &table.Status, &table.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Стол не найден"})
		return
	}

	c.JSON(http.StatusOK, table)
}

func (h *TableHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	result, err := database.DB.Exec("DELETE FROM tables WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления стола"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Стол не найден"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Стол удалён"})
}
