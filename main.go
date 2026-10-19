package main

import (
	"embed"
	"encoding/json"
	"log"
	"runtime"
	"strings"

	"github.com/egoist/mygo"
)

//go:embed data/pets.json
var embeddedData embed.FS

//go:embed window-icon.png
var windowIcon []byte

type database struct {
	Pets []Pet `json:"pets"`
}

// EggData serves the independent creature and egg-weight dataset to the UI.
type EggData struct {
	pets      []Pet
	allPets   []Pet
	eggGroups []string
}

// EggWeight contains the egg weight intervals used in a creature card.
type EggWeight struct {
	Min             int    `json:"min"`
	MiniMax         int    `json:"mini_max"`
	HugeMin         int    `json:"huge_min"`
	Max             int    `json:"max"`
	MiniInterval    int    `json:"mini_interval"`
	HugeInterval    int    `json:"huge_interval"`
	MiniTiers       int    `json:"mini_tiers"`
	HugeTiers       int    `json:"huge_tiers"`
	TotalRange      int    `json:"total_range"`
	Tier            int    `json:"tier"`
	TierLabel       string `json:"tier_label"`
	IntervalCount1G int    `json:"interval_count_1g"`
}

// Pet is one initial form and the information shown in a result card.
type Pet struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Number      string    `json:"number"`
	EvolutionID string    `json:"evolution_id"`
	Stage       int       `json:"stage"`
	EggGroups   []string  `json:"egg_groups"`
	EggGroupIDs []int     `json:"egg_group_ids"`
	EggWeight   EggWeight `json:"egg_weight"`
	Attributes  []string  `json:"attributes"`
}

// QueryFilter selects initial forms by name or number, tier, egg weight, egg group, and attribute.
type QueryFilter struct {
	Keyword    string   `json:"keyword"`
	MinTier    int      `json:"minTier"`
	MaxTier    int      `json:"maxTier"`
	Weight     int      `json:"weight"`
	EggGroups  []string `json:"eggGroups"`
	Attributes []string `json:"attributes"`
}

// NewEggData loads the bundled dataset and preserves its source order.
func NewEggData() (*EggData, error) {
	contents, err := embeddedData.ReadFile("data/pets.json")
	if err != nil {
		return nil, err
	}

	var source database
	if err := json.Unmarshal(contents, &source); err != nil {
		return nil, err
	}

	service := &EggData{}
	seenGroups := make(map[string]bool)
	for _, pet := range source.Pets {
		service.allPets = append(service.allPets, pet)
		if pet.Stage != 1 {
			continue
		}
		service.pets = append(service.pets, pet)
		for _, group := range pet.EggGroups {
			if group != "" && !seenGroups[group] {
				seenGroups[group] = true
				service.eggGroups = append(service.eggGroups, group)
			}
		}
	}
	return service, nil
}

// GetEggGroups returns the egg groups in the order they first appear in the dataset.
func (data *EggData) GetEggGroups() []string {
	return append([]string{}, data.eggGroups...)
}

// Query returns initial forms that match all active filters.
func (data *EggData) Query(filter QueryFilter) []Pet {
	minTier, maxTier := filter.MinTier, filter.MaxTier
	if minTier < 1 {
		minTier = 1
	}
	if maxTier < 1 || maxTier > 10 {
		maxTier = 10
	}
	if minTier > maxTier {
		minTier, maxTier = maxTier, minTier
	}
	weight := filter.Weight
	if weight < 0 {
		weight = 0
	}

	keyword := strings.TrimSpace(filter.Keyword)
	numericKeyword := isNumber(keyword)
	if numericKeyword && len(keyword) < 3 {
		keyword = strings.Repeat("0", 3-len(keyword)) + keyword
	}
	keywordLower := strings.ToLower(keyword)
	matchingFamilies := make(map[string]struct{})
	if keyword != "" && !numericKeyword {
		for _, pet := range data.allPets {
			if strings.Contains(strings.ToLower(pet.Name), keywordLower) && pet.EvolutionID != "" {
				matchingFamilies[pet.EvolutionID] = struct{}{}
			}
		}
	}
	eggGroups := makeSet(filter.EggGroups)
	attributes := makeSet(filter.Attributes)

	results := make([]Pet, 0)
	for _, pet := range data.pets {
		if pet.EggWeight.Tier < minTier || pet.EggWeight.Tier > maxTier {
			continue
		}
		if weight > 0 && (weight < pet.EggWeight.Min || weight > pet.EggWeight.Max) {
			continue
		}
		if keyword != "" {
			if numericKeyword {
				if pet.Number != keyword {
					continue
				}
			} else {
				if !strings.Contains(strings.ToLower(pet.Name), keywordLower) {
					if _, found := matchingFamilies[pet.EvolutionID]; pet.EvolutionID == "" || !found {
						continue
					}
				}
			}
		}
		if len(eggGroups) > 0 && !containsAny(pet.EggGroups, eggGroups) {
			continue
		}
		if len(attributes) > 0 && !containsAny(pet.Attributes, attributes) {
			continue
		}
		results = append(results, pet)
	}
	return results
}

func isNumber(value string) bool {
	if value == "" {
		return false
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func makeSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		if value != "" {
			set[value] = struct{}{}
		}
	}
	return set
}

func containsAny(values []string, options map[string]struct{}) bool {
	for _, value := range values {
		if _, found := options[value]; found {
			return true
		}
	}
	return false
}

func main() {
	mygo.App.SetName("Rocom Egg Check")
	data, err := NewEggData()
	if err != nil {
		log.Fatal(err)
	}
	mygo.Bind(data)
	mygo.App.WhenReady(func() {
		windowWidth, windowHeight := 1280, 820
		minWidth, minHeight := 720, 600
		if workArea := mygo.Screen.PrimaryDisplay().WorkArea; workArea.Width > 0 && workArea.Height > 0 {
			windowWidth = min(windowWidth, max(360, workArea.Width-80))
			windowHeight = min(windowHeight, max(500, workArea.Height-80))
			minWidth = min(minWidth, windowWidth)
			minHeight = min(minHeight, windowHeight)
		}
		windowOptions := mygo.WindowOptions{
			Title:     "蛋查查 · Rocom Egg Check",
			URL:       "/",
			Width:     windowWidth,
			Height:    windowHeight,
			MinWidth:  minWidth,
			MinHeight: minHeight,
			// Reset older saved bounds that could extend beyond the current display.
			StateKey:        "main-viewport-fit",
			BackgroundColor: "#e7eadb",
		}
		switch runtime.GOOS {
		case "darwin":
			windowOptions.TitleBarStyle = mygo.TitleBarHiddenInset
			windowOptions.TrafficLightPosition = &mygo.Point{X: 14, Y: 19}
		case "windows":
			windowOptions.TitleBarStyle = mygo.TitleBarHidden
			windowOptions.TitleBarHeight = 48
		}
		window := mygo.NewWindow(windowOptions)
		if runtime.GOOS != "darwin" {
			if err := window.SetIcon(windowIcon); err != nil {
				log.Printf("set window icon: %v", err)
			}
		}
	})
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
