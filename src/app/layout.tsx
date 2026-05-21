import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shaita Angels FC | Liberia Women\'s Football',
  description: 'Official website of Shaita Angels FC — LFA Super Cup Champions. Based in Careysburg, Liberia.',
  keywords: 'Shaita Angels FC, Liberia women football, LFA, Careysburg',
  openGraph: {
    title: 'Shaita Angels FC',
    description: 'Official website of Shaita Angels FC',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}
        style={{ background: '#0a0a0a', color: '#fff' }}>
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}