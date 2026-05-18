import React from 'react';
import { motion } from 'framer-motion';

const AnimatedButton = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  ...props 
}) => {
  const getStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-display)',
      fontWeight: '600',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      position: 'relative',
      overflow: 'hidden'
    };

    const sizeStyles = {
      small: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
      medium: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
      large: { padding: '1rem 2rem', fontSize: '1.125rem' }
    };

    const variantStyles = {
      primary: {
        background: 'linear-gradient(135deg, var(--accent-lavender), #5849e6)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(124, 111, 247, 0.3)'
      },
      secondary: {
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)'
      },
      success: {
        background: 'var(--accent-mint)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0, 196, 154, 0.3)'
      },
      danger: {
        background: 'var(--danger)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
      },
      ghost: {
        background: 'transparent',
        color: 'var(--accent-lavender)',
        border: '1px solid var(--accent-lavender)'
      }
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled || loading ? 0.6 : 1,
      transform: disabled || loading ? 'none' : 'scale(1)',
      ...props.style
    };
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: disabled || loading ? {} : {
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    tap: disabled || loading ? {} : {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const loadingVariants = {
    initial: { rotate: 0 },
    animate: { rotate: 360 },
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity
    }
  };

  return (
    <motion.button
      style={getStyles()}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading && (
        <motion.div
          variants={loadingVariants}
          initial="initial"
          animate="animate"
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%'
          }}
        />
      )}
      {!loading && children}
    </motion.button>
  );
};

export default AnimatedButton;
