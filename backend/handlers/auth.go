package handlers

import (
	"net/http"
	"time"

	"restaurant-api/config"
	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Config *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{Config: cfg}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, phone, password_hash, name, role, active FROM users WHERE phone = $1",
		req.Phone,
	).Scan(&user.ID, &user.Phone, &user.PasswordHash, &user.Name, &user.Role, &user.Active)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный номер телефона или пароль"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"error": "Аккаунт деактивирован"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный номер телефона или пароль"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"phone":   user.Phone,
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.Config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации токена"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: tokenString,
		User:  user,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetInt("user_id")

	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, phone, name, role, active, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Phone, &user.Name, &user.Role, &user.Active, &user.CreatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, user)
}
