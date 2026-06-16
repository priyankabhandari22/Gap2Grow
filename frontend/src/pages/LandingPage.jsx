import React, { useState, useEffect } from 'react';
import Splash from '../components/landing/Splash';
import NavigationBar from '../components/landing/NavigationBar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorks from '../components/landing/HowItWorks';
import ContactSection from '../components/landing/ContactSection';
import Footer from '../components/landing/Footer';
import './LandingPage.css';

const LandingPage = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <Splash />;
  }

  return (
    <div className="landing-page">
      <NavigationBar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
