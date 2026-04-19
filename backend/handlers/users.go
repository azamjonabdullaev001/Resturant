package handlers

import (
	"net/http"
	"strconv"

	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) GetAll(c *gin.Context) {
	rows, err := database.DB.Query(
		"SELECT id, phone, name, role, active, created_at, updated_at FROM users ORDER BY created_at DESC",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения пользователей"})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Active, &u.CreatedAt, &u.UpdatedAt); err != nil {
			continue
		}
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	validRoles := map[string]bool{
		"admin": true, "waiter": true, "shashlik": true,
		"samsa": true, "national": true, "dessert": true,
	}
	if !validRoles[req.Role] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверная роль пользователя"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка хеширования пароля"})
		return
	}

	var user models.User
	err = database.DB.QueryRow(
		`INSERT INTO users (phone, password_hash, name, role) VALUES ($1, $2, $3, $4)
		 RETURNING id, phone, name, role, active, created_at, updated_at`,
		req.Phone, string(hash), req.Name, req.Role,
	).Scan(&user.ID, &user.Phone, &user.Name, &user.Role, &user.Active, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким номером уже существует"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req struct {
		Name     string `json:"name"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
		Role     string `json:"role"`
		Active   *bool  `json:"active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	if req.Name != "" {
		database.DB.Exec("UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2", req.Name, id)
	}
	if req.Phone != "" {
		database.DB.Exec("UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2", req.Phone, id)
	}
	if req.Role != "" {
		database.DB.Exec("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", req.Role, id)
	}
	if req.Active != nil {
		database.DB.Exec("UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2", *req.Active, id)
	}
	if req.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err == nil {
			database.DB.Exec("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", string(hash), id)
		}
	}

	var user models.User
	err = database.DB.QueryRow(
		"SELECT id, phone, name, role, active, created_at, updated_at FROM users WHERE id = $1", id,
	).Scan(&user.ID, &user.Phone, &user.Name, &user.Role, &user.Active, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	result, err := database.DB.Exec("DELETE FROM users WHERE id = $1 AND role != 'admin'", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден или является администратором"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Пользователь удалён"})
}
