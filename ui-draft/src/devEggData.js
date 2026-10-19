import sourceData from '../../data/pets.json'

const allPets = sourceData.pets
const initialForms = sourceData.pets.filter((pet) => pet.stage === 1)
const eggGroups = [...new Set(initialForms.flatMap((pet) => pet.egg_groups ?? []))]

function matchesAny(values, selected) {
  return selected.length === 0 || values.some((value) => selected.includes(value))
}

function isNumber(value) {
  return /^\d+$/.test(value)
}

function matchingEvolutionIds(keyword) {
  const normalizedKeyword = keyword.toLocaleLowerCase()
  return new Set(allPets
    .filter((pet) => pet.name.toLocaleLowerCase().includes(normalizedKeyword))
    .map((pet) => pet.evolution_id)
    .filter(Boolean))
}

export const DevEggData = {
  async getEggGroups() {
    return eggGroups
  },

  async query(filter) {
    let keyword = filter.keyword.trim()
    const numericKeyword = isNumber(keyword)
    if (numericKeyword && keyword.length < 3) keyword = keyword.padStart(3, '0')
    const minTier = Math.max(1, filter.minTier || 1)
    const maxTier = Math.min(10, filter.maxTier || 10)
    const weight = Math.max(0, Math.round(filter.weight ?? 0))
    const matchingFamilies = keyword && !numericKeyword ? matchingEvolutionIds(keyword) : null

    return initialForms.filter((pet) => {
      const tier = pet.egg_weight.tier
      if (tier < minTier || tier > maxTier) return false
      if (weight > 0 && (weight < pet.egg_weight.min || weight > pet.egg_weight.max)) return false
      if (keyword) {
        if (numericKeyword) {
          if (pet.number !== keyword) return false
        } else {
          const directMatch = pet.name.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
          if (!directMatch && (!pet.evolution_id || !matchingFamilies.has(pet.evolution_id))) return false
        }
      }
      if (!matchesAny(pet.egg_groups ?? [], filter.eggGroups ?? [])) return false
      if (!matchesAny(pet.attributes ?? [], filter.attributes ?? [])) return false
      return true
    })
  },
}
