// Reserve characters in silhouette mode are drawn as a plain dark "?" tile. No artwork is ever sent to the browser for them.
export default function Silhouette({ size = 120 }) {
  return (
    <div aria-label="Hidden character" style={{ width: size, height: size, borderRadius: 18, background: "radial-gradient(circle,#2b1646,#0d0818)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c5cb0", fontSize: size * 0.45, fontWeight: 800 }}>?</div>
  );
}
