// Original mystery-word bank for One Clue. Good words are things everyone
// knows and can clue a dozen different ways — "Penguin", not "Pangolin".
// Every word is a single word (hyphens are fine) and long enough that it isn't
// hiding inside lots of everyday words: clues may not contain the mystery word,
// so a word like "ant" would make "Giant" or "Elephant" illegal. `also` lists
// other spellings the guesser can type; `spicy` words are hidden in Family Mode.

export interface OcWordDef { word: string; also?: string[]; spicy?: boolean }

// Grouped loosely by theme so repeats are easy to spot.
const PLAIN: string[] = [
  // Animals
  "Penguin", "Giraffe", "Elephant", "Kangaroo", "Octopus", "Dolphin", "Butterfly", "Spider", "Shark", "Tiger",
  "Monkey", "Zebra", "Camel", "Turtle", "Rabbit", "Squirrel", "Hedgehog", "Flamingo", "Peacock", "Parrot",
  "Crocodile", "Snail", "Lobster", "Jellyfish", "Panda", "Koala", "Gorilla", "Hamster", "Unicorn", "Dragon",
  "Dinosaur", "Whale", "Mosquito", "Chicken", "Horse", "Sheep", "Donkey", "Ladybug", "Wolf", "Lion",
  "Eagle", "Frog", "Cheetah", "Hippo", "Seahorse", "Kitten", "Caterpillar", "Scorpion", "Reindeer", "Pigeon",
  "Goldfish", "Snake", "Llama", "Ostrich", "Walrus", "Skunk", "Raccoon", "Beaver", "Duck", "Bumblebee",

  // Food and drink
  "Pizza", "Banana", "Pineapple", "Popcorn", "Chocolate", "Sandwich", "Spaghetti", "Pancake", "Cheese", "Hamburger",
  "Taco", "Sushi", "Doughnut", "Cookie", "Cupcake", "Watermelon", "Strawberry", "Lemon", "Carrot", "Potato",
  "Broccoli", "Avocado", "Coconut", "Honey", "Pickle", "Pretzel", "Waffle", "Bacon", "Sausage", "Noodles",
  "Burrito", "Pumpkin", "Onion", "Garlic", "Mushroom", "Peanut", "Cereal", "Toast", "Butter", "Salad",
  "Omelette", "Croissant", "Muffin", "Brownie", "Lollipop", "Marshmallow", "Cherry", "Apple", "Mango", "Coffee",
  "Milkshake", "Lemonade", "Ketchup", "Mustard", "Bread", "Soup", "Yogurt", "Spinach", "Tomato", "Lasagna",
  "Popsicle", "Bubblegum", "Nachos", "Steak", "Pasta", "Juice", "Milk", "Candy", "Sugar", "Salt",

  // Things around the house
  "Umbrella", "Candle", "Pillow", "Mirror", "Ladder", "Hammer", "Scissors", "Toothbrush", "Toothpaste", "Shampoo",
  "Towel", "Sponge", "Bucket", "Broom", "Vacuum", "Toaster", "Kettle", "Microwave", "Fridge", "Spoon",
  "Fork", "Knife", "Sofa", "Lamp", "Bathtub", "Toilet", "Window", "Door", "Chimney", "Clock",
  "Calendar", "Envelope", "Pencil", "Crayon", "Magnet", "Battery", "Lightbulb", "Flashlight", "Padlock", "Mailbox",
  "Wallet", "Perfume", "Lipstick", "Necklace", "Bracelet", "Sunglasses", "Pajamas", "Sneakers", "Boots", "Scarf",
  "Gloves", "Helmet", "Backpack", "Suitcase", "Passport", "Ticket", "Calculator", "Thermometer", "Hourglass", "Paintbrush",

  // Gadgets, toys and other stuff
  "Telescope", "Microscope", "Binoculars", "Camera", "Computer", "Keyboard", "Headphones", "Microphone", "Robot", "Balloon",
  "Kite", "Dice", "Trophy", "Medal", "Flag", "Globe", "Compass", "Lantern", "Anchor", "Treasure",
  "Crown", "Diamond", "Sword", "Shield", "Cannon", "Rocket", "Satellite", "Parachute", "Trampoline", "Hammock",
  "Tent", "Snowman", "Igloo", "Statue", "Fountain", "Scarecrow", "Wheel", "Rope", "Guitar", "Piano",
  "Trumpet", "Violin", "Drums", "Bicycle", "Skateboard", "Helicopter", "Airplane", "Submarine", "Tractor", "Ambulance",
  "Train", "Elevator", "Escalator",

  // Places and nature
  "Volcano", "Island", "Desert", "Jungle", "Glacier", "Waterfall", "Rainbow", "Tornado", "Thunder", "Lightning",
  "Snowflake", "Cloud", "Moon", "Star", "Planet", "Comet", "Galaxy", "Ocean", "River", "Mountain",
  "Forest", "Cave", "Beach", "Farm", "School", "Hospital", "Library", "Airport", "Museum", "Bakery",
  "Restaurant", "Circus", "Stadium", "Theater", "Cinema", "Casino", "Supermarket", "Garden", "Kitchen", "Bathroom",
  "Attic", "Basement", "Office", "Hotel", "Prison", "Playground", "Castle", "Bridge", "Pyramid", "Lighthouse",
  "Windmill", "Earthquake", "Sunset", "Iceberg", "Swamp", "Canyon", "Flower", "Cactus", "Graveyard", "Skyscraper",
  "Treehouse",

  // People and characters
  "Pirate", "Ninja", "Wizard", "Witch", "Vampire", "Zombie", "Ghost", "Mummy", "Mermaid", "Superhero",
  "Cowboy", "Astronaut", "Doctor", "Nurse", "Teacher", "Firefighter", "Police", "Chef", "Clown", "Magician",
  "Detective", "Princess", "Queen", "Knight", "Baby", "Grandma", "Twins", "Santa", "Fairy", "Giant",
  "Monster", "Alien", "Caveman", "Viking", "Samurai", "Pharaoh", "Scientist", "Lifeguard", "Plumber", "Farmer",
  "Pilot", "Dentist", "Barber", "Referee", "Judge", "Waiter", "Cheerleader", "Babysitter", "Sheriff", "Lumberjack",
  "Explorer", "Dracula", "Cinderella", "Pinocchio", "Frankenstein", "Rapunzel", "Hercules", "Sherlock",

  // Things to do, days to remember, big ideas
  "Birthday", "Wedding", "Vacation", "Christmas", "Halloween", "Homework", "Breakfast", "Dream", "Nightmare", "Secret",
  "Magic", "Music", "Dance", "Party", "Picnic", "Camping", "Fishing", "Shopping", "Karaoke", "Football",
  "Basketball", "Tennis", "Golf", "Bowling", "Swimming", "Surfing", "Skiing", "Yoga", "Chess", "Marathon",
  "Olympics", "Gravity", "Electricity", "Internet", "Password", "Selfie", "Emoji", "Money", "Gold", "Fire",
  "Snow", "Winter", "Summer", "Autumn", "Weekend", "Midnight", "Shadow", "Echo", "Laughter", "Tickle",
  "Hiccup", "Sneeze", "Yawn", "Whisper", "Applause", "Kiss", "Love", "Adventure", "Mystery", "Riddle",
  "Puzzle", "Recipe", "Diary", "Alphabet", "Blizzard", "Sunburn", "Traffic", "Cartoon", "Movie", "Concert",
  "Festival", "Parade", "Fireworks", "Carnival", "Rodeo", "Safari", "Haircut", "Tattoo", "Bubble", "Snowball",
  "Sleepover", "Hide-and-seek", "Tug-of-war", "Hopscotch", "Juggling", "Origami", "Graffiti", "Lottery", "Jackpot", "Alarm",
  "Monday", "Gossip", "Bingo", "Wi-Fi",
];

/** Other spellings (and the odd regional name) the guesser can type instead. */
const ALSO: Record<string, string[]> = {
  Ladybug: ["Ladybird"],
  Hippo: ["Hippopotamus"],
  Hamburger: ["Burger"],
  Doughnut: ["Donut"],
  Omelette: ["Omelet"],
  Yogurt: ["Yoghurt"],
  Lasagna: ["Lasagne"],
  Fridge: ["Refrigerator"],
  Sofa: ["Couch"],
  Flashlight: ["Torch"],
  Pajamas: ["Pyjamas", "PJs"],
  Sneakers: ["Trainers"],
  Airplane: ["Aeroplane"],
  Theater: ["Theatre"],
  Prison: ["Jail"],
  Graveyard: ["Cemetery"],
  Police: ["Policeman"],
  Grandma: ["Granny", "Grandmother"],
  Santa: ["Santa Claus"],
  Sherlock: ["Sherlock Holmes"],
  Vacation: ["Holiday"],
  Autumn: ["Fall"],
};

/** Grown-up words: hidden in Family Mode. */
const SPICY: string[] = [
  "Hangover", "Tequila", "Bikini", "Lingerie", "Cocktail", "Champagne", "Beer", "Wine", "Divorce", "Hickey",
  "Flirting", "Skinnydipping",
];

export const WORDS: OcWordDef[] = [
  ...PLAIN.map((word): OcWordDef => (ALSO[word] ? { word, also: ALSO[word] } : { word })),
  ...SPICY.map((word): OcWordDef => ({ word, spicy: true })),
];
