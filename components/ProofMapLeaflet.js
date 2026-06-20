import { useEffect, useRef } from "react";

// Leaflet + OpenStreetMap, dark tiles via CartoDB (free, no API key required).
// Pins are clustered by rounded region — never plot exact individual coordinates.
export default function ProofMapLeaflet({ regions, onRegionClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let L;
    let cancelled = false;

    (async () => {
      // Dynamic import — Leaflet requires `window`
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 10,
          zoomControl: true,
          attributionControl: false,
        });

        // CartoDB dark-matter tiles — free, no key required
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '© OpenStreetMap, © CARTO',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // Clear old markers
      markersRef.current.forEach(m => mapRef.current.removeLayer(m));
      markersRef.current = [];

      // Add cluster pins — emerald with gold glow, sized by count
      (regions ?? []).forEach(region => {
        if (region.lat == null || region.lng == null) return;

        const size = Math.min(54, 22 + Math.sqrt(region.count) * 6);
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width:${size}px; height:${size}px;
              border-radius:50%;
              background: radial-gradient(circle, rgba(147,168,90,0.9), rgba(147,168,90,0.5));
              border: 2px solid rgba(200,168,75,0.8);
              box-shadow: 0 0 ${size*0.5}px rgba(200,168,75,0.5), 0 0 ${size}px rgba(147,168,90,0.3);
              display:flex; align-items:center; justify-content:center;
              color:#0a0c08; font-weight:800; font-family:sans-serif;
              font-size:${Math.max(10, size*0.32)}px;
              cursor:pointer;
            ">${region.count}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size/2, size/2],
        });

        const marker = L.marker([region.lat, region.lng], { icon }).addTo(mapRef.current);
        marker.on("click", () => onRegionClick?.(region));
        markersRef.current.push(marker);
      });
    })();

    return () => { cancelled = true; };
  }, [regions, onRegionClick]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height:480, width:"100%", background:"#0a0c08" }} />
  );
}