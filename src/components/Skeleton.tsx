import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  count?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, rounded = false, count = 1, style, className = '' }) => {
  const items = Array.from({ length: count });
  return (
    <div className={`skeleton-wrapper ${className}`} style={style}>
      {items.map((_, i) => (
        <div
          key={i}
          className={`skeleton ${rounded ? 'skeleton-rounded' : ''}`}
          style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
        />
      ))}
    </div>
  );
};

export default Skeleton;
