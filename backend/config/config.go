package config

import "os"

type Config struct {
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	JWTSecret string
	Port      string
	UploadDir string
}

func Load() *Config {
	return &Config{
		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5432"),
		DBUser:    getEnv("DB_USER", "restaurant_user"),
		DBPass:    getEnv("DB_PASSWORD", "restaurant_pass_2024"),
		DBName:    getEnv("DB_NAME", "restaurant"),
		JWTSecret: getEnv("JWT_SECRET", "restaurant_jwt_secret_key_2024_secure"),
		Port:      getEnv("PORT", "8080"),
		UploadDir: getEnv("UPLOAD_DIR", "./uploads"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
