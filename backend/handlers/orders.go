package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"restaurant-api/database"
	"restaurant-api/models"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct{}

func NewOrderHandler() *OrderHandler {
	return &OrderHandler{}
}

func (h *OrderHandler) Create(c *gin.Context) {
	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	waiterID := c.GetInt("user_id")

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания заказа"})
		return
	}
	defer tx.Rollback()

	// Mark table as occupied
	_, err = tx.Exec("UPDATE tables SET status = 'occupied' WHERE id = $1", req.TableID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Стол не найден"})
		return
	}

	// Create order
	var orderID int
	var totalPrice float64

	err = tx.QueryRow(
		"INSERT INTO orders (table_id, waiter_id) VALUES ($1, $2) RETURNING id",
		req.TableID, waiterID,
	).Scan(&orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания заказа"})
		return
	}

	// Add items
	for _, item := range req.Items {
		var price float64
		var panelType string
		var currentQty int

		err = tx.QueryRow(
			`SELECT m.price, c.panel_type, m.quantity FROM menu_items m
			 JOIN categories c ON m.category_id = c.id
			 WHERE m.id = $1 AND m.available = true`, item.MenuItemID,
		).Scan(&price, &panelType, &currentQty)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Блюдо не найдено или недоступно"})
			return
		}

		if currentQty < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Недостаточное количество блюда на складе"})
			return
		}

		// Reduce quantity
		_, err = tx.Exec(
			"UPDATE menu_items SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2",
			item.Quantity, item.MenuItemID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления количества"})
			return
		}

		// Insert order item
		itemTotal := price * float64(item.Quantity)
		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, menu_item_id, quantity, price, panel_type)
			 VALUES ($1, $2, $3, $4, $5)`,
			orderID, item.MenuItemID, item.Quantity, itemTotal, panelType,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка добавления позиции"})
			return
		}

		totalPrice += itemTotal
	}

	// Update total price
	_, err = tx.Exec("UPDATE orders SET total_price = $1 WHERE id = $2", totalPrice, orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления суммы заказа"})
		return
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения заказа"})
		return
	}

	// Fetch full order
	order := h.fetchOrder(orderID)
	if order == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Заказ создан, но не удалось получить данные"})
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *OrderHandler) GetAll(c *gin.Context) {
	status := c.Query("status")
	paid := c.Query("paid")
	waiterID := c.Query("waiter_id")

	query := `SELECT o.id, o.table_id, t.table_number, o.waiter_id, u.name,
			  o.status, o.total_price, o.paid, o.created_at, o.updated_at
			  FROM orders o
			  JOIN tables t ON o.table_id = t.id
			  JOIN users u ON o.waiter_id = u.id WHERE 1=1`
	var args []interface{}
	argIdx := 1

	if status != "" {
		query += " AND o.status = $" + strconv.Itoa(argIdx)
		args = append(args, status)
		argIdx++
	}
	if paid != "" {
		query += " AND o.paid = $" + strconv.Itoa(argIdx)
		args = append(args, paid == "true")
		argIdx++
	}
	if waiterID != "" {
		query += " AND o.waiter_id = $" + strconv.Itoa(argIdx)
		args = append(args, waiterID)
		argIdx++
	}

	query += " ORDER BY o.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения заказов"})
		return
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(
			&o.ID, &o.TableID, &o.TableNum, &o.WaiterID, &o.WaiterName,
			&o.Status, &o.TotalPrice, &o.Paid, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			continue
		}
		orders = append(orders, o)
	}

	if orders == nil {
		orders = []models.Order{}
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	order := h.fetchOrder(id)
	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) GetByPanel(c *gin.Context) {
	panelType := c.Param("panel_type")
	status := c.DefaultQuery("status", "pending")

	query := `SELECT oi.id, oi.order_id, oi.menu_item_id, m.name, oi.quantity, oi.price,
			  oi.panel_type, oi.status, oi.created_at, oi.updated_at,
			  o.id, t.table_number, u.name
			  FROM order_items oi
			  JOIN orders o ON oi.order_id = o.id
			  JOIN menu_items m ON oi.menu_item_id = m.id
			  JOIN tables t ON o.table_id = t.id
			  JOIN users u ON o.waiter_id = u.id
			  WHERE oi.panel_type = $1`
	var args []interface{}
	args = append(args, panelType)

	if status != "all" {
		query += " AND oi.status = $2"
		args = append(args, status)
	}

	query += " ORDER BY oi.created_at ASC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения заказов панели"})
		return
	}
	defer rows.Close()

	type PanelOrderItem struct {
		models.OrderItem
		TableNumber int    `json:"table_number"`
		WaiterName  string `json:"waiter_name"`
	}

	var items []PanelOrderItem
	for rows.Next() {
		var item PanelOrderItem
		var orderID int
		if err := rows.Scan(
			&item.ID, &item.OrderID, &item.MenuItemID, &item.MenuItemName,
			&item.Quantity, &item.Price, &item.PanelType, &item.Status,
			&item.CreatedAt, &item.UpdatedAt,
			&orderID, &item.TableNumber, &item.WaiterName,
		); err != nil {
			continue
		}
		items = append(items, item)
	}

	if items == nil {
		items = []PanelOrderItem{}
	}

	c.JSON(http.StatusOK, items)
}

func (h *OrderHandler) UpdateItemStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var req models.UpdateOrderItemStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	validStatuses := map[string]bool{"pending": true, "preparing": true, "ready": true, "served": true}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный статус"})
		return
	}

	_, err = database.DB.Exec(
		"UPDATE order_items SET status = $1, updated_at = NOW() WHERE id = $2",
		req.Status, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления статуса"})
		return
	}

	// Check if all items in the order are ready
	var orderID int
	database.DB.QueryRow("SELECT order_id FROM order_items WHERE id = $1", id).Scan(&orderID)
	if orderID > 0 {
		var pendingCount int
		database.DB.QueryRow(
			"SELECT COUNT(*) FROM order_items WHERE order_id = $1 AND status != 'ready' AND status != 'served'",
			orderID,
		).Scan(&pendingCount)
		if pendingCount == 0 {
			database.DB.Exec("UPDATE orders SET status = 'ready', updated_at = NOW() WHERE id = $1", orderID)
		} else {
			database.DB.Exec("UPDATE orders SET status = 'preparing', updated_at = NOW() WHERE id = $1", orderID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Статус обновлён"})
}

func (h *OrderHandler) MarkPaid(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	var tableID int
	err = database.DB.QueryRow(
		"UPDATE orders SET paid = true, status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING table_id",
		id,
	).Scan(&tableID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}

	// Check if table has other unpaid orders; if not, free the table
	var unpaidCount int
	database.DB.QueryRow(
		"SELECT COUNT(*) FROM orders WHERE table_id = $1 AND paid = false", tableID,
	).Scan(&unpaidCount)
	if unpaidCount == 0 {
		database.DB.Exec("UPDATE tables SET status = 'free' WHERE id = $1", tableID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Заказ оплачен"})
}

func (h *OrderHandler) Cancel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка"})
		return
	}
	defer tx.Rollback()

	// Restore quantities
	rows, err := tx.Query(
		"SELECT menu_item_id, quantity FROM order_items WHERE order_id = $1", id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения позиций"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var menuItemID, qty int
		rows.Scan(&menuItemID, &qty)
		tx.Exec("UPDATE menu_items SET quantity = quantity + $1 WHERE id = $2", qty, menuItemID)
	}

	var tableID int
	tx.QueryRow(
		"UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING table_id", id,
	).Scan(&tableID)

	// Free table if no other active orders
	var activeCount int
	tx.QueryRow(
		"SELECT COUNT(*) FROM orders WHERE table_id = $1 AND status NOT IN ('cancelled', 'paid')", tableID,
	).Scan(&activeCount)
	if activeCount == 0 {
		tx.Exec("UPDATE tables SET status = 'free' WHERE id = $1", tableID)
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Заказ отменён"})
}

func (h *OrderHandler) GetDashboard(c *gin.Context) {
	var stats models.DashboardStats

	database.DB.QueryRow("SELECT COUNT(*) FROM orders").Scan(&stats.TotalOrders)
	database.DB.QueryRow("SELECT COUNT(*) FROM orders WHERE paid = false AND status != 'cancelled'").Scan(&stats.UnpaidOrders)
	database.DB.QueryRow("SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE paid = true AND DATE(created_at) = CURRENT_DATE").Scan(&stats.TodayRevenue)
	database.DB.QueryRow("SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE paid = true").Scan(&stats.TotalRevenue)
	database.DB.QueryRow("SELECT COUNT(*) FROM tables WHERE status = 'occupied'").Scan(&stats.ActiveTables)
	database.DB.QueryRow("SELECT COUNT(*) FROM tables").Scan(&stats.TotalTables)
	database.DB.QueryRow("SELECT COUNT(*) FROM menu_items").Scan(&stats.TotalMenuItems)
	database.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)

	c.JSON(http.StatusOK, stats)
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	waiterID := c.GetInt("user_id")

	rows, err := database.DB.Query(
		`SELECT o.id, o.table_id, t.table_number, o.waiter_id, '',
		 o.status, o.total_price, o.paid, o.created_at, o.updated_at
		 FROM orders o JOIN tables t ON o.table_id = t.id
		 WHERE o.waiter_id = $1 AND o.status NOT IN ('paid', 'cancelled')
		 ORDER BY o.created_at DESC`, waiterID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения заказов"})
		return
	}
	defer rows.Close()

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(
			&o.ID, &o.TableID, &o.TableNum, &o.WaiterID, &o.WaiterName,
			&o.Status, &o.TotalPrice, &o.Paid, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			continue
		}
		orders = append(orders, o)
	}

	if orders == nil {
		orders = []models.Order{}
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) fetchOrder(id int) *models.Order {
	var o models.Order
	err := database.DB.QueryRow(
		`SELECT o.id, o.table_id, t.table_number, o.waiter_id, u.name,
		 o.status, o.total_price, o.paid, o.created_at, o.updated_at
		 FROM orders o
		 JOIN tables t ON o.table_id = t.id
		 JOIN users u ON o.waiter_id = u.id
		 WHERE o.id = $1`, id,
	).Scan(
		&o.ID, &o.TableID, &o.TableNum, &o.WaiterID, &o.WaiterName,
		&o.Status, &o.TotalPrice, &o.Paid, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return nil
	}

	rows, err := database.DB.Query(
		`SELECT oi.id, oi.order_id, oi.menu_item_id, m.name, oi.quantity,
		 oi.price, oi.panel_type, oi.status, oi.created_at, oi.updated_at
		 FROM order_items oi JOIN menu_items m ON oi.menu_item_id = m.id
		 WHERE oi.order_id = $1`, id,
	)
	if err != nil {
		return &o
	}
	defer rows.Close()

	for rows.Next() {
		var item models.OrderItem
		if err := rows.Scan(
			&item.ID, &item.OrderID, &item.MenuItemID, &item.MenuItemName,
			&item.Quantity, &item.Price, &item.PanelType, &item.Status,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			continue
		}
		o.Items = append(o.Items, item)
	}

	if o.Items == nil {
		o.Items = []models.OrderItem{}
	}

	return &o
}
