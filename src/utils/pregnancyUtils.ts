import { BABY_SIZES, MOTIVATIONAL_MESSAGES, PREGNANCY_TIPS } from './constants'

export function getBabySize(week: number): { name: string; emoji: string } {
  return BABY_SIZES[week] ?? { name: 'Growing', emoji: '👶' }
}

export function getMotivationalMessage(): string {
  const idx = new Date().getDay() % MOTIVATIONAL_MESSAGES.length
  return MOTIVATIONAL_MESSAGES[idx]
}

export function getDailyTip(): string {
  const idx = new Date().getDate() % PREGNANCY_TIPS.length
  return PREGNANCY_TIPS[idx]
}

export function getTrimesterLabel(week: number): string {
  if (week <= 13) return '1st Trimester'
  if (week <= 26) return '2nd Trimester'
  return '3rd Trimester'
}

