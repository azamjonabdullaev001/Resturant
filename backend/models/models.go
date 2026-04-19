package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Phone        string    `json:"phone"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Table struct {
	ID          int       `json:"id"`
	TableNumber int       `json:"table_number"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type Category struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	PanelType   string    `json:"panel_type"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type MenuItem struct {
	ID           int       `json:"id"`
	CategoryID   int       `json:"category_id"`
	CategoryName string    `json:"category_name,omitempty"`
	PanelType    string    `json:"panel_type,omitempty"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Price        float64   `json:"price"`
	Quantity     int       `json:"quantity"`
	ImageURL     string    `json:"image_url"`
	Available    bool      `json:"available"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Order struct {
	ID         int         `json:"id"`
	TableID    int         `json:"table_id"`
	TableNum   int         `json:"table_number,omitempty"`
	WaiterID   int         `json:"waiter_id"`
	WaiterName string      `json:"waiter_name,omitempty"`
	Status     string      `json:"status"`
	TotalPrice float64     `json:"total_price"`
	Paid       bool        `json:"paid"`
	Items      []OrderItem `json:"items,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID           int       `json:"id"`
	OrderID      int       `json:"order_id"`
	MenuItemID   int       `json:"menu_item_id"`
	MenuItemName string    `json:"menu_item_name,omitempty"`
	Quantity     int       `json:"quantity"`
	Price        float64   `json:"price"`
	PanelType    string    `json:"panel_type"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Request/Response types

type LoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=1,max=8"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateUserRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=1,max=8"`
	Name     string `json:"name" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

type CreateTableRequest struct {
	TableNumber int `json:"table_number" binding:"required,min=1"`
}

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	PanelType   string `json:"panel_type" binding:"required"`
	Description string `json:"description"`
}

type CreateMenuItemRequest struct {
	CategoryID  int     `json:"category_id" binding:"required"`
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required,min=0"`
	Quantity    int     `json:"quantity" binding:"min=0"`
	ImageURL    string  `json:"image_url"`
}

type UpdateMenuItemRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
	ImageURL    string  `json:"image_url"`
	Available   *bool   `json:"available"`
}

type CreateOrderRequest struct {
	TableID int              `json:"table_id" binding:"required"`
	Items   []OrderItemInput `json:"items" binding:"required,min=1"`
}

type OrderItemInput struct {
	MenuItemID int `json:"menu_item_id" binding:"required"`
	Quantity   int `json:"quantity" binding:"required,min=1"`
}

type UpdateOrderItemStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type DashboardStats struct {
	TotalOrders    int     `json:"total_orders"`
	UnpaidOrders   int     `json:"unpaid_orders"`
	TodayRevenue   float64 `json:"today_revenue"`
	TotalRevenue   float64 `json:"total_revenue"`
	ActiveTables   int     `json:"active_tables"`
	TotalTables    int     `json:"total_tables"`
	TotalMenuItems int     `json:"total_menu_items"`
	TotalUsers     int     `json:"total_users"`
}
