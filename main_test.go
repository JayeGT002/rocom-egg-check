package main

import "testing"

func hasPet(pets []Pet, id string) bool {
	for _, pet := range pets {
		if pet.ID == id {
			return true
		}
	}
	return false
}

func TestQueryWeightBoundaries(t *testing.T) {
	data, err := NewEggData()
	if err != nil {
		t.Fatalf("load dataset: %v", err)
	}
	initialForms := data.Query(QueryFilter{MinTier: 1, MaxTier: 10})
	if len(initialForms) == 0 {
		t.Fatal("dataset contains no initial forms")
	}
	pet := initialForms[0]

	cases := []struct {
		name   string
		weight int
		want   bool
	}{
		{name: "minimum", weight: pet.EggWeight.Min, want: true},
		{name: "maximum", weight: pet.EggWeight.Max, want: true},
		{name: "below minimum", weight: pet.EggWeight.Min - 1, want: false},
		{name: "above maximum", weight: pet.EggWeight.Max + 1, want: false},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			if testCase.weight <= 0 {
				t.Skip("weight must be positive to filter")
			}
			results := data.Query(QueryFilter{MinTier: 1, MaxTier: 10, Weight: testCase.weight})
			if got := hasPet(results, pet.ID); got != testCase.want {
				t.Fatalf("weight %d matched %s: got %v, want %v", testCase.weight, pet.ID, got, testCase.want)
			}
		})
	}
}

func TestQueryNegativeWeightIsIgnored(t *testing.T) {
	data, err := NewEggData()
	if err != nil {
		t.Fatalf("load dataset: %v", err)
	}
	unfiltered := data.Query(QueryFilter{MinTier: 1, MaxTier: 10})
	filtered := data.Query(QueryFilter{MinTier: 1, MaxTier: 10, Weight: -5})
	if len(filtered) != len(unfiltered) {
		t.Fatalf("negative weight returned %d pets, want %d", len(filtered), len(unfiltered))
	}
}
