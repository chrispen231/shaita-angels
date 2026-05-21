import Link from 'next/link'

export default function AboutPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Hero */}
      <section className="relative w-full overflow-hidden" style={{ height: '320px' }}>
        <img
          src="/gallery-3.jpg"
          alt="Shaita Angels FC"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.98) 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.6) 0%, transparent 60%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            Our Story
          </p>
          <h1 className="text-white font-black uppercase tracking-tight" style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}>
            About Shaita<br />
            <span style={{ color: '#CC0000' }}>Angels FC</span>
          </h1>
        </div>
      </section>

      {/* Club Story */}
      <section className="px-6 py-12" style={{ background: '#0f0f0f' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#CC0000' }}>
              Who We Are
            </p>
            <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-5">
              Born from Passion,<br />Built for Glory
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#888' }}>
              Shaita Angels FC was founded in 2019 by a group of passionate kickball players in Careysburg, Liberia, with a shared dream — to create a women's football club that would make their community proud.
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#888' }}>
              The club's first season in 2019/20 was disrupted by the global COVID-19 pandemic, but the Angels refused to let adversity define them. They bounced back stronger, earning promotion to the Liberian Women's top flight at the end of the 2020/21 season.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#888' }}>
              After a difficult debut top-flight campaign, the club regrouped and won the women's lower league in 2022/23 to earn promotion again. What followed was nothing short of remarkable — a second-place finish in the 2023/24 top-flight, an FA Cup title, and the LFA Super Cup in 2024/25.
            </p>
          </div>
          <div className="relative rounded-xl overflow-hidden" style={{ height: '340px' }}>
            <img
              src="/news-featured.jpg"
              alt="Shaita Angels FC History"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}
            />
            <div
              className="absolute bottom-4 left-4 text-white text-xs font-black px-3 py-1"
              style={{ background: '#CC0000' }}
            >
              LFA SUPER CUP CHAMPIONS 2024/25
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 py-12" style={{ background: '#0a0a0a' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-3 text-center" style={{ color: '#CC0000' }}>
            Our Journey
          </p>
          <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-10 text-center">
            Club Timeline
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div
              className="absolute left-6 top-0 bottom-0 w-px"
              style={{ background: '#1a1a1a' }}
            />
            {[
              {
                year: '2019',
                title: 'Club Founded',
                desc: 'Shaita Angels FC founded in Careysburg by a group of kickball players with a dream.',
                highlight: false,
              },
              {
                year: '2019/20',
                title: 'First Season',
                desc: 'Debut season cut short by the COVID-19 pandemic.',
                highlight: false,
              },
              {
                year: '2020/21',
                title: 'First Promotion',
                desc: 'Earned promotion to the Liberian Women\'s top flight for the first time.',
                highlight: true,
              },
              {
                year: '2021/22',
                title: 'Top Flight Debut',
                desc: 'Debut season in the top flight. Relegated after a difficult campaign.',
                highlight: false,
              },
              {
                year: '2022/23',
                title: 'Champions — Lower League',
                desc: 'Won the women\'s lower league title to earn promotion back to the top flight.',
                highlight: true,
              },
              {
                year: '2023/24',
                title: 'Runners-Up & FA Cup Winners',
                desc: 'Finished second in the LFA Premier League and won the FA Cup — the club\'s first ever trophy.',
                highlight: true,
              },
              {
                year: '2024/25',
                title: 'Super Cup Champions 🏆',
                desc: 'Defeated World Girls FC 3-1 to claim the LFA Super Cup. Careysburg celebrated!',
                highlight: true,
              },
            ].map((item, i) => (
              <div key={i} className="relative flex gap-6 mb-8 pl-16">
                {/* Dot */}
                <div
                  className="absolute left-4 top-1 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2 flex-shrink-0"
                  style={{
                    background: item.highlight ? '#CC0000' : '#1a1a1a',
                    border: item.highlight ? '2px solid #CC0000' : '2px solid #333',
                  }}
                >
                  {item.highlight && (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#fff' }} />
                  )}
                </div>
                <div>
                  <p
                    className="text-xs font-black tracking-widest uppercase mb-1"
                    style={{ color: item.highlight ? '#CC0000' : '#555' }}
                  >
                    {item.year}
                  </p>
                  <p className="text-white font-black text-sm mb-1">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trophies */}
      <section className="px-6 py-12" style={{ background: '#0f0f0f' }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-3 text-center" style={{ color: '#CC0000' }}>
            Honours
          </p>
          <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-8 text-center">
            Trophy Cabinet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              {
                trophy: 'LFA Super Cup',
                year: '2024/25',
                desc: 'Defeated World Girls FC 3-1 in the final',
              },
              {
                trophy: 'LFA FA Cup',
                year: '2023/24',
                desc: 'First ever cup title in the club\'s history',
              },
              {
                trophy: 'Women\'s Lower League',
                year: '2022/23',
                desc: 'Champions — earned promotion to top flight',
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl p-5 flex gap-4 items-start"
                style={{
                  background: '#1a1a1a',
                  border: i === 0 ? '1px solid #CC0000' : '1px solid #222',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: i === 0 ? '#CC0000' : '#222' }}
                >
                  🏆
                </div>
                <div>
                  <p className="text-white font-black text-sm mb-1">{t.trophy}</p>
                  <p
                    className="text-xs font-black tracking-widest mb-2"
                    style={{ color: '#CC0000' }}
                  >
                    {t.year}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 py-12" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-3 text-center" style={{ color: '#CC0000' }}>
            What Drives Us
          </p>
          <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-8 text-center">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: '⚡',
                title: 'Passion',
                desc: 'Every player, every coach, every supporter bleeds red and black. We play with heart and hunger every time we step on the pitch.',
              },
              {
                icon: '🤝',
                title: 'Community',
                desc: 'We are Careysburg\'s club. Rooted in our community, we exist to inspire the next generation of women footballers in Liberia.',
              },
              {
                icon: '🏆',
                title: 'Excellence',
                desc: 'We demand the best of ourselves. From training to match day, we hold ourselves to the highest standards on and off the pitch.',
              },
            ].map((v, i) => (
              <div
                key={i}
                className="rounded-xl p-6 text-center"
                style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
              >
                <div className="text-4xl mb-4">{v.icon}</div>
                <p className="text-white font-black text-sm uppercase tracking-widest mb-3">{v.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-6 py-12 text-center"
        style={{ background: '#CC0000' }}
      >
        <p className="text-white font-black text-2xl uppercase tracking-tight mb-3">
          Join the Angels Family
        </p>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Whether you're a fan, a sponsor, or a player — there's a place for you at Shaita Angels FC.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/fan-zone"
            className="text-xs font-black tracking-widest px-6 py-3 transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: '#CC0000' }}
          >
            JOIN FAN ZONE
          </Link>
          <Link
            href="/contact"
            className="text-xs font-black tracking-widest px-6 py-3 border transition-colors hover:bg-white hover:text-red-600"
            style={{ border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff' }}
          >
            CONTACT US
          </Link>
        </div>
      </section>

    </div>
  )
}