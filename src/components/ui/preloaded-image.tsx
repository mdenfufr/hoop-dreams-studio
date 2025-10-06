import React, { useState, useEffect } from 'react';

interface PreloadedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export const PreloadedImage: React.FC<PreloadedImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  width,
  height 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    // Preload the image
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      // If image fails to load, still show it (browser will handle the error)
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  if (!isLoaded || !imageSrc) {
    // Return transparent placeholder while loading
    return (
      <div 
        className={className} 
        style={{ 
          width: width || 'auto', 
          height: height || 'auto',
          backgroundColor: 'transparent'
        }} 
      />
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      width={width}
      height={height}
    />
  );
};