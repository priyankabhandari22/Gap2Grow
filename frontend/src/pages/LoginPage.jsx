import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = () => {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      setLoading(true);
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Animated Background Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>

      <div className="auth-card">
        <button className="auth-back-btn" onClick={() => navigate('/')} aria-label="Back to home">
          <ArrowLeft size={20} />
        </button>
        <div className="auth-header">
          <img src="/logo.jpeg" alt="Gap2Grow Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your Gap2Grow account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {(localError || error) && (
            <div className="auth-error">
              {localError || error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
