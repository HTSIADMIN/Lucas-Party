// Original topic cards for Odd One Out: 16 words each, shown as a 4×4 grid.
// Keep words short (they render in grid cells on the TV and on phones).

import type { OddTopic } from "@party/shared";

export const TOPICS: OddTopic[] = [
  { name: "Breakfast", words: ["Pancakes", "Waffles", "Bacon", "Omelette", "Cereal", "Toast", "Bagel", "Oatmeal", "Yogurt", "Croissant", "Smoothie", "Hash browns", "French toast", "Muffin", "Grapefruit", "Burrito"] },
  { name: "At the Zoo", words: ["Lion", "Giraffe", "Penguin", "Zebra", "Elephant", "Gorilla", "Flamingo", "Kangaroo", "Panda", "Hippo", "Koala", "Tiger", "Crocodile", "Camel", "Rhino", "Meerkat"] },
  { name: "Jobs", words: ["Doctor", "Firefighter", "Chef", "Pilot", "Teacher", "Plumber", "Astronaut", "Lawyer", "Farmer", "Dentist", "Detective", "Mail carrier", "Barber", "Lifeguard", "Librarian", "DJ"] },
  { name: "Sports", words: ["Soccer", "Basketball", "Tennis", "Golf", "Baseball", "Hockey", "Boxing", "Surfing", "Skiing", "Bowling", "Volleyball", "Wrestling", "Cycling", "Archery", "Rugby", "Skateboarding"] },
  { name: "At the Beach", words: ["Sandcastle", "Sunscreen", "Seashell", "Towel", "Umbrella", "Crab", "Waves", "Swimsuit", "Seagull", "Surfboard", "Cooler", "Lifeguard", "Flip-flops", "Beach ball", "Sunglasses", "Snorkel"] },
  { name: "Halloween", words: ["Pumpkin", "Ghost", "Witch", "Vampire", "Candy", "Costume", "Skeleton", "Bat", "Zombie", "Mummy", "Broomstick", "Spider web", "Cauldron", "Haunted house", "Werewolf", "Trick-or-treat"] },
  { name: "Outer Space", words: ["Rocket", "Astronaut", "Moon", "Mars", "Comet", "Black hole", "Satellite", "Alien", "Telescope", "Galaxy", "Meteor", "Space station", "Saturn", "Sun", "UFO", "Gravity"] },
  { name: "Desserts", words: ["Cupcake", "Brownie", "Ice cream", "Cheesecake", "Donut", "Pie", "Cookie", "Pudding", "Tiramisu", "Churro", "Macaron", "Sundae", "Fudge", "Cobbler", "Popsicle", "Crème brûlée"] },
  { name: "Instruments", words: ["Guitar", "Piano", "Drums", "Violin", "Trumpet", "Flute", "Saxophone", "Harp", "Ukulele", "Cello", "Accordion", "Harmonica", "Tuba", "Banjo", "Xylophone", "Bagpipes"] },
  { name: "Superpowers", words: ["Flying", "Invisibility", "Time travel", "Super strength", "Mind reading", "Teleporting", "Shape-shifting", "X-ray vision", "Super speed", "Healing", "Mind control", "Water breathing", "Laser eyes", "Weather control", "Animal talk", "Freezing time"] },
  { name: "In the Kitchen", words: ["Spatula", "Blender", "Toaster", "Microwave", "Whisk", "Frying pan", "Fridge", "Kettle", "Oven mitt", "Cutting board", "Ladle", "Grater", "Colander", "Rolling pin", "Dishwasher", "Can opener"] },
  { name: "Weather", words: ["Rain", "Snow", "Thunder", "Lightning", "Tornado", "Hail", "Fog", "Rainbow", "Hurricane", "Sunshine", "Drizzle", "Blizzard", "Heatwave", "Wind", "Frost", "Sleet"] },
  { name: "Fairy Tales", words: ["Dragon", "Princess", "Castle", "Wizard", "Knight", "Troll", "Unicorn", "Fairy godmother", "Glass slipper", "Magic mirror", "Giant", "Beanstalk", "Poison apple", "Tower", "Frog prince", "Gingerbread house"] },
  { name: "Camping", words: ["Tent", "Campfire", "Marshmallow", "Sleeping bag", "Flashlight", "Hiking boots", "Compass", "Lantern", "Canoe", "Bear", "Mosquito", "Map", "Backpack", "Pocketknife", "Ghost story", "Trail mix"] },
  { name: "Getting Around", words: ["Car", "Bus", "Train", "Bicycle", "Motorcycle", "Helicopter", "Submarine", "Tractor", "Scooter", "Sailboat", "Taxi", "Ambulance", "Hot air balloon", "Skateboard", "Tank", "Jet ski"] },
  { name: "School Days", words: ["Homework", "Recess", "Lunchbox", "Principal", "Backpack", "Chalkboard", "Pop quiz", "Field trip", "Locker", "Detention", "Cafeteria", "Yearbook", "Report card", "Science fair", "Gym class", "Hall pass"] },
  { name: "Pizza Toppings", words: ["Pepperoni", "Mushroom", "Pineapple", "Olives", "Sausage", "Onion", "Bacon", "Spinach", "Ham", "Jalapeño", "Anchovies", "Basil", "Chicken", "Peppers", "Extra cheese", "Tomato"] },
  { name: "The Wild West", words: ["Cowboy", "Saloon", "Sheriff", "Lasso", "Horse", "Cactus", "Tumbleweed", "Gold rush", "Stagecoach", "Spurs", "Outlaw", "Wanted poster", "Canyon", "Boots", "Rodeo", "Ranch"] },
  { name: "Casino Night", words: ["Poker", "Roulette", "Slot machine", "Blackjack", "Dice", "Chips", "Jackpot", "Dealer", "Bluff", "High roller", "Card shark", "Craps", "Lucky seven", "All in", "Showdown", "Vegas"] },
  { name: "Party Time", words: ["Balloons", "Cake", "Confetti", "DJ", "Karaoke", "Piñata", "Party hat", "Streamers", "Pizza", "Dance floor", "Presents", "Candles", "Disco ball", "Playlist", "Selfie", "Snacks"] },
  { name: "Pets", words: ["Dog", "Cat", "Hamster", "Goldfish", "Parrot", "Rabbit", "Turtle", "Guinea pig", "Snake", "Lizard", "Ferret", "Hedgehog", "Pony", "Chinchilla", "Tarantula", "Hermit crab"] },
  { name: "Under the Sea", words: ["Whale", "Octopus", "Coral", "Shark", "Jellyfish", "Starfish", "Seahorse", "Dolphin", "Shipwreck", "Treasure", "Submarine", "Sea turtle", "Lobster", "Kelp", "Pearl", "Squid"] },
  { name: "Clothes", words: ["Hoodie", "Jeans", "Tuxedo", "Sneakers", "Scarf", "Pajamas", "Sweater", "Raincoat", "Overalls", "Bow tie", "Beanie", "Swimsuit", "Sandals", "Cape", "Leggings", "Tank top"] },
  { name: "Fruit", words: ["Apple", "Banana", "Mango", "Strawberry", "Watermelon", "Pineapple", "Grape", "Kiwi", "Cherry", "Peach", "Coconut", "Lemon", "Blueberry", "Pear", "Papaya", "Pomegranate"] },
  { name: "Video Games", words: ["Boss fight", "Power-up", "Save point", "Respawn", "Level up", "Joystick", "High score", "Final boss", "Side quest", "Speedrun", "Loot", "Game over", "Cheat code", "Tutorial", "Multiplayer", "Extra life"] },
  { name: "Holidays", words: ["Birthday", "New Year's", "Valentine's", "Thanksgiving", "Halloween", "Christmas", "Easter", "Hanukkah", "Diwali", "Fourth of July", "Mother's Day", "April Fools'", "Lunar New Year", "St. Patrick's", "Groundhog Day", "Earth Day"] },
  { name: "Movie Night", words: ["Horror", "Comedy", "Western", "Musical", "Romance", "Sci-fi", "Documentary", "Action", "Mystery", "Fantasy", "Cartoon", "Thriller", "Superhero", "Disaster", "Heist", "Popcorn"] },
  { name: "Bathroom", words: ["Toothbrush", "Shower", "Towel", "Mirror", "Soap", "Bathtub", "Rubber duck", "Plunger", "Shampoo", "Toilet paper", "Hair dryer", "Razor", "Bath mat", "Floss", "Scale", "Sink"] },
  { name: "On the Farm", words: ["Tractor", "Barn", "Cow", "Chicken", "Pig", "Scarecrow", "Hay bale", "Goat", "Sheep", "Corn", "Rooster", "Silo", "Horse", "Pitchfork", "Duck", "Eggs"] },
  { name: "Game Night", words: ["Chess", "Checkers", "Dominoes", "Bingo", "Solitaire", "Charades", "Backgammon", "Mahjong", "Go Fish", "Crazy Eights", "Hangman", "Tic-tac-toe", "Bridge", "Mancala", "Old Maid", "Trivia"] },
  { name: "Feelings", words: ["Happy", "Angry", "Jealous", "Bored", "Nervous", "Proud", "Excited", "Confused", "Grumpy", "Sleepy", "Embarrassed", "Hopeful", "Lonely", "Surprised", "Silly", "Calm"] },
  { name: "Creepy Crawlies", words: ["Ant", "Bee", "Butterfly", "Spider", "Ladybug", "Mosquito", "Grasshopper", "Cockroach", "Firefly", "Snail", "Worm", "Beetle", "Dragonfly", "Moth", "Caterpillar", "Scorpion"] },
];
