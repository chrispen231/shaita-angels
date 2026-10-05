import Image from "next/image";
import Link from "next/link";
import { getArticles, getHonors, formatArticleDate } from "@/lib/content";
import styles from "./HomePage.module.css";
import { getPublishedFixtures } from "@/lib/fixtures";
import { formatMatchDate } from "@/lib/fixtures";
import FixtureCarousel from "@/components/FixtureCarousel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [articles, honors] = await Promise.all([getArticles(), getHonors()]);
  const lead = articles[0];
  const fixtures = await getPublishedFixtures();
  const latestResult = fixtures?.filter((fixture) => fixture.status === "played").sort((a, b) => b.match_date.localeCompare(a.match_date))[0];
  return <>
    <style>{`.site-header{position:relative;z-index:20;margin-bottom:-86px;background:linear-gradient(180deg,rgba(5,6,7,.68),rgba(5,6,7,0));border-bottom:0;color:white}.site-header .brand-copy strong,.site-header .desktop-nav>a:not(.nav-cta){color:white}.site-header .brand-copy small{color:var(--gold);text-transform:uppercase;text-align:justify;text-align-last:justify}.site-header .mobile-nav summary span{background:white}.site-header .mobile-menu{color:var(--ink)}.hero-content{position:absolute;inset:auto 0 72px;height:auto;padding-bottom:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:16px}.hero-copy .eyebrow{font-size:9px;line-height:1.4;margin:0 0 6px}.hero-copy h1{font-size:clamp(32px,4vw,54px);line-height:.9;letter-spacing:-.02em;max-width:none;margin:0;white-space:nowrap}.hero-copy .hero-lede{font-size:12px;line-height:1.4;margin:8px 0 0}.hero-actions{gap:16px}@media(max-width:680px){.site-header{height:72px;margin-bottom:-72px}.hero-content{inset:auto 0 56px;grid-template-columns:1fr;gap:10px}.hero-copy h1{font-size:clamp(29px,8vw,38px);white-space:normal}.hero-copy .hero-lede{font-size:11px;margin-top:6px}.hero-actions{gap:14px}}`}</style>
    <section className={`hero ${styles.homeHero}`}>
      <div className="hero-photo"><Image src="/hero-orange-cup-2026.jpg" alt="Shaita Angels celebrate their 2026 Orange Cup victory with the trophy" fill priority sizes="100vw" /></div>
      <div className="hero-shade" />
      <div className="wrap hero-content"><div className="hero-copy"><p className="eyebrow eyebrow-light">Women’s football · Liberia</p><h1>OUR HOME. <span>OUR GAME.</span></h1><p className="hero-lede">A club built in Careysburg. A future built together.</p></div><div className="hero-actions"><Link className="button button-primary" href="/team">Meet the Angels <span aria-hidden="true">↗</span></Link><Link className="hero-text-link" href="/club">Discover our story</Link></div></div>
    </section>
    <div className="champion-bar"><span className="champion-star" aria-hidden="true">✳</span><span>2026 WOMEN’S ORANGE CUP CHAMPIONS</span><span className="champion-separator">·</span><span>CAREYSBURG, LIBERIA</span></div>

    <section className="match-feature" aria-labelledby="latest-result-title">
          <div className="wrap match-wrap"><div className="match-heading"><p className="eyebrow eyebrow-light">Latest result</p><h2 id="latest-result-title">{fixtures === null ? "The cup is coming home." : latestResult ? `Shaita Angels vs ${latestResult.opponent}.` : "Matchday is coming."}</h2></div>
            {fixtures === null ? <><div className="match-scoreline"><div className="match-side"><span className="team-crest"><Image src="/shaita-angels-logo.png" alt="" width={56} height={56} /></span><span>SHAITA<br />ANGELS</span></div><div className="score">2 <i>–</i> 1</div><div className="match-side opponent"><span className="team-crest team-crest-light">WG</span><span>WORLD<br />GIRLS</span></div></div><div className="match-details"><span>2026 WOMEN’S ORANGE CUP · FINAL</span><span>14 JULY 2026</span><Link href="/matches">Match centre <span aria-hidden="true">↗</span></Link></div></> : latestResult ? <><div className="match-scoreline"><div className="match-side"><span className="team-crest"><Image src="/shaita-angels-logo.png" alt="" width={56} height={56} /></span><span>SHAITA<br />ANGELS</span></div><div className="score">{latestResult.shaita_goals} <i>–</i> {latestResult.opponent_goals}</div><div className="match-side opponent"><span className="team-crest team-crest-light">{latestResult.opponent.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</span><span>{latestResult.opponent.toUpperCase()}</span></div></div><div className="match-details"><span>{latestResult.competition.toUpperCase()}</span><span>{formatMatchDate(latestResult.match_date).toUpperCase()}</span><Link href="/matches">Match centre <span aria-hidden="true">↗</span></Link></div></> : <div className="match-details"><span>No results published yet</span><Link href="/matches">Match centre <span aria-hidden="true">↗</span></Link></div>}
          </div>
        </section>

        {fixtures && fixtures.length > 0 && <FixtureCarousel fixtures={fixtures} />}

    <section className="section wrap latest-section">
      <div className="section-topline"><div><p className="eyebrow">The latest</p><h2>News from the Angels.</h2></div><Link className="text-link" href="/news">All stories <span aria-hidden="true">↗</span></Link></div>
      <div className="lead-story"><Link className="lead-image" href={`/news/${lead.slug}`} aria-label={`Read: ${lead.title}`}><Image src={lead.image ?? "/news-featured.jpg"} alt={lead.imageAlt ?? lead.title} fill sizes="(max-width: 780px) 100vw, 58vw" /></Link><article className="lead-copy"><div className="news-meta"><span>{lead.category}</span><time>{formatArticleDate(lead.date)}</time></div><h3><Link href={`/news/${lead.slug}`}>{lead.title}</Link></h3><p>{lead.excerpt}</p><Link className="text-link" href={`/news/${lead.slug}`}>Read the story <span aria-hidden="true">↗</span></Link></article></div>
    </section>

    <section className="honors-band"><div className="wrap honors-wrap"><div className="honors-intro"><p className="eyebrow eyebrow-light">A growing legacy</p><h2>Made of<br /><span>more.</span></h2><p>Every season adds to the story. Every trophy belongs to the people who made it possible.</p><Link className="button button-outline" href="/club">Explore our honours</Link></div><div className="honors-stack">{honors.slice(0, 3).map((honor) => <article className="honor-row" key={`${honor.year}-${honor.name}`}><span className="honor-star" aria-hidden="true">✳</span><span className="honor-year">{honor.year}</span><div><strong>{honor.name}</strong><small>{honor.detail ?? ""}</small></div><span className="honor-cup">CHAMPIONS</span></article>)}</div></div></section>

    <section className="section wrap origin-section"><div className="origin-image"><Image src="/gallery-3.jpg" alt="Shaita Angels players lined up together" fill sizes="(max-width: 780px) 100vw, 45vw" /><span className="origin-image-tag">CAREYSBURG · SINCE 2019</span></div><div className="origin-copy"><p className="eyebrow">More than a club</p><h2>Started with a ball.<br />Built by belief.</h2><p>Shaita Angels began as a group of Careysburg kickball players who chose football. Today the Angels are cup winners, league challengers, and part of a new chapter for women’s football in Liberia.</p><Link className="text-link" href="/club">The Shaita story <span aria-hidden="true">↗</span></Link></div></section>

    <section className="fan-cta"><div className="wrap fan-cta-inner"><div><p className="eyebrow eyebrow-light">Every voice matters</p><h2>Careysburg, let’s<br /><span>make some noise.</span></h2></div><Link className="button button-light" href="/community">Be part of the story <span aria-hidden="true">↗</span></Link></div></section>
  </>;
}
