import React from 'react'

export default function Preloader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="preloader">
      {children && <div className="preloader__children">{children}</div>}
      <div className="preloader__spinner" />
    </div>
  );
}
