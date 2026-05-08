import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await register(formData);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose}></div>
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="modal-content card"
        >
          <div className="modal-header">
            <h2>{isLogin ? 'Welcome Back' : 'Join Evalify'}</h2>
            <button onClick={onClose} className="icon-btn"><X size={20} /></button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" name="name" 
                  value={formData.name} onChange={handleChange} 
                  required={!isLogin} className="input-field"
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" name="email" 
                value={formData.email} onChange={handleChange} 
                required className="input-field"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" name="password" 
                value={formData.password} onChange={handleChange} 
                required className="input-field"
              />
            </div>
            {!isLogin && (
              <div className="form-group">
                <label>I am a...</label>
                <select name="role" value={formData.role} onChange={handleChange} className="input-field">
                  <option value="USER">Developer</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>
            )}
            
            <button type="submit" className="btn-primary full-width mt-4" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          
          <div className="modal-footer mt-4 text-center">
            <span className="text-sm text-secondary">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="text-link" 
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-backdrop {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(4px);
        }
        .modal-content {
          position: relative;
          width: 100%; max-width: 400px;
          z-index: 1001; background: var(--bg-card);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.5rem;
        }
        .icon-btn { color: var(--text-secondary); }
        .icon-btn:hover { color: var(--text-primary); }
        .form-group { margin-bottom: 1rem; }
        .form-group label {
          display: block; font-size: 0.875rem; margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }
        .input-field {
          width: 100%; padding: 0.75rem;
          background: var(--bg-hover); border: 1px solid var(--border-color);
          border-radius: var(--radius-sm); color: white;
          font-family: inherit;
        }
        .input-field:focus {
          outline: none; border-color: var(--accent-lavender);
        }
        .full-width { width: 100%; }
        .mt-4 { margin-top: 1rem; }
        .text-center { text-align: center; }
        .text-sm { font-size: 0.875rem; }
        .text-secondary { color: var(--text-secondary); }
        .text-link { color: var(--accent-lavender); font-weight: 500; }
        .text-link:hover { text-decoration: underline; }
        .error-message {
          background: rgba(239, 68, 68, 0.1); color: var(--danger);
          padding: 0.75rem; border-radius: var(--radius-sm);
          margin-bottom: 1rem; font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default AuthModal;
