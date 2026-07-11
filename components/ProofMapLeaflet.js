import { useEffect, useRef } from "react";

// Leaflet + CartoDB dark tiles. No API key required.
// Each unique (lat, lng) pair gets its own marker.
// Viewport auto-fits to all markers on load.
// Countries are tinted green via GeoJSON overlay.

export default function ProofMapLeaflet({ regions, onRegionClick, countryCodes }) {
  const mapRef       = useRef(null);
  const containerRef = useRef(null);
  const markersRef   = useRef([]);
  const geojsonRef   = useRef(null);
  const initRef      = useRef(false);

  useEffect(() => {
    if (!regions?.length) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      // ── Init map once ──────────────────────────────────────────────────
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 14,
          zoomControl: true,
          attributionControl: false,
          preferCanvas: true,
        });

        // Dark tile layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(mapRef.current);

        // Label layer on top so labels stay visible
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 19,
          zIndex: 10,
        }).addTo(mapRef.current);
      }

      // ── Clear old markers ──────────────────────────────────────────────
      markersRef.current.forEach(m => { try { mapRef.current.removeLayer(m); } catch {} });
      markersRef.current = [];

      // ── Pulse animation CSS (inject once) ─────────────────────────────
      if (!document.getElementById("pog-map-css")) {
        const style = document.createElement("style");
        style.id = "pog-map-css";
        style.textContent = `
          @keyframes pogPulse {
            0%   { transform: scale(1);   opacity: 1; }
            50%  { transform: scale(1.18); opacity: 0.85; }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes pogRing {
            0%   { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .pog-marker-inner {
            animation: pogPulse 2.8s ease-in-out infinite;
          }
          .pog-marker-ring {
            animation: pogRing 2.8s ease-out infinite;
          }
        `;
        document.head.appendChild(style);
      }

      // ── Add markers ────────────────────────────────────────────────────
      const validRegions = (regions ?? []).filter(r => r.lat != null && r.lng != null);
      const bounds = [];

      validRegions.forEach(region => {
        const count = region.count ?? 1;

        // Size: 28px for 1 proof, up to 56px for 100+ proofs
        const size = Math.min(56, 28 + Math.sqrt(count) * 3.2);
        const fs   = Math.max(10, Math.round(size * 0.34));

        // Color: gold for high-activity (50+), emerald otherwise
        const isHot  = count >= 50;
        const core   = isHot ? "rgba(212,175,55,0.95)"  : "rgba(147,168,90,0.95)";
        const glow1  = isHot ? "rgba(212,175,55,0.6)"   : "rgba(147,168,90,0.5)";
        const glow2  = isHot ? "rgba(212,175,55,0.2)"   : "rgba(147,168,90,0.18)";
        const ring   = isHot ? "rgba(212,175,55,0.35)"  : "rgba(147,168,90,0.3)";
        const border = isHot ? "rgba(240,200,80,0.9)"   : "rgba(200,168,75,0.7)";
        const delay  = `${(Math.random() * 2).toFixed(2)}s`;

        const html = `
          <div style="position:relative;width:${size}px;height:${size}px;">
            <!-- Pulsing ring -->
            <div class="pog-marker-ring" style="
              position:absolute;
              inset:-${size*0.25}px;
              border-radius:50%;
              border:2px solid ${ring};
              animation-delay:${delay};
              pointer-events:none;
            "></div>
            <!-- Main dot -->
            <div class="pog-marker-inner" style="
              position:absolute;inset:0;
              border-radius:50%;
              background:radial-gradient(circle at 35% 35%, ${core}, ${glow1});
              border:2px solid ${border};
              box-shadow:0 0 ${size*0.6}px ${glow1}, 0 0 ${size*1.2}px ${glow2};
              display:flex;align-items:center;justify-content:center;
              color:#060a04;font-weight:900;font-family:'DM Sans',sans-serif;
              font-size:${fs}px;cursor:pointer;
              animation-delay:${delay};
              user-select:none;
            ">${count >= 1000 ? `${(count/1000).toFixed(1)}k` : count}</div>
          </div>
        `;

        const icon = L.divIcon({
          className: "",
          html,
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor:[0, -size / 2 - 4],
        });

        const marker = L.marker([region.lat, region.lng], { icon })
          .addTo(mapRef.current);

        marker.on("click", () => onRegionClick?.(region));

        // Tooltip on hover
        const recentUsers = (region.usernames ?? []).slice(0, 3).map(u => `@${u}`).join(", ");
        marker.bindTooltip(`
          <div style="
            background:#0e100b;border:1px solid rgba(147,168,90,0.35);
            border-radius:10px;padding:10px 14px;
            font-family:'DM Sans',sans-serif;min-width:160px;
            box-shadow:0 4px 20px rgba(0,0,0,0.6);
          ">
            <div style="font-weight:700;color:#f0efea;font-size:13px;margin-bottom:6px;">
              ${region.label || "Nearby Region"}
            </div>
            ${region.country ? `<div style="font-size:10px;color:rgba(240,239,234,0.45);margin-bottom:6px;">${[region.region, region.country].filter(Boolean).join(", ")}</div>` : ""}
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <div>
                <div style="font-size:11px;color:rgba(240,239,234,0.45);">Proofs</div>
                <div style="font-size:15px;font-weight:700;color:#c8a84b;">${count}</div>
              </div>
              <div>
                <div style="font-size:11px;color:rgba(240,239,234,0.45);">Touchers</div>
                <div style="font-size:15px;font-weight:700;color:#93a85a;">${(region.usernames ?? []).length}</div>
              </div>
            </div>
            ${recentUsers ? `<div style="font-size:9px;color:rgba(240,239,234,0.3);margin-top:6px;">${recentUsers}</div>` : ""}
          </div>
        `, {
          permanent: false,
          direction: "top",
          offset: [0, -size / 2 - 6],
          opacity: 1,
          className: "pog-tooltip",
        });

        bounds.push([region.lat, region.lng]);
        markersRef.current.push(marker);
      });

      // ── Auto-fit viewport to all markers ──────────────────────────────
      if (bounds.length === 1) {
        mapRef.current.setView(bounds[0], 6, { animate: true });
      } else if (bounds.length > 1) {
        mapRef.current.fitBounds(bounds, {
          padding: [48, 48],
          maxZoom: 8,
          animate: true,
          duration: 0.8,
        });
      }

      // ── Green country tint overlay ─────────────────────────────────────
      // Only load GeoJSON if we have country names to tint
      if (geojsonRef.current) {
        try { mapRef.current.removeLayer(geojsonRef.current); } catch {}
        geojsonRef.current = null;
      }

      if (countryCodes?.size > 0) {
        try {
          const res = await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
          if (!res.ok) throw new Error("GeoJSON fetch failed");
          const geojson = await res.json();
          if (cancelled) return;

          geojsonRef.current = L.geoJSON(geojson, {
            style: feature => {
              const name = feature.properties?.ADMIN || feature.properties?.name || "";
              const hit  = countryCodes.has(name);
              return {
                fillColor:   hit ? "#4a7a28" : "transparent",
                fillOpacity: hit ? 0.18 : 0,
                color:       hit ? "rgba(147,168,90,0.4)" : "transparent",
                weight:      hit ? 0.8 : 0,
              };
            },
            interactive: false,
          }).addTo(mapRef.current);

          // Put tint below markers
          if (geojsonRef.current.getPane) {
            geojsonRef.current.setZIndex?.(1);
          }
        } catch (e) {
          // GeoJSON load failure is non-fatal — map still works without tint
          console.warn("[map] country tint failed:", e.message);
        }
      }

      // Tooltip CSS (dark styled)
      if (!document.getElementById("pog-tooltip-css")) {
        const s = document.createElement("style");
        s.id = "pog-tooltip-css";
        s.textContent = `
          .pog-tooltip { background:transparent!important; border:none!important; box-shadow:none!important; padding:0!important; }
          .pog-tooltip::before { display:none!important; }
          .leaflet-tooltip-top.pog-tooltip::before { display:none!important; }
        `;
        document.head.appendChild(s);
      }

    })();

    return () => { cancelled = true; };
  }, [regions, onRegionClick, countryCodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef}
      style={{ height: "clamp(420px,55vh,620px)", width:"100%", background:"#0a0c08" }} />
  );
}