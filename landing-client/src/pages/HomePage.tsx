import { useState } from 'react'
import Nav from '../components/Nav'
import Hero from '../components/Hero'
import AboutUs from '../components/AboutUs'
import BrandsSection from '../components/BrandsSection'
import WhyChoose from '../components/WhyChoose'
import StatsBand from '../components/StatsBand'
import StoreLocations from '../components/StoreLocations'
import Testimonials from '../components/Testimonials'
import InquirySection from '../components/InquirySection'
import ContactUs from '../components/ContactUs'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

export default function HomePage() {
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
      <Nav />
      <main>
        <Hero onApply={scrollToInquiry} />
        <AboutUs />
        <BrandsSection onGetStarted={handleGetStarted} />
        <WhyChoose />
        <StatsBand />
        <StoreLocations onApply={scrollToInquiry} />
        <Testimonials />
        <InquirySection key={selectedBrand} selectedBrand={selectedBrand} />
        <ContactUs onApply={scrollToInquiry} />
        <FinalCTA onApply={scrollToInquiry} />
      </main>
      <Footer />
    </>
  )
}
