package service

import (
	"encoding/csv"
	"fmt"
	"io/ioutil"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// CityCoordinate represents a city with its coordinates
type CityCoordinate struct {
	City       string
	CityAscii  string
	Latitude   float64
	Longitude  float64
	Country    string
	ISO2       string
	ISO3       string
	AdminName  string
	Capital    string
	Population string
	ID         string
}

// SVGMapInfo holds information about the world map SVG
type SVGMapInfo struct {
	Width    float64
	Height   float64
	ViewBoxX float64
	ViewBoxY float64
	ViewBoxW float64
	ViewBoxH float64
}

// SVGCoordinate represents SVG coordinates for rendering
type SVGCoordinate struct {
	X float64
	Y float64
}

// WorldCitiesData holds the loaded city data
type WorldCitiesData struct {
	cities      map[string]*CityCoordinate // Key: city name (lowercase) - for simple lookup
	cityCountry map[string]*CityCoordinate // Key: "city,country" (lowercase) - for precise lookup
	allCities   []*CityCoordinate          // All cities for iteration and ranking
	svgMapInfo  *SVGMapInfo                // SVG map dimensions and coordinate system
}

// loadWorldSVG loads the world.svg file and extracts coordinate system information
func loadWorldSVG(path string) (*SVGMapInfo, error) {
	svgPath := filepath.Join(path, "world.svg")

	data, err := ioutil.ReadFile(svgPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read world.svg at %s: %v", svgPath, err)
	}

	svgContent := string(data)

	// Extract width, height, and viewBox using regex
	widthRegex := regexp.MustCompile(`width="([0-9.]+)"`)
	heightRegex := regexp.MustCompile(`height="([0-9.]+)"`)
	viewBoxRegex := regexp.MustCompile(`viewbox="([0-9.\s-]+)"`)

	var mapInfo SVGMapInfo

	// Extract width
	if match := widthRegex.FindStringSubmatch(svgContent); len(match) > 1 {
		if w, err := strconv.ParseFloat(match[1], 64); err == nil {
			mapInfo.Width = w
		}
	}

	// Extract height
	if match := heightRegex.FindStringSubmatch(svgContent); len(match) > 1 {
		if h, err := strconv.ParseFloat(match[1], 64); err == nil {
			mapInfo.Height = h
		}
	}

	// Extract viewBox
	if match := viewBoxRegex.FindStringSubmatch(svgContent); len(match) > 1 {
		viewBoxParts := strings.Fields(match[1])
		if len(viewBoxParts) == 4 {
			if x, err := strconv.ParseFloat(viewBoxParts[0], 64); err == nil {
				mapInfo.ViewBoxX = x
			}
			if y, err := strconv.ParseFloat(viewBoxParts[1], 64); err == nil {
				mapInfo.ViewBoxY = y
			}
			if w, err := strconv.ParseFloat(viewBoxParts[2], 64); err == nil {
				mapInfo.ViewBoxW = w
			}
			if h, err := strconv.ParseFloat(viewBoxParts[3], 64); err == nil {
				mapInfo.ViewBoxH = h
			}
		}
	}

	// Set default values if not found (based on the known world.svg)
	if mapInfo.Width == 0 {
		mapInfo.Width = 2000
	}
	if mapInfo.Height == 0 {
		mapInfo.Height = 857
	}
	if mapInfo.ViewBoxW == 0 {
		mapInfo.ViewBoxW = 2000
	}
	if mapInfo.ViewBoxH == 0 {
		mapInfo.ViewBoxH = 857
	}

	fmt.Printf("Loaded world.svg: %dx%d, ViewBox: %.0f %.0f %.0f %.0f\n",
		int(mapInfo.Width), int(mapInfo.Height),
		mapInfo.ViewBoxX, mapInfo.ViewBoxY, mapInfo.ViewBoxW, mapInfo.ViewBoxH)

	return &mapInfo, nil
}

// LoadWorldCities loads the worldcities.csv file from the specified path
// The path should point to the directory containing worldcities.csv
func LoadWorldCities(path string) (*WorldCitiesData, error) {
	csvPath := filepath.Join(path, "worldcities.csv")

	file, err := os.Open(csvPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open worldcities.csv at %s: %v", csvPath, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV data: %v", err)
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("empty CSV file")
	}

	// Skip header row
	cities := make(map[string]*CityCoordinate)
	cityCountry := make(map[string]*CityCoordinate)
	var allCities []*CityCoordinate

	for i, record := range records[1:] {
		if len(record) < 11 {
			continue // Skip incomplete records
		}

		lat, err := strconv.ParseFloat(record[2], 64)
		if err != nil {
			fmt.Printf("Warning: invalid latitude for city %s at row %d: %v\n", record[0], i+2, err)
			continue
		}

		lng, err := strconv.ParseFloat(record[3], 64)
		if err != nil {
			fmt.Printf("Warning: invalid longitude for city %s at row %d: %v\n", record[0], i+2, err)
			continue
		}

		city := &CityCoordinate{
			City:       record[0],
			CityAscii:  record[1],
			Latitude:   lat,
			Longitude:  lng,
			Country:    record[4],
			ISO2:       record[5],
			ISO3:       record[6],
			AdminName:  record[7],
			Capital:    record[8],
			Population: record[9],
			ID:         record[10],
		}

		// Add to all cities slice
		allCities = append(allCities, city)

		// Store by city name (simple lookup) - prioritize larger cities for duplicate names
		cityNameLower := strings.ToLower(city.City)
		if existing, exists := cities[cityNameLower]; !exists || isLargerCity(city, existing) {
			cities[cityNameLower] = city
		}

		// Also store ASCII version if different
		if city.CityAscii != city.City {
			cityAsciiLower := strings.ToLower(city.CityAscii)
			if existing, exists := cities[cityAsciiLower]; !exists || isLargerCity(city, existing) {
				cities[cityAsciiLower] = city
			}
		}

		// Store by "city,country" for precise lookup
		cityCountryKey := strings.ToLower(city.City) + "," + strings.ToLower(city.Country)
		cityCountry[cityCountryKey] = city

		// Also store ASCII version with country
		if city.CityAscii != city.City {
			cityCountryAsciiKey := strings.ToLower(city.CityAscii) + "," + strings.ToLower(city.Country)
			cityCountry[cityCountryAsciiKey] = city
		}

		// Store by "city,iso2" for country code lookup
		cityIso2Key := strings.ToLower(city.City) + "," + strings.ToLower(city.ISO2)
		cityCountry[cityIso2Key] = city

		// Store by "city,iso3" for 3-letter country code lookup
		cityIso3Key := strings.ToLower(city.City) + "," + strings.ToLower(city.ISO3)
		cityCountry[cityIso3Key] = city
	}

	// Load SVG map information
	svgMapInfo, err := loadWorldSVG(path)
	if err != nil {
		fmt.Printf("Warning: Could not load world.svg: %v. Using default SVG dimensions.\n", err)
		// Use default SVG dimensions
		svgMapInfo = &SVGMapInfo{
			Width:    2000,
			Height:   857,
			ViewBoxX: 0,
			ViewBoxY: 0,
			ViewBoxW: 2000,
			ViewBoxH: 857,
		}
	}

	return &WorldCitiesData{
		cities:      cities,
		cityCountry: cityCountry,
		allCities:   allCities,
		svgMapInfo:  svgMapInfo,
	}, nil
}

// isLargerCity compares two cities and returns true if the first city is larger/more important
func isLargerCity(city1, city2 *CityCoordinate) bool {
	// Priority order: capital status, then population
	if city1.Capital == "primary" && city2.Capital != "primary" {
		return true
	}
	if city2.Capital == "primary" && city1.Capital != "primary" {
		return false
	}

	// Compare by population (assuming population string represents relative size)
	pop1, err1 := strconv.ParseFloat(city1.Population, 64)
	pop2, err2 := strconv.ParseFloat(city2.Population, 64)

	if err1 == nil && err2 == nil {
		return pop1 > pop2
	}

	// If population comparison fails, prefer admin capitals
	if city1.Capital == "admin" && city2.Capital != "admin" {
		return true
	}

	return false
}

// LatLngToSVG converts latitude and longitude to SVG coordinates based on the world map scale
func (wcd *WorldCitiesData) LatLngToSVG(latitude, longitude float64) SVGCoordinate {
	if wcd.svgMapInfo == nil {
		// Fallback to default coordinates if no SVG info available
		return SVGCoordinate{X: 0, Y: 0}
	}

	mapInfo := wcd.svgMapInfo

	// Convert longitude (-180 to 180) to SVG X coordinate (0 to ViewBoxW)
	// Longitude -180 maps to X=0, Longitude 180 maps to X=ViewBoxW
	svgX := ((longitude + 180) / 360) * mapInfo.ViewBoxW

	// Convert latitude (90 to -90) to SVG Y coordinate (0 to ViewBoxH)
	// Using Web Mercator projection for better accuracy
	// Latitude 85 maps to Y=0, Latitude -85 maps to Y=ViewBoxH
	latRad := latitude * math.Pi / 180

	// Clamp latitude to avoid extreme values in Mercator projection
	if latRad > 1.4844222297453324 { // ~85 degrees
		latRad = 1.4844222297453324
	}
	if latRad < -1.4844222297453324 { // ~-85 degrees
		latRad = -1.4844222297453324
	}

	// Web Mercator Y calculation
	mercatorY := math.Log(math.Tan(math.Pi/4 + latRad/2))

	// Normalize mercator Y to 0-1 range (approx -π to π maps to 0-1)
	normalizedY := (mercatorY + math.Pi) / (2 * math.Pi)

	// Invert Y coordinate (SVG Y=0 is at top, latitude 90 should be at top)
	svgY := (1 - normalizedY) * mapInfo.ViewBoxH

	return SVGCoordinate{
		X: math.Round(svgX*100) / 100, // Round to 2 decimal places
		Y: math.Round(svgY*100) / 100,
	}
}

// GetCityCoordinates returns coordinates for a city name (simple lookup, prefers larger cities for duplicate names)
func (wcd *WorldCitiesData) GetCityCoordinates(cityName string) (float64, float64, bool) {
	city, exists := wcd.cities[strings.ToLower(cityName)]
	if !exists {
		return 0, 0, false
	}
	return city.Latitude, city.Longitude, true
}

// GetCityCoordinatesWithCountry returns coordinates for a city with country context
// This method should be preferred for precise lookups
func (wcd *WorldCitiesData) GetCityCoordinatesWithCountry(cityName, country string) (float64, float64, bool) {
	if country == "" {
		// Fallback to simple lookup if no country provided
		return wcd.GetCityCoordinates(cityName)
	}

	// Try multiple country lookup formats
	lookupKeys := []string{
		strings.ToLower(cityName) + "," + strings.ToLower(country),
		strings.ToLower(cityName) + "," + strings.ToLower(country), // Full country name
	}

	// Add common country code variations
	countryLower := strings.ToLower(country)
	switch countryLower {
	case "usa", "united states", "us", "america":
		lookupKeys = append(lookupKeys,
			strings.ToLower(cityName)+",united states",
			strings.ToLower(cityName)+",us")
	case "uk", "united kingdom", "britain", "england", "scotland", "wales":
		lookupKeys = append(lookupKeys,
			strings.ToLower(cityName)+",united kingdom",
			strings.ToLower(cityName)+",uk")
	case "germany", "deutschland", "de":
		lookupKeys = append(lookupKeys,
			strings.ToLower(cityName)+",germany",
			strings.ToLower(cityName)+",de")
	}

	// Try all lookup variations
	for _, key := range lookupKeys {
		if city, exists := wcd.cityCountry[key]; exists {
			return city.Latitude, city.Longitude, true
		}
	}

	// Fallback to simple city name lookup
	return wcd.GetCityCoordinates(cityName)
}

// SmartCityLookup performs intelligent city coordinate lookup with country context extraction
func (wcd *WorldCitiesData) SmartCityLookup(location string) (float64, float64, bool) {
	if location == "" {
		return 0, 0, false
	}

	// Parse location string for city and country information
	cityName, country := parseLocationString(location)

	if country != "" {
		// Use country-aware lookup if country information is available
		lat, lng, found := wcd.GetCityCoordinatesWithCountry(cityName, country)
		if found {
			return lat, lng, true
		}
	}

	// Fallback to simple city name lookup
	return wcd.GetCityCoordinates(cityName)
}

// SmartCityLookupWithSVG performs intelligent city lookup returning both geographic and SVG coordinates
func (wcd *WorldCitiesData) SmartCityLookupWithSVG(location string) (lat, lng float64, svgX, svgY float64, found bool) {
	lat, lng, found = wcd.SmartCityLookup(location)
	if !found {
		return 0, 0, 0, 0, false
	}

	// Calculate SVG coordinates
	svgCoord := wcd.LatLngToSVG(lat, lng)
	return lat, lng, svgCoord.X, svgCoord.Y, true
}

// GetCityCoordinatesWithSVG returns both geographic and SVG coordinates for a city
func (wcd *WorldCitiesData) GetCityCoordinatesWithSVG(cityName string) (lat, lng, svgX, svgY float64, found bool) {
	lat, lng, found = wcd.GetCityCoordinates(cityName)
	if !found {
		return 0, 0, 0, 0, false
	}

	svgCoord := wcd.LatLngToSVG(lat, lng)
	return lat, lng, svgCoord.X, svgCoord.Y, true
}

// GetCityCoordinatesWithCountryAndSVG returns geographic and SVG coordinates with country context
func (wcd *WorldCitiesData) GetCityCoordinatesWithCountryAndSVG(cityName, country string) (lat, lng, svgX, svgY float64, found bool) {
	lat, lng, found = wcd.GetCityCoordinatesWithCountry(cityName, country)
	if !found {
		return 0, 0, 0, 0, false
	}

	svgCoord := wcd.LatLngToSVG(lat, lng)
	return lat, lng, svgCoord.X, svgCoord.Y, true
}

// parseLocationString extracts city and country from various location string formats
func parseLocationString(location string) (city, country string) {
	location = strings.TrimSpace(location)

	// Handle comma-separated format: "Boston, MA, USA" or "Boston, USA"
	if strings.Contains(location, ",") {
		parts := strings.Split(location, ",")
		if len(parts) >= 2 {
			city = strings.TrimSpace(parts[0])
			// Use the last part as country (skip state/region)
			country = strings.TrimSpace(parts[len(parts)-1])
			return
		}
	}

	// Handle dash-separated format: "Boston-DC-01" - extract city part
	if strings.Contains(location, "-") {
		parts := strings.Split(location, "-")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			// Skip common technical prefixes/suffixes
			if !isLocationSuffix(part) && len(part) > 2 {
				city = part
				break
			}
		}
		if city == "" && len(parts) > 0 {
			city = strings.TrimSpace(parts[0])
		}
		return
	}

	// Default: use the whole string as city name
	city = location
	return
}

// isLocationSuffix checks if a string part is a common location suffix to skip
func isLocationSuffix(part string) bool {
	partLower := strings.ToLower(part)
	suffixes := []string{"dc", "data", "center", "rack", "server", "node", "sw", "rt", "fw", "gw"}

	for _, suffix := range suffixes {
		if strings.Contains(partLower, suffix) {
			return true
		}
	}

	// Check if it's a number or technical identifier
	if _, err := strconv.Atoi(part); err == nil {
		return true
	}

	return false
}

// GetCityInfo returns the complete CityCoordinate information for a given city name
func (wcd *WorldCitiesData) GetCityInfo(cityName string) (*CityCoordinate, bool) {
	city, exists := wcd.cities[strings.ToLower(cityName)]
	if !exists {
		return nil, false
	}
	// Return a copy to prevent external modification
	cityCopy := *city
	return &cityCopy, true
}

// SearchCitiesByCountry returns all cities for a given country (case-insensitive)
func (wcd *WorldCitiesData) SearchCitiesByCountry(country string) []*CityCoordinate {
	var result []*CityCoordinate
	countryLower := strings.ToLower(country)

	for _, city := range wcd.cities {
		if strings.ToLower(city.Country) == countryLower {
			cityCopy := *city
			result = append(result, &cityCopy)
		}
	}

	return result
}

// GetTotalCities returns the total number of unique cities loaded
func (wcd *WorldCitiesData) GetTotalCities() int {
	return len(wcd.allCities)
}

// GetAllCityNames returns a slice of all city names (for debugging/listing purposes)
func (wcd *WorldCitiesData) GetAllCityNames() []string {
	names := make([]string, 0, len(wcd.cities))
	for cityName := range wcd.cities {
		names = append(names, cityName)
	}
	return names
}

// GetSVGMapInfo returns the loaded SVG map information
func (wcd *WorldCitiesData) GetSVGMapInfo() *SVGMapInfo {
	return wcd.svgMapInfo
}

// TestCoordinateConversion tests the coordinate conversion for known cities
func (wcd *WorldCitiesData) TestCoordinateConversion() {
	testCities := []struct {
		name string
		lat  float64
		lng  float64
	}{
		{"New York", 40.7128, -74.0060},
		{"London", 51.5074, -0.1278},
		{"Tokyo", 35.6762, 139.6503},
		{"Sydney", -33.8688, 151.2093},
		{"São Paulo", -23.5505, -46.6333},
	}

	fmt.Println("Testing coordinate conversion:")
	fmt.Println("City | Lat | Lng | SVG-X | SVG-Y")
	fmt.Println("-----|-----|-----|-------|------")

	for _, city := range testCities {
		svgCoord := wcd.LatLngToSVG(city.lat, city.lng)
		fmt.Printf("%s | %.2f | %.2f | %.1f | %.1f\n",
			city.name, city.lat, city.lng, svgCoord.X, svgCoord.Y)
	}
}
