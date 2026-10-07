import type { ChecklistItem } from '../types'

export const MOODS = [
  { value: 'great', label: 'Great', emoji: '😊', score: 5, color: '#34D399' },
  { value: 'good', label: 'Good', emoji: '🙂', score: 4, color: '#60A5FA' },
  { value: 'okay', label: 'Okay', emoji: '😐', score: 3, color: '#FBBF24' },
  { value: 'tired', label: 'Tired', emoji: '😴', score: 2, color: '#F87171' },
  { value: 'sad', label: 'Sad', emoji: '😢', score: 1, color: '#A78BFA' },
] as const

export const SYMPTOMS = [
  'Nausea', 'Backache', 'Headache', 'Fatigue', 'Heartburn',
  'Swelling', 'Cramps', 'Mood swings', 'Insomnia', 'Breathless',
  'Bloating', 'Tender breasts', 'Frequent urination', 'Dizziness',
]

export const BABY_SIZES: Record<number, { name: string; emoji: string }> = {
  4: { name: 'Poppy Seed', emoji: '🌱' },
  5: { name: 'Apple Seed', emoji: '🍎' },
  6: { name: 'Pea', emoji: '🫛' },
  7: { name: 'Blueberry', emoji: '🫐' },
  8: { name: 'Raspberry', emoji: '🍓' },
  9: { name: 'Cherry', emoji: '🍒' },
  10: { name: 'Kumquat', emoji: '🍊' },
  11: { name: 'Fig', emoji: '🫐' },
  12: { name: 'Lime', emoji: '🍋' },
  13: { name: 'Lemon', emoji: '🍋' },
  14: { name: 'Peach', emoji: '🍑' },
  15: { name: 'Apple', emoji: '🍎' },
  16: { name: 'Avocado', emoji: '🥑' },
  17: { name: 'Pear', emoji: '🍐' },
  18: { name: 'Bell Pepper', emoji: '🫑' },
  19: { name: 'Mango', emoji: '🥭' },
  20: { name: 'Banana', emoji: '🍌' },
  21: { name: 'Carrot', emoji: '🥕' },
  22: { name: 'Papaya', emoji: '🍈' },
  23: { name: 'Grapefruit', emoji: '🍊' },
  24: { name: 'Corn', emoji: '🌽' },
  25: { name: 'Cauliflower', emoji: '🥦' },
  26: { name: 'Scallion', emoji: '🧅' },
  27: { name: 'Rutabaga', emoji: '🫚' },
  28: { name: 'Eggplant', emoji: '🍆' },
  29: { name: 'Acorn Squash', emoji: '🎃' },
  30: { name: 'Cabbage', emoji: '🥬' },
  31: { name: 'Coconut', emoji: '🥥' },
  32: { name: 'Jicama', emoji: '🥔' },
  33: { name: 'Pineapple', emoji: '🍍' },
  34: { name: 'Cantaloupe', emoji: '🍈' },
  35: { name: 'Honeydew', emoji: '🍈' },
  36: { name: 'Romaine Lettuce', emoji: '🥬' },
  37: { name: 'Swiss Chard', emoji: '🌿' },
  38: { name: 'Leek', emoji: '🧅' },
  39: { name: 'Watermelon', emoji: '🍉' },
  40: { name: 'Pumpkin', emoji: '🎃' },
}

export const MOTIVATIONAL_MESSAGES = [
  "You're doing amazing, mama! Every day is a gift 💕",
  "Your baby is growing stronger every day 🌸",
  "Trust your body — it knows exactly what to do 🌺",
  "You are brave, beautiful, and bringing life into the world ✨",
  "Rest when you need to. You're growing a whole person! 💖",
  "Every kick is a hello from your little one 👶",
  "You are not alone on this journey 🤱",
  "Breathe, relax, and enjoy these precious moments 🌙",
  "Your love for your baby already shines so bright 💛",
  "One day at a time — you've got this, mama! 🌈",
]

export const PREGNANCY_TIPS = [
  "Have dal-chawal daily — this combination gives complete protein for baby's growth.",
  "Coconut water is nature's electrolyte drink — great during summer pregnancy.",
  "Soak 5 almonds overnight and eat with warm milk every morning for strength.",
  "Add drumstick leaves (moringa) to dal — rich in iron and calcium.",
  "Amla (Indian gooseberry) boosts Vitamin C and helps absorb iron better.",
  "Haldi doodh at night reduces inflammation and helps you sleep better.",
  "Eat small meals every 3 hours — idli, upma, or poha are great light options.",
  "Dates (khajur) in the third trimester may help prepare the body for labor.",
  "Ragi (finger millet) is excellent — packed with calcium for baby's bone growth.",
  "Sleep on your left side to improve blood flow to baby and reduce swelling.",
]

type ChecklistItemSeed = Omit<ChecklistItem, 'id' | 'sortOrder' | 'isCustom' | 'createdAt'>

export const DEFAULT_CHECKLIST_ITEMS: ChecklistItemSeed[] = [
  // For Mom
  { category: 'For Mom', label: 'Hospital/birth plan', isChecked: false },
  { category: 'For Mom', label: 'Comfortable clothes (2-3 sets)', isChecked: false },
  { category: 'For Mom', label: 'Nursing bra', isChecked: false },
  { category: 'For Mom', label: 'Toiletries & skincare', isChecked: false },
  { category: 'For Mom', label: 'Phone charger', isChecked: false },
  { category: 'For Mom', label: 'Snacks & drinks', isChecked: false },
  { category: 'For Mom', label: 'Pillow from home', isChecked: false },
  { category: 'For Mom', label: 'Hair ties & headband', isChecked: false },
  { category: 'For Mom', label: 'Lip balm & lotion', isChecked: false },
  { category: 'For Mom', label: 'Going-home outfit', isChecked: false },
  // For Baby
  { category: 'For Baby', label: 'Newborn onesies (5-7)', isChecked: false },
  { category: 'For Baby', label: 'Baby blankets (2-3)', isChecked: false },
  { category: 'For Baby', label: 'Newborn diapers', isChecked: false },
  { category: 'For Baby', label: 'Baby wipes', isChecked: false },
  { category: 'For Baby', label: 'Baby hat & mittens', isChecked: false },
  { category: 'For Baby', label: 'Car seat (installed!)', isChecked: false },
  { category: 'For Baby', label: 'Going-home outfit for baby', isChecked: false },
  { category: 'For Baby', label: 'Swaddle wrap', isChecked: false },
  // Documents
  { category: 'Documents', label: 'ID & insurance card', isChecked: false },
  { category: 'Documents', label: 'Hospital pre-registration', isChecked: false },
  { category: 'Documents', label: 'Birth plan copies (3)', isChecked: false },
  { category: 'Documents', label: 'Doctor contact numbers', isChecked: false },
  { category: 'Documents', label: 'Emergency contacts list', isChecked: false },
  // Comfort
  { category: 'Comfort', label: 'Relaxing music playlist', isChecked: false },
  { category: 'Comfort', label: 'Massage oil or lotion', isChecked: false },
  { category: 'Comfort', label: 'Warm socks', isChecked: false },
  { category: 'Comfort', label: 'Eye mask & earplugs', isChecked: false },
  { category: 'Comfort', label: 'Tablet or book', isChecked: false },
]

export const REMINDER_CATEGORIES = [
  { value: 'appointment', label: 'Doctor Visit', emoji: '🏥' },
  { value: 'water', label: 'Drink Water', emoji: '💧' },
  { value: 'vitamins', label: 'Vitamins', emoji: '💊' },
  { value: 'kick-count', label: 'Kick Count', emoji: '👶' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
  { value: 'sleep', label: 'Sleep', emoji: '😴' },
  { value: 'custom', label: 'Custom', emoji: '📝' },
]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const VISIT_TYPES = ['Routine Checkup', 'Ultrasound', 'Blood Test', 'Specialist', 'Emergency', 'Dental', 'Other']

export interface DailyTaskTemplate {
  taskKey: string
  label: string
  emoji: string
  category: string
}

export const DEFAULT_DAILY_TASKS: DailyTaskTemplate[] = [
  // Morning
  { taskKey: 'prenatal_vitamins', label: 'Prenatal Vitamins', emoji: '💊', category: 'Morning' },
  { taskKey: 'breakfast', label: 'Eat Breakfast', emoji: '🍳', category: 'Morning' },
  { taskKey: 'dry_fruits', label: 'Dry Fruits', emoji: '🍇', category: 'Morning' },
  { taskKey: 'morning_walk', label: 'Morning Walk', emoji: '🚶', category: 'Morning' },
  // Nutrition
  { taskKey: 'fruit_juice', label: 'Fruit Juice', emoji: '🧃', category: 'Nutrition' },
  { taskKey: 'fruits', label: 'Eat Fruits', emoji: '🍎', category: 'Nutrition' },
  { taskKey: 'lunch', label: 'Eat Lunch', emoji: '🍽️', category: 'Nutrition' },
  { taskKey: 'dinner', label: 'Eat Dinner', emoji: '🍲', category: 'Nutrition' },
  { taskKey: 'water_goal', label: 'Water Goal (8 glasses)', emoji: '💧', category: 'Nutrition' },
  // Wellness
  { taskKey: 'yoga', label: 'Prenatal Yoga', emoji: '🧘', category: 'Wellness' },
  { taskKey: 'foot_massage', label: 'Foot Massage', emoji: '💆', category: 'Wellness' },
  { taskKey: 'kegel_exercise', label: 'Kegel Exercises', emoji: '🌸', category: 'Wellness' },
  { taskKey: 'rest', label: 'Rest / Nap', emoji: '😴', category: 'Wellness' },
  // Evening
  { taskKey: 'kick_count', label: 'Count Baby Kicks', emoji: '👶', category: 'Evening' },
  { taskKey: 'evening_walk', label: 'Evening Walk', emoji: '🌅', category: 'Evening' },
  { taskKey: 'journal', label: 'Write in Journal', emoji: '📔', category: 'Evening' },
  { taskKey: 'sleep_time', label: 'Sleep on Time', emoji: '🌙', category: 'Evening' },
]
