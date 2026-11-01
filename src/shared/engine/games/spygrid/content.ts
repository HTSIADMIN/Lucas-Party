// Original word bank for Spy Grid: simple, concrete, family-friendly nouns —
// the best ones mean a couple of things (Bat, Bark, Crane, Pitch, Spring…), so
// one clue can tie them together. Single words, at most 9 letters, so they fit
// a card on the TV and a cell on a phone. Very short words that hide inside
// lots of everyday clue words (Ice → "police", Cat → "vacation") are left out,
// because a clue may not contain a live board word. Every word is family-safe,
// so Family Mode has nothing to filter here.

export const WORDS: readonly string[] = [
  // A
  "Acorn", "Alien", "Alligator", "Anchor", "Angel", "Apple", "Apron", "Arrow", "Astronaut", "Atlas", "Attic", "Axe",
  // B
  "Backpack", "Badge", "Bagel", "Ball", "Balloon", "Banana", "Band", "Bandage", "Bank", "Bark", "Barn", "Barrel",
  "Basket", "Bat", "Bath", "Battery", "Beach", "Bean", "Bear", "Beard", "Beaver", "Bed", "Bell", "Belt", "Bench",
  "Berry", "Bike", "Bill", "Biscuit", "Blanket", "Block", "Board", "Boat", "Bolt", "Bone", "Book", "Boot", "Bottle",
  "Bowl", "Box", "Brain", "Branch", "Bread", "Brick", "Bridge", "Broom", "Brush", "Bubble", "Bucket", "Buffalo",
  "Bug", "Bulb", "Bull", "Burger", "Bush", "Butter", "Button",
  // C
  "Cabin", "Cable", "Cactus", "Cake", "Calf", "Camel", "Camera", "Camp", "Candle", "Candy", "Cane", "Canoe",
  "Canyon", "Captain", "Card", "Carpet", "Carrot", "Castle", "Cave", "Cell", "Cello", "Cereal", "Chain", "Chair",
  "Chalk", "Charm", "Cheese", "Chef", "Cherry", "Chest", "Chicken", "Chimney", "Chip", "Chocolate", "Circus", "Claw",
  "Clay", "Cliff", "Clock", "Cloud", "Clown", "Club", "Coach", "Coat", "Cobra", "Coconut", "Coin", "Comb", "Comet",
  "Compass", "Cone", "Cookie", "Copper", "Coral", "Corn", "Couch", "Court", "Cow", "Crab", "Crane", "Crayon",
  "Cricket", "Crown", "Crystal", "Cube", "Cup", "Curtain", "Cushion",
  // D
  "Daisy", "Dart", "Date", "Deck", "Dentist", "Desert", "Desk", "Diamond", "Diary", "Dinosaur", "Dish", "Dock",
  "Doctor", "Dog", "Dolphin", "Domino", "Donut", "Door", "Dragon", "Drawer", "Dress", "Drill", "Drum", "Duck",
  // E
  "Eagle", "Earth", "Eclipse", "Egg", "Elephant", "Engine", "Envelope", "Eraser",
  // F
  "Factory", "Fair", "Fairy", "Fan", "Farm", "Feather", "Fence", "Ferry", "Field", "Fire", "Firework", "Fish",
  "Flag", "Flower", "Flute", "Fly", "Fog", "Football", "Forest", "Fork", "Fossil", "Fountain", "Fox", "Frame", "Frog",
  // G
  "Galaxy", "Garage", "Garden", "Gem", "Ghost", "Giant", "Gift", "Giraffe", "Glass", "Globe", "Glove", "Glue",
  "Gnome", "Goal", "Goat", "Goblin", "Gold", "Gorilla", "Grape", "Grass", "Guitar",
  // H
  "Hammer", "Hamster", "Hawk", "Heart", "Hedgehog", "Helmet", "Hero", "Hill", "Hive", "Hockey", "Honey", "Hook",
  "Horn", "Horse", "Hose", "Hotel", "Hurricane",
  // I
  "Igloo", "Iron", "Island",
  // J
  "Jack", "Jacket", "Jaguar", "Jam", "Jar", "Jelly", "Jellyfish", "Jet", "Jewel", "Jigsaw", "Joker", "Judge",
  "Juice", "Jungle",
  // K
  "Kangaroo", "Kayak", "Kettle", "King", "Kite", "Kiwi", "Knife", "Knight", "Knot", "Koala",
  // L
  "Ladder", "Lake", "Lamp", "Lantern", "Laser", "Lava", "Leaf", "Lemon", "Lemonade", "Letter", "Library", "Light",
  "Lime", "Lion", "Lizard", "Llama", "Lobster", "Lock", "Locket",
  // M
  "Magnet", "Mammoth", "Map", "Marble", "Market", "Mars", "Mask", "Match", "Maze", "Medal", "Melon", "Mercury",
  "Mermaid", "Meteor", "Microwave", "Mine", "Mint", "Mirror", "Mitten", "Model", "Mole", "Monkey", "Monster", "Moon",
  "Moose", "Mop", "Mosquito", "Mouse", "Mud", "Muffin", "Mug", "Mummy", "Museum", "Mushroom",
  // N
  "Nail", "Napkin", "Necklace", "Needle", "Nest", "Ninja", "Noodle", "Nose", "Note", "Notebook", "Nurse",
  // O
  "Ocean", "Octopus", "Olive", "Onion", "Orange", "Orbit", "Organ", "Ostrich", "Otter", "Oven",
  // P
  "Paddle", "Paint", "Pajamas", "Palace", "Palm", "Pancake", "Panda", "Paper", "Parade", "Parrot", "Pasta", "Peach",
  "Peacock", "Peanut", "Pearl", "Pebble", "Pelican", "Pencil", "Penguin", "Penny", "Pepper", "Piano", "Pickle", "Pig",
  "Pigeon", "Pillow", "Pilot", "Pineapple", "Pipe", "Pirate", "Pitch", "Pitcher", "Pizza", "Plane", "Planet",
  "Plant", "Plate", "Plug", "Pocket", "Pole", "Pond", "Pony", "Pool", "Popcorn", "Popsicle", "Potato", "Pound",
  "Pretzel", "Prince", "Pudding", "Puddle", "Pumpkin", "Punch", "Pupil", "Puppet", "Purse", "Puzzle", "Pyramid",
  // Q
  "Quarter", "Queen", "Quilt",
  // R
  "Rabbit", "Raccoon", "Racket", "Radio", "Rain", "Rainbow", "Raven", "Record", "Reindeer", "Remote", "Rhino",
  "Ribbon", "Ring", "River", "Road", "Robin", "Robot", "Rock", "Rocket", "Roof", "Root", "Rope", "Rose", "Ruler",
  // S
  "Saddle", "Sail", "Salad", "Salmon", "Salt", "Sand", "Sandal", "Satellite", "Saturn", "Sausage", "Saw",
  "Saxophone", "Scale", "Scarecrow", "Scarf", "School", "Scooter", "Scout", "Screen", "Screw", "Seahorse", "Seal",
  "Seed", "Shadow", "Shark", "Sheep", "Shell", "Sheriff", "Shield", "Ship", "Shirt", "Shoe", "Shovel", "Silver",
  "Sink", "Skate", "Skeleton", "Skunk", "Sled", "Slide", "Slipper", "Sloth", "Snail", "Snake", "Snow", "Snowflake",
  "Snowman", "Soap", "Sock", "Sofa", "Soldier", "Soup", "Space", "Spaceship", "Sphinx", "Spider", "Spinach",
  "Spine", "Sponge", "Spoon", "Spot", "Spring", "Square", "Squid", "Squirrel", "Stable", "Staff", "Stage", "Stamp",
  "Star", "Station", "Statue", "Stick", "Stone", "Storm", "Stove", "Straw", "Street", "String", "Submarine", "Sugar",
  "Suit", "Suitcase", "Sunflower", "Sushi", "Swan", "Sweater", "Swing", "Sword",
  // T
  "Table", "Tablet", "Taco", "Tail", "Tank", "Tape", "Taxi", "Teacher", "Teapot", "Telescope", "Temple", "Tennis",
  "Tent", "Thread", "Throne", "Thunder", "Ticket", "Tie", "Tiger", "Tire", "Toad", "Toast", "Toaster", "Tomato",
  "Tooth", "Torch", "Tornado", "Tortoise", "Towel", "Tower", "Toy", "Track", "Tractor", "Train", "Treasure", "Tree",
  "Triangle", "Trolley", "Trophy", "Truck", "Trumpet", "Trunk", "Tuba", "Tube", "Tulip", "Tunnel", "Turkey",
  "Turtle", "Tuxedo",
  // U
  "Umbrella", "Unicorn", "Unicycle",
  // V
  "Valley", "Vampire", "Vase", "Violin", "Volcano",
  // W
  "Waffle", "Wagon", "Wall", "Wallet", "Walrus", "Wand", "Wardrobe", "Watch", "Waterfall", "Wave", "Web", "Well",
  "Whale", "Wheat", "Wheel", "Whisk", "Whistle", "Wig", "Windmill", "Window", "Wing", "Witch", "Wizard", "Wolf",
  "Worm", "Wrench",
  // Y
  "Yacht", "Yard", "Yarn", "Yogurt",
  // Z
  "Zebra", "Zipper", "Zoo",
];
