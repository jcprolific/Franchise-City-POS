import { useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import BrandsSection from './components/BrandsSection'
import WhyChoose from './components/WhyChoose'
import StatsBand from './components/StatsBand'
import HowToStart from './components/HowToStart'
import Testimonials from './components/Testimonials'
import InquirySection from './components/InquirySection'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import './App.css'

export default function App() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)

  function scrollToInquiry() {
    document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth' })
  }
  function handleGetStarted(slug: string) {
    setSelectedBrand(slug)
    scrollToInquiry()
  }

  return (
    <>
      <Nav onApply={scrollToInquiry} />
      <Hero onApply={scrollToInquiry} />
      <BrandsSection onGetStarted={handleGetStarted} />
      <WhyChoose />
      <StatsBand />
      <HowToStart />
      <Testimonials />
      <InquirySection selectedBrand={selectedBrand} />
      <FinalCTA onApply={scrollToInquiry} />
      <Footer onApply={scrollToInquiry} />
    </>
  )
}
