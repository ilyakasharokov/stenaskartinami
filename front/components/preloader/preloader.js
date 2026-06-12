export default function Preloader({ children }) {
  return (
    <div className="preloader">
      {children && <div className="preloader__children">{children}</div>}
      <div className="preloader__spinner" />
    </div>
  );
}
