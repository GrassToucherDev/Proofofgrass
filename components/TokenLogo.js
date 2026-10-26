// The $TOUCHGRASS token mark, sized to sit inline next to an amount or label.
export default function TokenLogo({ size = 16, style }) {
  return (
    <img src="/touchgrass-transparent.png" alt="" aria-hidden width={size} height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "-0.22em", marginRight: Math.round(size * 0.28), flexShrink: 0, ...style }} />
  );
}
