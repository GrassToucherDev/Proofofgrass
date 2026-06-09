export default function OfflinePage() {
    return (
      <div style={{
        minHeight:"100vh", background:"#080a06",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        fontFamily:"'DM Sans',sans-serif", color:"#f0efea",
        textAlign:"center", padding:24,
      }}>
        <div style={{ fontSize:64, marginBottom:24 }}>🌿</div>
        <h1 style={{
          fontFamily:"'Georgia',serif", fontSize:28, fontWeight:700,
          color:"#f0efea", marginBottom:12,
        }}>You're Offline</h1>
        <p style={{ fontSize:14, color:"rgba(240,239,234,0.5)", lineHeight:1.7, maxWidth:280 }}>
          No connection right now. Your streak is safe — come back when you're online to log today's proof.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop:32, background:"#93a85a", color:"#080a06",
            border:"none", borderRadius:9, padding:"12px 28px",
            fontSize:14, fontWeight:700, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.04em",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }