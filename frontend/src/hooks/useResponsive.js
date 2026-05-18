import { useState, useEffect } from 'react';

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  const [breakpoints, setBreakpoints] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isSmallMobile: false,
    isLargeDesktop: false
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({ width, height });

      setBreakpoints({
        isSmallMobile: width < 380,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLargeDesktop: width >= 1440
      });
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getResponsiveValue = (values) => {
    if (typeof values === 'object' && values !== null) {
      if (breakpoints.isSmallMobile && values.smallMobile) return values.smallMobile;
      if (breakpoints.isMobile && values.mobile) return values.mobile;
      if (breakpoints.isTablet && values.tablet) return values.tablet;
      if (breakpoints.isDesktop && values.desktop) return values.desktop;
      if (breakpoints.isLargeDesktop && values.largeDesktop) return values.largeDesktop;
      return values.desktop || values.default;
    }
    return values;
  };

  return {
    ...screenSize,
    ...breakpoints,
    getResponsiveValue
  };
};

export default useResponsive;
