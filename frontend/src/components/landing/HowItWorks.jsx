import React, { useEffect, useRef, useState } from 'react';
import './HowItWorks.css';

const HowItWorks = () => {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      id: 1,
      title: "Set Your Goals",
      description: "Choose your career goal and target industry",
      colorClass: "accent-violet"
    },
    {
      id: 2,
      title: "Input Skills",
      description: "Enter your skills or upload your resume",
      colorClass: "accent-cyan"
    },
    {
      id: 3,
      title: "AI Analysis",
      description: "The system analyzes market trends and requirements",
      colorClass: "accent-fuchsia"
    },
    {
      id: 4,
      title: "Get Roadmap",
      description: "Receive personalized insights and learning roadmap",
      colorClass: "accent-blue"
    }
  ];

  return (
    <section className="how-section" id="how-it-works" ref={sectionRef}>
      <div className="how-pattern-overlay"></div>
      
      <div className="how-container">
        <div className={`how-header-wrapper ${isVisible ? 'visible' : ''}`}>
          <h2 className="how-heading">Get Started in 4 Simple Steps</h2>
          <p className="how-subheading">Your journey to skill mastery starts here</p>
        </div>

        <div className="steps-wrapper">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Card */}
              <div 
                className={`step-card ${step.colorClass} ${isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="smooth-lining"></div>
                <div className="step-badge-wrapper">
                  <div 
                    className={`step-badge ${isVisible ? 'visible' : ''}`}
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    {step.id}
                  </div>
                </div>
                
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>

              {/* Connecting Line (Desktop) */}
              {index < steps.length - 1 && (
                <div className="step-connector desktop-only">
                  <div 
                    className={`connector-line ${isVisible ? 'fill' : ''}`}
                    style={{ transitionDelay: `${(index + 1) * 200 + 400}ms` }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
