import Image from "next/image";
import Link from "next/link";
import newsStyles from "./SectionPage.module.css";
import { articles, gallery, honors, sections } from "@/data/site";
import SquadGrid from "@/components/SquadGrid";
import MatchCentre from "@/components/MatchCentre";
import { getPublishedFixtures } from "@/lib/fixtures";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isCompetitionSlug } from "@/lib/fixtures";

type SectionKey = keyof typeof sections;

export type MatchFilters = { period: string | null; competition: string | null };

/** Reads and validates the match centre filters from the URL. */
export function parseMatchFilters(params: { period?: string; competition?: string }): MatchFilters {
  const period = params.period && /^\d{4}-\d{2}$/.test(params.period) ? params.period : null;
  const competition = params.competition && isCompetitionSlug(params.competition) ? params.competition : null;
  return { period, competition };
}

export default async function SectionPage({
  section,
  searchParams,
}: {
  section: SectionKey;
  searchParams?: { period?: string; competition?: string };
}) {
  const content = sections[section];
  const fixtures = section === "matches" ? await getPublishedFixtures() : null;
  const matchFilters = parseMatchFilters(searchParams ?? {});
  return (
    <>
      {section === "team" ? <>
        <nav className="team-subnav" aria-label="Women's team sections"><div className="wrap team-subnav-inner">
          <span>SHAITA ANGELS WOMEN</span><Link href="/team" aria-current="page">Squad</Link><Link href="/team/staff">Staff</Link><Link href="/matches">Matches</Link><Link href="/club#honours">Honours</Link>
        </div></nav>
        <section className="squad-page-heading"><div className="wrap"><p className="eyebrow">First team · 24 players</p><h1>The squad</h1><p>Meet the Angels. One team, every number, all together.</p></div></section>
      </> : <section className={`inner-hero ${section === "news" ? "news-hero" : ""}`}>
        <div className="wrap inner-hero-content"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="inner-intro">{content.intro}</p></div>
      </section>}
      <div className={`wrap page-content ${section === "team" ? "squad-page-content" : ""}`}>
        {section === "team" && <SquadGrid />}

        {section === "matches" && <>
                  <MatchCentre fixtures={fixtures} filters={matchFilters} configured={Boolean(getSupabaseConfig())} />
                  <div className="content-heading compact-heading"><div><p className="eyebrow">Recent milestones</p><h2>Seasons to remember</h2></div></div>
                  <div className="season-list"><article><span>2025–26</span><strong>Upper Women’s League</strong><em>Runners-up · 57 points</em></article><article><span>2025–26</span><strong>Women’s Orange Cup</strong><em>Champions · 2–1 vs World Girls</em></article><article><span>2024–25</span><strong>LFA Women’s Super Cup</strong><em>Champions · 4–3 on penalties</em></article></div>
                </>}

        {section === "club" && <>
          <div className="story-layout"><div className="story-image"><Image src="/gallery-1.jpg" alt="Shaita Angels players together in their green away kit in Careysburg" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="story-copy"><p className="eyebrow">Our beginning</p><h2>A different kind of first step.</h2><p>In 2019, a group of women in Careysburg made the move from kickball to football. That decision became Shaita Angels FC: a club rooted in its community and built around the ambition of women players.</p><p>The Angels won the Women’s Lower League in 2022–23, returned to the top division, finished second in 2023–24, then claimed the Orange Cup and Super Cup. In 2026 they added a second Orange Cup to the story.</p><Link className="text-link" href="/news">Read the latest stories <span aria-hidden="true">↗</span></Link></div></div>
          <div className="content-heading" id="honours"><div><p className="eyebrow">The honours</p><h2>Earned together.</h2></div></div>
          <div className="honors-list">{honors.map((honor) => <article key={`${honor.year}-${honor.name}`}><span>{honor.year}</span><strong>{honor.name}</strong><small>{honor.detail}</small><b aria-hidden="true">✳</b></article>)}</div>
        </>}

        {section === "news" && <div className={newsStyles.newsroom}>
          <div className="newsroom-label"><span className="eyebrow">The latest</span><span>SHAITA ANGELS FC <i aria-hidden="true">/</i> NEWSROOM</span></div>
          {articles[0] && <Link className="news-card news-card-featured news-lead-story" href={`/news/${articles[0].slug}`}>
            <div className="news-image"><Image src={articles[0].image} alt={articles[0].imageAlt} fill priority sizes="(max-width: 720px) 100vw, 60vw" /></div>
            <div className="news-copy"><span className="news-featured-tag">FEATURE STORY</span><div className="news-meta"><span>{articles[0].category}</span><time>{articles[0].date}</time></div><h2>{articles[0].title}</h2><p>{articles[0].excerpt}</p><span className="text-link">Read the story <span aria-hidden="true">↗</span></span></div>
          </Link>}
          <div className="content-heading news-archive-heading"><div><p className="eyebrow">From the archive</p><h2>More from the newsroom</h2></div><span className="data-note">Club stories · Match reports · History</span></div>
          <div className="news-grid news-archive-grid">{articles.slice(1).map((article) => <Link className="news-card" href={`/news/${article.slug}`} key={article.slug}>
            <div className="news-image"><Image src={article.image} alt={article.imageAlt} fill sizes="(max-width: 720px) 100vw, 50vw" /></div><div className="news-copy"><div className="news-meta"><span>{article.category}</span><time>{article.date}</time></div><h3>{article.title}</h3><p>{article.excerpt}</p><span className="text-link">Read story <span aria-hidden="true">↗</span></span></div>
          </Link>)}</div>
          <p className="newsroom-note">Stories are published as club updates are confirmed. Check back for more from the Angels.</p>
        </div>}

        {section === "media" && <>
          <div className="content-heading"><div><p className="eyebrow">From the archive</p><h2>Moments in red.</h2></div></div>
          <div className="gallery-grid">{gallery.map((photo, index) => <figure className={`gallery-item gallery-item-${index + 1}`} key={photo.src}><div><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 720px) 100vw, 50vw" /></div><figcaption>{photo.label}<span>SHAITA ANGELS FC</span></figcaption></figure>)}</div>
          <p className="data-note gallery-note">Photos supplied with the project. Dates and match captions will be added when confirmed by the club.</p>
        </>}

        {section === "community" && <>
          <div className="community-grid"><article className="community-feature"><p className="eyebrow">Built in Careysburg</p><h2>Our home is part of our identity.</h2><p>Shaita Angels began with local players, local pride, and a shared love of the game. The club’s rise reflects the talent and determination of women’s football across Liberia.</p><Link className="button button-light" href="/club">Discover our story</Link></article><div className="community-photo"><Image src="/gallery-1.jpg" alt="Shaita Angels players together on their home ground" fill sizes="(max-width: 720px) 100vw, 50vw" /></div></div>
          <div className="community-stats"><div><strong>2019</strong><span>Founded in Careysburg</span></div><div><strong>2×</strong><span>Orange Cup champions</span></div><div><strong>1</strong><span>Community. One club.</span></div></div>
        </>}

        {section === "tickets" && <>
          <div className="ticket-panel"><div><p className="eyebrow">Next fixture · to be announced</p><h2>We’ll see you at the ground.</h2><p>Match schedules and entry arrangements can change. We’ll publish official ticket information when fixtures are confirmed.</p></div><div className="ticket-mark"><Image src="/shaita-angels-logo.png" alt="Shaita Angels FC crest" width={120} height={120} /></div></div>
          <p className="data-note">Please use official club channels for ticket information. This website does not currently process ticket payments.</p>
        </>}

        {section === "shop" && <>
          <div className="kit-shop-intro"><p className="eyebrow">The club shop</p><h2>Wear the Angels.</h2><p>Home and away jerseys are $13 each, or $15 with delivery. Call either number below to order. Goalkeeper kit prices are not yet confirmed.</p></div>
          <div className="kit-products">
            <article className="kit-product"><div className="kit-product-photos"><div className="kit-product-main"><Image src="/kits/first-kit.jpg" alt="Shaita Angels home kit" fill sizes="(max-width: 680px) 100vw, 50vw" /></div><div className="kit-product-detail"><Image src="/kits/first-kit-detail.jpg" alt="Close view of the Shaita Angels home kit" fill sizes="140px" /></div><span className="kit-product-label">01 · HOME KIT</span></div><div className="kit-product-copy"><p className="eyebrow">Official team kit</p><h3>Home kit</h3><p>The Angels’ red-and-black home shirt.</p><p className="kit-price">$13 · $15 with delivery</p></div></article>
            <article className="kit-product"><div className="kit-product-photos"><div className="kit-product-main"><Image src="/kits/second-kit.jpg" alt="Shaita Angels away kit" fill sizes="(max-width: 680px) 100vw, 50vw" /></div><div className="kit-product-detail"><Image src="/kits/second-kit-detail.jpg" alt="Close view of the Shaita Angels away kit" fill sizes="140px" /></div><span className="kit-product-label">02 · AWAY KIT</span></div><div className="kit-product-copy"><p className="eyebrow">Official team kit</p><h3>Away kit</h3><p>The Angels’ white-and-green away shirt.</p><p className="kit-price">$13 · $15 with delivery</p></div></article>
            <article className="kit-product kit-product-pending"><div className="kit-product-photos"><span className="kit-product-label">03 · GOALKEEPER HOME KIT</span><div className="kit-pending-art"><Image src="/shaita-angels-logo.png" alt="" width={74} height={74} /><span>PHOTO COMING SOON</span></div></div><div className="kit-product-copy"><p className="eyebrow">Goalkeeper kit</p><h3>Goalkeeper home kit</h3><p>Official goalkeeper home kit image to be added.</p></div></article>
            <article className="kit-product kit-product-pending"><div className="kit-product-photos"><span className="kit-product-label">04 · GOALKEEPER AWAY KIT</span><div className="kit-pending-art"><Image src="/shaita-angels-logo.png" alt="" width={74} height={74} /><span>PHOTO COMING SOON</span></div></div><div className="kit-product-copy"><p className="eyebrow">Goalkeeper kit</p><h3>Goalkeeper away kit</h3><p>Official goalkeeper away kit image to be added.</p></div></article>
          </div>
          <div className="note-panel"><strong>Order by phone</strong><p>Call <a href="tel:+231880497522">+231 8804 97522</a> or <a href="tel:+231777249642">+231 7772 49642</a> to buy a home or away jersey. Jerseys cost $13, or $15 with delivery.</p></div>
        </>}
      </div>
    </>
  );
}
