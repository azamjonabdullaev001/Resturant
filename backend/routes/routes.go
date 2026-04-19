package routes

import (
	"restaurant-api/config"
	"restaurant-api/handlers"
	"restaurant-api/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, cfg *config.Config) {
	authH := handlers.NewAuthHandler(cfg)
	userH := handlers.NewUserHandler()
	tableH := handlers.NewTableHandler()
	catH := handlers.NewCategoryHandler()
	menuH := handlers.NewMenuHandler()
	orderH := handlers.NewOrderHandler()
	uploadH := handlers.NewUploadHandler(cfg)

	api := r.Group("/api")

	// Public
	api.POST("/login", authH.Login)

	// Protected routes
	auth := api.Group("")
	auth.Use(middleware.AuthMiddleware(cfg))
	{
		auth.GET("/me", authH.Me)

		// Dashboard (admin only)
		auth.GET("/dashboard", middleware.AdminOnly(), orderH.GetDashboard)

		// Users (admin only)
		admin := auth.Group("")
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/users", userH.GetAll)
			admin.POST("/users", userH.Create)
			admin.PUT("/users/:id", userH.Update)
			admin.DELETE("/users/:id", userH.Delete)
		}

		// Tables
		auth.GET("/tables", tableH.GetAll)
		auth.POST("/tables", middleware.AdminOnly(), tableH.Create)
		auth.PUT("/tables/:id/status", tableH.UpdateStatus)
		auth.DELETE("/tables/:id", middleware.AdminOnly(), tableH.Delete)

		// Categories
		auth.GET("/categories", catH.GetAll)
		auth.POST("/categories", middleware.RoleAccess("admin", "shashlik", "samsa", "national"), catH.Create)
		auth.PUT("/categories/:id", middleware.RoleAccess("admin", "shashlik", "samsa", "national"), catH.Update)
		auth.DELETE("/categories/:id", middleware.AdminOnly(), catH.Delete)

		// Menu
		auth.GET("/menu", menuH.GetAll)
		auth.GET("/menu/:id", menuH.GetByID)
		auth.POST("/menu", middleware.RoleAccess("admin", "shashlik", "samsa", "national", "dessert"), menuH.Create)
		auth.PUT("/menu/:id", middleware.RoleAccess("admin", "shashlik", "samsa", "national", "dessert"), menuH.Update)
		auth.DELETE("/menu/:id", middleware.RoleAccess("admin", "shashlik", "samsa", "national", "dessert"), menuH.Delete)

		// Orders
		auth.GET("/orders", orderH.GetAll)
		auth.GET("/orders/:id", orderH.GetByID)
		auth.POST("/orders", middleware.RoleAccess("admin", "waiter"), orderH.Create)
		auth.PUT("/orders/:id/pay", middleware.RoleAccess("admin"), orderH.MarkPaid)
		auth.PUT("/orders/:id/cancel", middleware.RoleAccess("admin", "waiter"), orderH.Cancel)

		// Waiter orders
		auth.GET("/my-orders", middleware.RoleAccess("waiter"), orderH.GetMyOrders)

		// Kitchen panel orders
		auth.GET("/panel/:panel_type/orders", orderH.GetByPanel)
		auth.PUT("/order-items/:id/status", orderH.UpdateItemStatus)

		// Upload
		auth.POST("/upload", uploadH.Upload)
	}
}
