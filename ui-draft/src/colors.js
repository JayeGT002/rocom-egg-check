// 蛋组与属性色沿用 Rocom-Shiny-Helper 配色；许可与来源见 ../THIRD-PARTY-NOTICES.md。
export const eggGroupColors = {
  妖精组: '#E2559F',
  动物组: '#C0392B',
  巨灵组: '#2E86C1',
  海洋组: '#17A2B8',
  植物组: '#7CB342',
  昆虫组: '#4E4E56',
  魔力组: '#8E44AD',
  大地组: '#D4AC0D',
  拟人组: '#5DADE2',
  机械组: '#138D90',
  天空组: '#CD6155',
  两栖组: '#E67E22',
  软体组: '#7F8C8D',
  飞龙组: '#34495E',
  无法孵蛋: '#6B7280',
}

export const attributeColors = {
  普通: '#3080B0',
  草: '#40B070',
  火: '#D05020',
  水: '#60A0F0',
  光: '#40C0F0',
  地: '#907030',
  冰: '#50A0D0',
  龙: '#E04060',
  电: '#E0C000',
  毒: '#B060E0',
  虫: '#90C020',
  武: '#F09030',
  翼: '#30C0C0',
  萌: '#F070A0',
  幽: '#9040E0',
  恶: '#C04070',
  机械: '#40C0A0',
  幻: '#90A0F0',
}

export const tierColors = [
  { background: '#FFF4D6', foreground: '#62430D' },
  { background: '#FFE9BA', foreground: '#62430D' },
  { background: '#FFDB97', foreground: '#5D3A0B' },
  { background: '#FFCC72', foreground: '#523309' },
  { background: '#F6B34F', foreground: '#4B2E0A' },
  { background: '#E89339', foreground: '#3F280D' },
  { background: '#CF722D', foreground: '#FFFFFF' },
  { background: '#AA5628', foreground: '#FFFFFF' },
  { background: '#843F26', foreground: '#FFF8E8' },
  { background: '#5A2E24', foreground: '#FFF8E8' },
]

export function getEggGroupColor(group) {
  return eggGroupColors[group] ?? '#9aa0a6'
}

export function getTierColor(tier) {
  return tierColors[tier - 1] ?? tierColors[0]
}
