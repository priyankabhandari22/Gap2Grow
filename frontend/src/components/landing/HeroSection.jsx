import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, TrendingUp, Cpu, Award } from 'lucide-react';
import './HeroSection.css';

const HeroSection = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parallaxStyle = {
    transform: `translateY(${-scrollY * 0.2}px)`,
    opacity: Math.max(0.5, 1 - scrollY / 500)
  };

  const bgZoomStyle = {
    transform: `scale(${1 + scrollY * 0.0005})`
  };

  return (
    <section className="hero-section" id="home">
      {/* Animated Background */}
      <div className="hero-bg" style={bgZoomStyle}>
        <div className="hero-mesh"></div>
        <div className="hero-orb orb-a"></div>
        <div className="hero-orb orb-b"></div>
        <div className="hero-orb orb-c"></div>
        <div className="hero-orb orb-d"></div>
      </div>

      <div className="hero-container">
        
        {/* Left Content */}
        <div className="hero-content" style={parallaxStyle}>
          <h1 className="hero-headline">
            <span className="word-bounce w-1">Bridge</span>
            <span className="word-bounce w-2">the</span>
            <span className="word-bounce w-3">Gap</span>
            <span className="word-bounce w-4">Between</span>
            <span className="word-bounce w-5">Your</span>
            <span className="word-bounce w-6">Skills</span>
            <span className="word-bounce w-7">and</span>
            <span className="word-bounce w-8">Your</span>
            <span className="word-bounce w-9">Dream</span>
            <span className="word-bounce w-10">Job</span>
          </h1>
          
          <p className="hero-subheading">
            Gap2Grow analyzes your skills, compares them with market demands, and creates a personalized learning roadmap to accelerate your career growth. Start your journey today.
          </p>
          
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/signup')}>
              Get Started <ArrowRight size={18} className="btn-icon" />
            </button>
            <button className="btn-outline" onClick={() => navigate('/login')}>
              Upload Resume <FileText size={18} className="btn-icon" />
            </button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="hero-illustration">
          <div className="illustration-wrapper">
            {/* Abstract Graphic */}
            <div className="graphic-base">
              <div className="graphic-card card-top">
                <TrendingUp size={32} color="#06B6D4" />
                <span>Market Demand</span>
              </div>
              
              <div className="graphic-card card-right">
                <Cpu size={32} color="#A855F7" />
                <span>AI Processing</span>
              </div>
              
              <div className="graphic-card card-bottom">
                <Award size={32} color="#7C3AED" />
                <span>Skill Mastery</span>
              </div>
              
              {/* Central Connection Lines */}
              <div className="connection-lines"></div>
              
              {/* Floating abstract shapes inside illustration */}
              <div className="inner-shape shape-square"></div>
              <div className="inner-shape shape-circle"></div>
              <div className="inner-shape shape-triangle"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
