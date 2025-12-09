const adjectives = [
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal',
  'Happy', 'Sunny', 'Cozy', 'Quiet', 'Bright', 'Calm', 'Warm', 'Cool',
  'Swift', 'Gentle', 'Bold', 'Soft', 'Fresh', 'Silver', 'Golden', 'Crystal'
]

const nouns = [
  'Door', 'Bell', 'House', 'Home', 'Gate', 'Entry', 'Porch', 'Cabin',
  'Nest', 'Haven', 'Den', 'Lodge', 'Villa', 'Cottage', 'Manor', 'Tower',
  'Garden', 'Valley', 'Hill', 'Brook', 'Meadow', 'Grove', 'Harbor', 'Cove'
]

export function generateDoorbellName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj} ${noun}`
}
