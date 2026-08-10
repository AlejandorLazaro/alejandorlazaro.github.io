// profiles.ts

export interface Profile {
  id: number;
  version: string;
  name: string;
  subtitle: string;
  location: string;
  photo: string;
  bio: string;
  tags: string[];
  prompt: string;
  answer: string;
}

export const ALL_PROFILES: Profile[] = [
  {
    id: 1,
    version: "The Singer",
    name: "Alejandro",
    subtitle: '33 yrs of "Always down for karaoke"',
    location: "Humble, TX | Where the mic's at",
    photo: "/assets/img/match/mic.jpeg",
    bio: "Never shies away from a microphone, a duet, or a party anthem!",
    tags: ["John Legend", "Coldplay", "Switchfoot", "The Killers", "Panic at the Disco!"],
    prompt: "Wake me up:",
    answer: "Before you go, go!",
  },
  {
    id: 2,
    version: "The Gym-Goer",
    name: "Alejandro",
    subtitle: "Aesthetics *and* better health? Why not!",
    location: "Humble, TX | Away from the treadmill",
    photo: "/assets/img/match/mirror2.jpeg",
    bio: "I would've complimented you first, but I'm shy (and don't want to get banned from EōS)",
    tags: ["Fitness", "Calisthenics", "Discipline", "Dates that move"],
    prompt: "Train-or-date?",
    answer: "Either. Preferably both—then we grab Chipotle!",
  },
  {
    id: 3,
    version: "The Adventurer",
    name: "Alejandro",
    subtitle: "No challenge too large · no wonder too small",
    location: "Humble, TX | 'ooh, what's that?'",
    photo: "/assets/img/match/coast.jpeg",
    bio: "Hiking a 14er, skydiving, spontaneous trips to pop-up venues, I'm down for it all!",
    tags: ["Surprises", "Spontaneity", "Active", "Doer-of-stuff"],
    prompt: "Picking the next adventure:",
    answer: "Let's see what's happening in an hour and just go for it!",
  },
  {
    id: 4,
    version: "The Goofball",
    name: "Alejandro",
    subtitle: "Silliness is my middle name",
    location: "Humble, TX | where laughter rings",
    photo: "/assets/img/match/photobomb.jpeg",
    bio: "Dancing in public, singing in the parking lot, or just making internal joke #384",
    tags: ["Embarrassment? What's that?", "Clown Around", "Silly Faces", "Weird Memes"],
    prompt: "Why are you cry-laughing:",
    answer: "Because I remembered cats gagging at sour cream 😂",
  },
  {
    id: 5,
    version: "The Nerd",
    name: "Alejandro",
    subtitle: "What's your PokéDoku streak?",
    location: "Humble, TX | chopping wood in Lumbridge",
    photo: "/assets/img/match/nerd.jpeg",
    bio: "Sci-fi/fantasy novels, manga/manwha, or webnovels & watching anime or playing MMOs!",
    tags: ["Fiction Afficionado", "MMOs", "RPGs", "Pokémon", "Digimon", "Ankama", "Mihoyo"],
    prompt: "What's your favorite movie:",
    answer: "Digimon: The Movie! The hype still hits 20+ years later!",
  },
  {
    id: 7,
    version: "The Party Connector",
    name: "Alejandro",
    subtitle: "People hype-r · flirts with chaos",
    location: "Humble, TX | center of the dance floor",
    photo: "/assets/img/match/party.jpeg",
    bio: "The man (without) a plan, but the fun never stops! Variety is the spice of life! 💃🕺",
    tags: ["Friends", "Events", "Host energy", "Fun-first"],
    prompt: "My claim to party fame:",
    answer: "MC'd my sisters wedding... in two languages!",
  },
  {
    id: 8,
    version: "The Little Gamer",
    name: "Alejandro",
    subtitle: "Co-op > competitiveness",
    location: "Humble, TX | on the couch playing Mario Kart World",
    photo: "/assets/img/match/hair.jpeg",
    bio: "Long-time solo player, but love a good co-op! Let's have fun together and make memories!",
    tags: ["Co-op", "Nintendo", "Smash Bros", "Play", "Board Games"],
    prompt: "Gaming red flag:",
    answer: "Ending my longest road streak in Catan.",
  },
  {
    id: 9,
    version: "The Kid-at-Heart",
    name: "Alejandro",
    subtitle: "24/7 imagination · childlike wonder",
    location: "Humble, TX | hanging off the playground",
    photo: "/assets/img/match/upsidedown.jpeg",
    bio: "Playgrounds, cartwheels, and Lunchables. Real kids, kids at heart, we're all children of heaven!",
    tags: ["Play", "Adventures", "Curiosity", "Big goofy grin"],
    prompt: "How I know we'll click:",
    answer: "If we can laugh at something stupid and still feel safe doing it.",
  },
  {
    id: 10,
    version: "The Automator",
    name: "Alejandro",
    subtitle: "Builds fast · breaks things",
    location: "Humble, TX | tokens == Chuck-E-Cheese",
    photo: "/assets/img/match/rainbow.jpeg",
    bio: "Coding is a necessary evil to bring about wondrous magic! :(){ :|:& };:",
    tags: ["Techie", "Nerd", "Systematic approach", "KISS it til it's DRY", "Sunday is for REST"],
    prompt: "My dating promise:",
    answer: "I'll stop trying to explain code principles if you say you aren't interested.",
  },
  {
    id: 11,
    version: "The Supporter",
    name: "Alejandro",
    subtitle: "Romance—it's love that's sacrificial",
    location: "Humble, TX | or wherever the heart lies",
    photo: "/assets/img/match/drama.jpeg",
    bio: "I'll be wherever you need me to be, ready to support you in both light and heavy burdens.",
    tags: ["Servant hearted", "Playful intimacy", "Love is patient", "Love is kind"],
    prompt: "Green flag on a first date:",
    answer: "You're bold enough to be real—and calm enough to be kind.",
  },
];