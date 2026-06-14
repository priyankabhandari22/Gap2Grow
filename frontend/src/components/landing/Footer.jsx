import { useEffect, useRef, useState } from 'react';
import { Linkedin, Twitter, Instagram, Facebook } from 'lucide-react';
import './Footer.css';
import logoImg from '../../assets/logo.jpeg';
const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  const cols = [
    {
      title: "Product",
      links: ["Features", "How It Works", "Pricing"]
    },
    {
      title: "Company",
      links: ["About Us", "Blog", "Contact", "Careers"]
    },
    {
      title: "Support",
      links: ["Help Center", "FAQ", "Privacy Policy", "Terms of Service"]
    }
  ];

  return (
    <footer className="footer-section" ref={footerRef}>
      <div className={`footer-container ${isVisible ? 'visible' : ''}`}>
        
        {/* Main Footer Layout */}
        <div className="footer-columns">
          
          {/* Col 1: Brand */}
          <div className="footer-col brand-col" style={{ transitionDelay: '0ms' }}>
            <div className="footer-logo">
              <img src={logoImg} alt="Gap2Grow Logo" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', filter: 'brightness(0) invert(1)' }} />
              <span>Gap2Grow</span>
            </div>
            <p className="footer-subtext">Bridging careers since 2024</p>
          </div>

          {/* Dynamic Links Columns */}
          {cols.map((col, index) => (
            <div 
              key={col.title} 
              className="footer-col" 
              style={{ transitionDelay: `${(index + 1) * 100}ms` }}
            >
              <h4 className="footer-heading">{col.title}</h4>
              <ul className="footer-links">
                {col.links.map(link => (
                  <li key={link}><a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a></li>
                ))}
              </ul>
            </div>
          ))}

          {/* Col 5: Social */}
          <div className="footer-col social-col" style={{ transitionDelay: '400ms' }}>
            <h4 className="footer-heading">Follow Us</h4>
            <div className="social-icons">
              <a href="#linkedin" className="social-icon" aria-label="LinkedIn"><Linkedin size={20} /></a>
              <a href="#twitter" className="social-icon" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="#instagram" className="social-icon" aria-label="Instagram"><Instagram size={20} /></a>
              <a href="#facebook" className="social-icon" aria-label="Facebook"><Facebook size={20} /></a>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="footer-divider"></div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="copyright">© 2024 Gap2Grow. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="#privacy">Privacy Policy</a>
            <span>|</span>
            <a href="#terms">Terms of Service</a>
            <span>|</span>
            <a href="#sitemap">Sitemap</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
