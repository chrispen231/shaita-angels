import Image from "next/image";
import Link from "next/link";
import { getArticles, getHonors, formatArticleDate } from "@/lib/content";
import styles from "./HomePage.module.css";
import { getPublishedFixtures } from "@/lib/fixtures";
import { formatMatchDate } from "@/lib/fixtures";
import FixtureCarousel from "@/components/FixtureCarousel";
import HeroSlideshow, { type HeroSlide } from "@/components/HeroSlideshow";
import TrophyShowcase from "@/components/TrophyShowcase";
import HonorsTicker from "@/components/HonorsTicker";

import { ArrowUpRight } from "lucide-react";
export const dynamic = "force-dynamic";

/** Fallback hero used when no article is marked featured in the admin. */
const FALLBACK_SLIDE: HeroSlide = {
  slug: "",
  title: "",
  category: "",
  image: "/hero-orange-cup-2026.jpg",
  imageAlt: "Shaita Angels celebrate their 2026 Orange Cup victory with the trophy",
};

export default async function HomePage() {
  const [articles, honors] = await Promise.all([getArticles(), getHonors()]);
  const lead = articles[0];
  const fixtures = await getPublishedFixtures();
  const latestResult = fixtures?.filter((fixture) => fixture.status === "played").sort((a, b) => b.match_date.localeCompare(a.match_date))[0];

  /*
   * The hero rotates through articles the club has marked "Featured" in the
   * news admin, so a player-signing portrait never becomes the front page.
   * Falls back to the static cup photo when nothing is featured.
   */
  const heroSlides: HeroSlide[] = articles
    .filter((article) => article.isFeatured && article.image)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      category: article.category,
      image: article.image as string,
      imageAlt: article.imageAlt ?? article.title,
    }));
  const slides = heroSlides.length > 0 ? heroSlides : [FALLBACK_SLIDE];
  return <>
    <style>{`.site-header{position:relative;z-index:20;margin-bottom:-86px;background:linear-gradient(180deg,rgba(5,6,7,.68),rgba(5,6,7,0));border-bottom:0;color:white}.site-header .brand-copy strong,.site-header .desktop-nav>a:not(.nav-cta){color:white}.site-header .brand-copy small{color:var(--gold);text-transform:uppercase;text-align:justify;text-align-last:justify}.site-header .mobile-nav summary span{background:white}.site-header .mobile-menu{color:var(--ink)}.hero-content{position:absolute;inset:auto 0 72px;height:auto;padding-bottom:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:16px}.hero-copy .eyebrow{font-size:9px;line-height:1.4;margin:0 0 6px}.hero-copy h1{font-size:clamp(32px,4vw,54px);line-height:.9;letter-spacing:-.02em;max-width:none;margin:0;white-space:nowrap}.hero-copy .hero-lede{font-size:12px;line-height:1.4;margin:8px 0 0}.hero-actions{gap:16px}@media(max-width:680px){.site-header{height:72px;margin-bottom:-72px}.hero-content{inset:auto 0 56px;grid-template-columns:1fr;gap:10px}.hero-copy h1{font-size:clamp(29px,8vw,38px);white-space:normal}.hero-copy .hero-lede{font-size:11px;margin-top:6px}.hero-actions{gap:14px}}`}</style>
    <section className={`hero ${styles.homeHero}`}>
      <div className="hero-photo"><HeroSlideshow slides={slides} /></div>
      <div className="hero-shade" />
      <div className="wrap hero-content"><div className="hero-copy"><p className="eyebrow eyebrow-light">Women’s football · Liberia</p><h1>OUR HOME. <span>OUR GAME.</span></h1><p className="hero-lede">A club built in Careysburg. A future built together.</p></div><div className="hero-actions"><Link className="button button-primary" href="/team">Meet the Angels <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link><Link className="hero-text-link" href="/club">Discover our story</Link></div></div>
    </section>
    <HonorsTicker honors={honors} />

    <section className="match-feature" aria-label="Latest result">
          <div className="wrap match-wrap"><div className="match-heading"><p className="eyebrow eyebrow-light">Latest result</p></div>
            {fixtures === null ? <><div className="match-scoreline"><div className="match-side"><span className="team-crest club-crest"><Image src="/shaita-angels-logo.png" alt="" width={56} height={56} /></span><span>SHAITA<br />ANGELS</span></div><div className="score">2 <i>–</i> 1</div><div className="match-side opponent"><span className="team-crest opponent-crest">WG</span><span>WORLD<br />GIRLS</span></div></div><div className="match-details"><span>2026 WOMEN’S ORANGE CUP · FINAL</span><span>14 JULY 2026</span><Link href="/matches">Match centre <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div></> : latestResult ? <><div className="match-scoreline"><div className="match-side"><span className="team-crest club-crest"><Image src="/shaita-angels-logo.png" alt="" width={56} height={56} /></span><span>SHAITA<br />ANGELS</span></div><div className="score">{latestResult.shaita_goals} <i>–</i> {latestResult.opponent_goals}</div><div className="match-side opponent"><span className="team-crest opponent-crest">{latestResult.opponent_logo_url ? <Image src={latestResult.opponent_logo_url} alt="" width={56} height={56} /> : latestResult.opponent.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span><span>{latestResult.opponent.toUpperCase()}</span></div></div><div className="match-details"><span>{latestResult.competition.toUpperCase()}</span><span>{formatMatchDate(latestResult.match_date).toUpperCase()}</span><Link href="/matches">Match centre <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div></> : <div className="match-details"><span>No results published yet</span><Link href="/matches">Match centre <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div>}
          </div>
        </section>

        {fixtures && fixtures.length > 0 && <FixtureCarousel fixtures={fixtures} />}

    <section className="section wrap latest-section">
      <div className="section-topline"><div><p className="eyebrow">The latest</p><h2>News from the Angels.</h2></div><Link className="text-link" href="/news">All stories <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div>
      {/* Nothing published (every story unpublished, or none written yet) shows
          the fallback cup photo rather than throwing on articles[0]. */}
      {lead ? <div className="lead-story"><Link className="lead-image" href={`/news/${lead.slug}`} aria-label={`Read: ${lead.title}`}><Image src={lead.image ?? "/news-featured.jpg"} alt={lead.imageAlt ?? lead.title} fill sizes="(max-width: 780px) 100vw, 58vw" /></Link><article className="lead-copy"><div className="news-meta"><span>{lead.category}</span><time>{formatArticleDate(lead.date)}</time></div><h3><Link href={`/news/${lead.slug}`}>{lead.title}</Link></h3><p>{lead.excerpt}</p><Link className="text-link" href={`/news/${lead.slug}`}>Read the story <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></article></div> : <div className="lead-story"><div className="lead-image"><Image src={FALLBACK_SLIDE.image} alt={FALLBACK_SLIDE.imageAlt} fill sizes="(max-width: 780px) 100vw, 58vw" /></div><article className="lead-copy"><h3>New stories are on the way.</h3><p>The club hasn’t published any news yet. Check back soon for match reports and updates from Careysburg.</p></article></div>}
    </section>

    <TrophyShowcase
      honors={honors}
      title="Our trophies"
      subtitle="Every title belongs to the players, supporters and community behind the Angels."
      linkHref="/club#honours"
      linkLabel="View full club honours"
    />

    <section className="section wrap origin-section"><div className="origin-image"><Image src="/gallery-3.jpg" alt="Shaita Angels players lined up together" fill sizes="(max-width: 780px) 100vw, 45vw" /><span className="origin-image-tag">CAREYSBURG · SINCE 2019</span></div><div className="origin-copy"><p className="eyebrow">More than a club</p><h2>Started with a ball.<br />Built by belief.</h2><p>Shaita Angels began as a group of Careysburg kickball players who chose football. Today the Angels are cup winners, league challengers, and part of a new chapter for women’s football in Liberia.</p><Link className="text-link" href="/club">The Shaita story <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div></section>

    <section className="fan-cta"><div className="wrap fan-cta-inner"><div><p className="eyebrow eyebrow-light">Every voice matters</p><h2>Careysburg, let’s<br /><span>make some noise.</span></h2></div><Link className="button button-light" href="/community">Be part of the story <span aria-hidden="true"><ArrowUpRight className="inline-icon" /></span></Link></div></section>
  </>;
}
