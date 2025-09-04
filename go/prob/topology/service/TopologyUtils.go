package service

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
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

// WorldCitiesData holds the loaded city data
type WorldCitiesData struct {
	cities map[string]*CityCoordinate // Key: city name (lowercase)
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

		// Store by both original city name and ASCII version (lowercase for case-insensitive lookup)
		cities[strings.ToLower(city.City)] = city
		if city.CityAscii != city.City {
			cities[strings.ToLower(city.CityAscii)] = city
		}
	}

	return &WorldCitiesData{cities: cities}, nil
}

// GetCityCoordinates returns the latitude and longitude for a given city name
// Returns (latitude, longitude, found) where found indicates if the city was found
func (wcd *WorldCitiesData) GetCityCoordinates(cityName string) (float64, float64, bool) {
	city, exists := wcd.cities[strings.ToLower(cityName)]
	if !exists {
		return 0, 0, false
	}
	return city.Latitude, city.Longitude, true
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
	return len(wcd.cities)
}

// GetAllCityNames returns a slice of all city names (for debugging/listing purposes)
func (wcd *WorldCitiesData) GetAllCityNames() []string {
	names := make([]string, 0, len(wcd.cities))
	for cityName := range wcd.cities {
		names = append(names, cityName)
	}
	return names
}
