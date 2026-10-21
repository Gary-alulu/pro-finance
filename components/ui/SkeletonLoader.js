// components/ui/SkeletonLoader.js
// Animated skeleton placeholder for loading states.
// Pass className to control size and shape.

export default function SkeletonLoader({ className = "", style = {} }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        background: "var(--color-surface-3)",
        borderRadius: "var(--radius-sm)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
