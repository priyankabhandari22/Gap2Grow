import React from 'react';
import './Splash.css';
import logoImg from '../../assets/logo.jpeg';

const Splash = () => {
  return (
    <div className="splash-fullscreen">
      {/* Background Animated Elements */}
      <div className="splash-orb orb-1"></div>
      <div className="splash-orb orb-2"></div>
      <div className="splash-orb orb-3"></div>
      
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`splash-particle particle-${i+1}`}></div>
      ))}
      
      <div className="splash-content">
        <div className="splash-logo-box">
          <img src={logoImg} alt="Gap2Grow Logo" className="splash-icon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '28px' }} />
        </div>
        
        <h1 className="splash-brand-text">Gap2Grow</h1>
        
        <div className="splash-spinner-container">
          <div className="spinner-ring ring-1"></div>
          <div className="spinner-ring ring-2"></div>
          <div className="spinner-ring ring-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
