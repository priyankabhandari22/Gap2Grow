import React, { useEffect, useRef, useState } from 'react';
import { FileSearch, Target, TrendingUp, Map, Award, ArrowRight } from 'lucide-react';
import './FeaturesSection.css';

const FeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      id: 1,
      title: "Resume Analyzer",
      description: "Upload resume and automatically extract skills with AI precision",
      icon: <FileSearch size={24} />,
      link: "/resume-analyzer",
      colorClass: "accent-violet"
    },
    {
      id: 2,
      title: "Skill Gap Analysis",
      description: "Compare your skills with industry job requirements instantly",
      icon: <Target size={24} />,
      link: "/skill-gap",
      colorClass: "accent-cyan"
    },
    {
      id: 3,
      title: "Market Intelligence",
      description: "See trending skills employers want right now",
      icon: <TrendingUp size={24} />,
      link: "/market-intelligence",
      colorClass: "accent-fuchsia"
    },
    {
      id: 4,
      title: "Learning Roadmap",
      description: "Get a personalized step-by-step learning plan for your goals",
      icon: <Map size={24} />,
      link: "/roadmap",
      colorClass: "accent-blue"
    },
    {
      id: 5,
      title: "AI Career Report",
      description: "Generate detailed career analysis with actionable recommendations",
      icon: <Award size={24} />,
      link: "/career-report",
      colorClass: "accent-purple"
    }
  ];

  return (
    <section className="features-section" id="features" ref={sectionRef}>
      <div className="features-container">
        
        <div className={`features-header-wrapper ${isVisible ? 'visible' : ''}`}>
          <h2 className="features-heading">Powerful Features Built for Students</h2>
          <p className="features-subheading">Everything you need to bridge your skill gap and land your dream job</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className={`feature-card ${feature.colorClass} ${isVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="smooth-lining"></div>
              <div className="feature-icon-container">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              
              <div className="feature-link">
                Learn more <ArrowRight size={14} className="link-arrow" />
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default FeaturesSection;
