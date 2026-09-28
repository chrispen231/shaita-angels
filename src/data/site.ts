export const navigation = [
  { href: "/team", label: "The team" },
  { href: "/matches", label: "Matches" },
  { href: "/news", label: "News" },
  { href: "/club", label: "The club" },
  { href: "/media", label: "Media" },
];

export const articles = [
  {
    slug: "orange-cup-champions-2026",
    category: "Trophy room",
    date: "14 July 2026",
    title: "The Angels bring the Orange Cup back to Careysburg",
    excerpt:
      "Shaita Angels closed the season with a 2–1 victory over World Girls in the 2026 Orange Cup final.",
    image: "/orange-cup-2026.jpg",
    imageAlt: "Shaita Angels and supporters celebrate winning the 2026 Orange Cup",
    body: [
      "Shaita Angels finished the 2025–26 campaign with silverware, defeating World Girls 2–1 in the Orange Cup final at the SKD Sports Complex Practice Pitch.",
      "The cup win followed a narrow miss in the league title race. The Angels pushed Determine Girls to the final day before a goalless draw settled the championship. The response in the cup final gave the Careysburg club a second Orange Cup title, following its 2024 triumph.",
      "The result added another chapter to a club story that began in 2019 with a group of Careysburg kickball players choosing to take on football.",
    ],
  },
  {
    slug: "one-point-from-history-2026",
    category: "Match report",
    date: "10 July 2026",
    title: "One point from history",
    excerpt:
      "A final-day draw with Determine Girls left Shaita Angels just short of a first Upper Women’s League title.",
    image: "/gallery-3.jpg",
    imageAlt: "Shaita Angels players ready for a match",
    body: [
      "The 2025–26 Upper Women’s League came down to its final fixture. Shaita Angels and Determine Girls played out a 0–0 draw, allowing Determine Girls to retain the title by a single point.",
      "Shaita entered the match knowing a win would deliver the club’s first top-flight league crown. The campaign still ended with a major achievement: a second-place league finish and, days later, the Orange Cup trophy.",
    ],
  },
  {
    slug: "orange-cup-winners-2024",
    category: "Club history",
    date: "2024",
    title: "A first Orange Cup, decided from the spot",
    excerpt:
      "A 0–0 final against World Girls went to penalties, where Shaita Angels claimed the 2024 cup.",
    image: "/gallery-1.jpg",
    imageAlt: "Shaita Angels players celebrate together on the pitch",
    body: [
      "Shaita Angels won the 2024 Women’s Orange Cup after a goalless final against World Girls. The Angels converted four penalties to win the shootout 4–3 and secure the club’s first Orange Cup.",
      "That cup run followed the club’s 2022–23 Women’s Lower League championship and promotion, then a runner-up finish in the 2023–24 top flight.",
    ],
  },
];

export const honors = [
  { year: "2026", name: "Orange Cup", detail: "Winners · beat World Girls 2–1" },
  { year: "2024", name: "Orange Cup", detail: "Winners · 4–3 on penalties" },
  { year: "2024–25", name: "LFA Women’s Super Cup", detail: "Winners · 1–1, won 4–3 on penalties" },
  { year: "2022–23", name: "Women’s Lower League", detail: "Champions · promoted to the top flight" },
];

export const squad = [
  {
    position: "Goalkeepers",
    players: [
      { number: 1, name: "Asata Dulleh" },
      { number: 27, name: "Albertha N. Pratt" },
      { number: 30, name: "Blessing King" },
    ],
  },
  {
    position: "Defenders",
    players: [
      { number: 2, name: "Rebecca Tarr" },
      { number: 4, name: "Francisca T. Howe" },
      { number: 5, name: "Esther Massalay" },
      { number: 6, name: "Comfort Osei Frimpong" },
      { number: 7, name: "Celestina Boye" },
      { number: 13, name: "Blessing Kerkulah" },
      { number: 14, name: "Malusu Blama" },
      { number: 17, name: "Oretha R. Tokpah" },
      { number: 21, name: "Aline Capehart" },
    ],
  },
  {
    position: "Midfielders",
    players: [
      { number: 12, name: "Sylvia Pyne" },
      { number: 15, name: "Salimata Saidykhan" },
      { number: 16, name: "Deborah Nyarko" },
      { number: 18, name: "Christine Kouadio" },
      { number: 19, name: "Marie Pascale Lorignon" },
      { number: 20, name: "Ganiyat Adeleke" },
    ],
  },
  {
    position: "Attackers",
    players: [
      { number: 8, name: "Kumba Kuyateh" },
      { number: 9, name: "Sarah Abrafi" },
      { number: 10, name: "Lucy Gbeh Kikeh" },
      { number: 11, name: "Kaddy Jarju" },
      { number: 22, name: "Miatta Morris" },
      { number: 29, name: "Haddy Wally" },
    ],
  },
];

export const playerPhotos: Record<string, string[]> = {
  "Aline Capehart": ["/players/aline-capehart.jpg", "/players/aline-capehart-alt.jpg"],
  "Albertha N. Pratt": ["/players/albertha-pratt.jpg", "/players/albertha-pratt-alt.jpg"],
  "Blessing King": ["/players/blessing-king.jpg", "/players/blessing-king-alt.jpg"],
  "Francisca T. Howe": ["/players/francisca-howe.jpg"],
  "Ganiyat Adeleke": ["/players/ganiyat-adeleke.jpg", "/players/ganiyat-adeleke-alt.jpg"],
  "Haddy Wally": ["/players/haddy-wally.jpg", "/players/haddy-wally-alt.jpg"],
  "Rebecca Tarr": ["/players/rebecca-tarr.jpg"],
};

export const gallery = [
  { src: "/gallery-1.jpg", alt: "Shaita Angels players in their green away kit", label: "The squad" },
  { src: "/gallery-2.jpg", alt: "A Shaita Angels player controls the ball", label: "On the pitch" },
  { src: "/gallery-3.jpg", alt: "Shaita Angels players line up before a match", label: "Match day" },
  { src: "/hero.jpg", alt: "Shaita Angels team gathered on the pitch", label: "Careysburg" },
];

export const sections = {
  team: {
    eyebrow: "The Angels",
    title: "A team with Careysburg at its heart.",
    intro:
      "Meet the Shaita Angels squad, listed by position and shirt number. From the goalkeepers to the attackers, every player is part of the team’s story.",
  },
  matches: {
    eyebrow: "Match centre",
    title: "Every match matters.",
    intro:
      "The Angels finished the 2025–26 season with a league runners-up finish and an Orange Cup. New-season fixtures will appear here once announced.",
  },
  club: {
    eyebrow: "Our story",
    title: "From kickball roots to cup-winning history.",
    intro:
      "Founded in 2019 in Careysburg, Shaita Angels grew from a group of kickball players who wanted to take their game to the football pitch. The club now stands among Liberia’s leading women’s sides.",
  },
  news: {
    eyebrow: "Shaita Angels FC · Newsroom",
    title: "The latest from the Angels.",
    intro:
      "Club news, match reports, and milestones from Careysburg and beyond.",
  },
  media: {
    eyebrow: "Inside the club",
    title: "The Angels, in their own colours.",
    intro:
      "A first look at the people, match days, and community behind Shaita Angels. More photos and video will be added as the club’s archive grows.",
  },
  community: {
    eyebrow: "Careysburg & beyond",
    title: "A club that belongs to its community.",
    intro:
      "Shaita Angels began with local players and a shared ambition. The club’s story is part of the wider growth of women’s football in Liberia.",
  },
  tickets: {
    eyebrow: "Join us on match day",
    title: "The next match starts with you.",
    intro:
      "The 2026–27 fixture list and ticket details have not yet been published here. Follow the club’s official channels for confirmed dates, venue, and entry information.",
  },
  shop: {
    eyebrow: "The club shop",
    title: "Show your colours.",
    intro:
      "Home and away jerseys are $13 each, or $15 with delivery. Call +231 8804 97522 or +231 7772 49642 to order.",
  },
} as const;
