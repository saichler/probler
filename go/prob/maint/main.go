package main

import (
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/saichler/l8utils/go/utils/ipsegment"
)

//go:embed web/*
var webContent embed.FS

const (
	port       = "2443"
	certFile   = "/data/probler.crt"
	keyFile    = "/data/probler.crtKey"
	configFile = "/data/maint-config.json"
)

// Config holds the maintenance page configuration
type Config struct {
	EstimatedReturn string `json:"estimated_return"`
	SupportEmail    string `json:"support_email"`
	Description     string `json:"description"`
}

var config Config
var indexTemplate *template.Template

func loadConfig() error {
	// Try to load from /data first, fall back to local config
	configPath := configFile
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Fall back to local config.json next to the binary
		execPath, err := os.Executable()
		if err == nil {
			configPath = filepath.Join(filepath.Dir(execPath), "config.json")
		}
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		// Use defaults if config file not found
		log.Printf("Config file not found at %s, using defaults", configPath)
		config = Config{
			EstimatedReturn: "--:-- UTC",
			SupportEmail:    "support@probler.io",
			Description:     "Performing scheduled maintenance.",
		}
		return nil
	}

	if err := json.Unmarshal(data, &config); err != nil {
		return err
	}

	log.Printf("Loaded config: ETA=%s, Email=%s, Description=%s", config.EstimatedReturn, config.SupportEmail, config.Description)
	return nil
}

func loadTemplate() error {
	tmplData, err := webContent.ReadFile("web/index.html")
	if err != nil {
		return err
	}

	indexTemplate, err = template.New("index").Parse(string(tmplData))
	return err
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" && r.URL.Path != "/index.html" {
		// Let other handlers deal with non-root paths
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := indexTemplate.Execute(w, config); err != nil {
		log.Printf("Template execution error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func main() {
	// Load configuration
	if err := loadConfig(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Load and parse template
	if err := loadTemplate(); err != nil {
		log.Fatal("Failed to load template:", err)
	}

	// Extract web subdirectory from embedded FS for static files
	webFS, err := fs.Sub(webContent, "web")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}

	// Serve index.html through template handler
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/index.html", indexHandler)

	// Serve static files (css, images, etc.)
	staticHandler := http.FileServer(http.FS(webFS))
	http.Handle("/css/", staticHandler)
	http.Handle("/images/", staticHandler)

	// Build address from ipsegment.MachineIP
	addr := ipsegment.MachineIP + ":" + port

	log.Printf("Starting Probler Maintenance server at https://%s", addr)
	log.Printf("Using certificate: %s", certFile)
	log.Printf("Using key: %s", keyFile)

	err = http.ListenAndServeTLS(addr, certFile, keyFile, nil)
	if err != nil {
		log.Fatal("Server failed:", err)
	}
}
