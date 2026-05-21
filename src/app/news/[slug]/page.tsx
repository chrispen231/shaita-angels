'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const articles: Record<string, {
  title: string
  category: string
  date: string
  readTime: string
  image: string
  content: string
}> = {
  'angels-claim-super-cup-glory': {
    title: 'Angels claim LFA Super Cup glory in stunning fashion',
    category: 'Match Report',
    date: 'May 10, 2025',
    readTime: '5 min read',
    image: '/news-featured.jpg',
    content: `Shaita Angels FC produced a stunning performance to claim the LFA Super Cup, defeating World Girls FC 3-1 in a memorable final that will live long in the memory of everyone connected with the club.

The Angels took the lead early through a clinical finish before doubling their advantage before half-time. World Girls FC pulled one back early in the second half to set up a tense finale, but Shaita Angels sealed the victory with a third goal that sparked wild celebrations.

It was a night that Careysburg will never forget — the streets were alive with the sound of celebration as fans poured out to welcome their champions home.

The victory adds the LFA Super Cup to the club's trophy cabinet, following their FA Cup triumph, cementing Shaita Angels FC as one of the premier women's football clubs in Liberia.

Head coach praised the squad's dedication and hard work throughout the season, saying the title was a reward for the sacrifices made by every player, member of staff and supporter.`,
  },
  'three-new-signings-confirmed': {
    title: 'Three new signings confirmed ahead of new season',
    category: 'Transfer',
    date: 'Apr 28, 2025',
    readTime: '3 min read',
    image: '/news-2.jpg',
    content: `Shaita Angels FC are delighted to confirm the signing of three new players ahead of the 2025/26 season. The new additions will strengthen the squad as the club looks to build on their LFA Super Cup success.

The signings demonstrate the club's ambition and commitment to competing at the highest level of women's football in Liberia. Full details of the players will be announced on the club's official channels in the coming days.

The club would like to welcome all three players to Shaita Angels FC and wish them every success during their time at the club.`,
  },
  'u20-player-welfare-statement': {
    title: 'Club statement on U-20 player welfare dispute',
    category: 'National Team',
    date: 'Apr 15, 2025',
    readTime: '4 min read',
    image: '',
    content: `Shaita Angels FC wishes to address recent reports regarding the withdrawal of three of our players from the Liberia Women's U-20 National Team squad for the WAFU-A U-20 Tournament.

The club made this difficult decision after raising serious concerns about player welfare and safety protocols with the relevant football authorities. The health and wellbeing of our players is our absolute priority, and we will always act in their best interests.

We remain fully committed to supporting the development of women's football in Liberia and look forward to working constructively with all stakeholders to resolve the outstanding issues.

Shaita Angels FC is proud of the contribution our players make to the national team and we hope to see this matter resolved swiftly so that our players can represent their country with pride.`,
  },
  'pre-season-training-underway': {
    title: 'Pre-season camp underway in Careysburg',
    category: 'Training',
    date: 'Apr 5, 2025',
    readTime: '2 min read',
    image: '/gallery-2.jpg',
    content: `Shaita Angels FC have begun preparations for the 2025/26 season with an intensive pre-season training camp at their Careysburg home ground.

The squad has been put through their paces by the coaching staff, working on fitness, tactical organisation and team cohesion ahead of the new campaign.

The coaching staff are pleased with the commitment and attitude shown by the players so far and are confident the squad will be well prepared when the new season kicks off.`,
  },
  'angels-finish-second-league': {
    title: 'Angels finish second in LFA Premier League 2023/24',
    category: 'Club News',
    date: 'Mar 20, 2025',
    readTime: '3 min read',
    image: '/gallery-3.jpg',
    content: `Shaita Angels FC finished runners-up in the LFA Women's Premier League for the 2023/24 season, capping a remarkable campaign for the Careysburg club.

The second-place finish represents another step forward for the club, who have grown rapidly since their founding in 2019. Combined with their FA Cup triumph, it was a season to remember for the Angels.

The club and its supporters will be looking to go one better in the 2025/26 campaign and bring the league title to Careysburg for the first time.`,
  },
  'fa-cup-winners-2024': {
    title: 'Shaita Angels crowned FA Cup champions',
    category: 'Match Report',
    date: 'Feb 14, 2025',
    readTime: '6 min read',
    image: '/news-featured.jpg',
    content: `Shaita Angels FC made history by winning the Liberian FA Cup for the first time in the club's history, defeating World Girls FC in a thrilling final.

The victory was met with scenes of incredible jubilation in Careysburg, as fans celebrated their club's biggest moment since its founding in 2019.

The trophy represents the culmination of years of hard work, sacrifice and dedication from everyone associated with Shaita Angels FC — from the players and coaching staff to the supporters who have backed the club every step of the way.

This is only the beginning. Shaita Angels FC are hungry for more.`,
  },
}

export default function ArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const article = articles[slug]

  if (!article) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh' }}
        className="flex items-center justify-center">
        <div className="text-center">
          <p className="font-black text-3xl mb-4" style={{ color: '#222' }}>Article not found</p>
          <Link href="/news"
            className="text-xs font-black tracking-widest px-6 py-3 text-white"
            style={{ background: '#CC0000' }}>
            BACK TO NEWS
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Hero image */}
      <div className="relative w-full" style={{ height: '320px' }}>
        {article.image && (
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div
          className="absolute inset-0 -z-10"
          style={{ background: 'linear-gradient(135deg, #CC0000, #880000)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 60%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 max-w-3xl mx-auto">
          <div
            className="inline-block text-white text-xs font-black px-3 py-1 mb-3 tracking-widest"
            style={{ background: '#CC0000' }}
          >
            {article.category.toUpperCase()}
          </div>
          <h1 className="text-white font-black text-2xl md:text-3xl leading-tight">
            {article.title}
          </h1>
          <p className="text-xs mt-3" style={{ color: '#888' }}>
            {article.date} · {article.readTime}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase mb-8 transition-colors hover:text-white"
          style={{ color: '#555' }}
        >
          <ArrowLeft size={14} />
          Back to News
        </Link>

        <div
          className="prose prose-invert max-w-none"
          style={{ color: '#aaa', lineHeight: '1.9', fontSize: '15px' }}
        >
          {article.content.split('\n\n').map((para, i) => (
            <p key={i} className="mb-5" style={{ color: '#aaa' }}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}