import Header from '@/components/home/Header'
import Hero from '@/components/home/Hero'
import About from '@/components/home/About'
import Projects from '@/components/home/Projects'
import Blog from '@/components/home/Blog'
import Team from '@/components/home/Team'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Projects />
        <Blog />
        <Team />
      </main>
      <Footer />
    </>
  )
}
