import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

const AnimatedCard = ({ 
  children, 
  className = '', 
  hover = true, 
  tap = false, 
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 0.3, ease: 'easeOut' },
  ...props 
}) => {
  const { theme } = useTheme();

  const cardVariants = {
    initial: { ...initial },
    animate: { ...animate },
    hover: hover ? {
      y: -8,
      boxShadow: theme === 'dark' 
        ? '0 20px 40px -10px rgba(124, 111, 247, 0.3)'
        : '0 20px 40px -10px rgba(99, 102, 241, 0.2)',
      borderColor: theme === 'dark' 
        ? 'rgba(124, 111, 247, 0.35)'
        : 'rgba(99, 102, 241, 0.35)',
    } : {},
    tap: tap ? {
      scale: 0.98,
      transition: { duration: 0.1 }
    } : {}
  };

  return (
    <motion.div
      className={`card ${className}`}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={hover ? "hover" : undefined}
      whileTap={tap ? "tap" : undefined}
      transition={{
        ...transition,
        boxShadow: { duration: 0.2 },
        borderColor: { duration: 0.2 }
      }}
      style={{
        transformOrigin: 'center',
        willChange: 'transform, box-shadow'
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
