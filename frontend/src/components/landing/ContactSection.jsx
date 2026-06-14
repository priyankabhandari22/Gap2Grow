import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import './ContactSection.css';

const ContactSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const [formState, setFormState] = useState('idle'); // idle, loading, success
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [focusedField, setFocusedField] = useState(null);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormState('loading');
    
    // Simulate API call
    setTimeout(() => {
      setFormState('success');
      setTimeout(() => {
        setFormState('idle');
        setFormData({ name: '', email: '', message: '' });
      }, 5000);
    }, 1500);
  };

  return (
    <section className="contact-section" id="contact" ref={sectionRef}>
      <div className="contact-container">
        
        <div className={`contact-header-wrapper ${isVisible ? 'visible' : ''}`}>
          <h2 className="contact-heading">Get in Touch</h2>
          <p className="contact-subheading">Have questions? We'd love to hear from you. Drop us a message and we'll get back to you soon.</p>
        </div>

        <div className={`contact-form-container ${isVisible ? 'visible' : ''}`}>
          {formState === 'success' ? (
            <div className="contact-success-state">
              <CheckCircle2 size={64} className="success-icon" />
              <h3>Thank you!</h3>
              <p>Your message has been sent successfully. We will get back to you shortly.</p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className={`form-label ${focusedField === 'name' ? 'focused' : ''}`}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
              </div>

              <div className="form-group">
                <label className={`form-label ${focusedField === 'email' ? 'focused' : ''}`}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
              </div>

              <div className="form-group">
                <label className={`form-label ${focusedField === 'message' ? 'focused' : ''}`}>Your Message</label>
                <textarea
                  name="message"
                  className="form-textarea"
                  placeholder="How can we help you?"
                  value={formData.message}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('message')}
                  onBlur={() => setFocusedField(null)}
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-btn" 
                disabled={formState === 'loading'}
              >
                {formState === 'loading' ? (
                  <>
                    <Loader2 size={20} className="spinner-icon" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
