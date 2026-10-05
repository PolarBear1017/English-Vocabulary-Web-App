import React from 'react';

const LogoIcon = ({ className = 'h-8 w-auto', isCollapsed = false, alt = 'Spaced' }) => {
  if (isCollapsed) {
    return (
      <img
        src="/brand/spaced-symbol-master.svg"
        alt={alt}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src="/brand/spaced-wordmark.svg"
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
};

export default LogoIcon;

