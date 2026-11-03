import { getProductImageSrc } from "../utils/productImageCache";

function ProductPlaceholderIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path
        d="M8 24L22 34L34 26L56 42V52H8V24Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.25"
      />
      <path
        d="M20 12L32 20L44 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

export default function ProductImage({ product, size = "card", className = "", alt }) {
  const src = getProductImageSrc(product);
  const label = alt || product?.name || "Producto";

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`product-image product-image-${size} ${className}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className={`product-image product-image-${size} product-image-placeholder ${className}`} aria-hidden>
      <ProductPlaceholderIcon className="product-image-placeholder-icon" />
    </div>
  );
}
