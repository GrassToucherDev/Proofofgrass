// components/CommunityMap.js
// Mapbox GL community map: clustered, approximate proof locations.
// Uses the project's existing NEXT_PUBLIC_MAPBOX_TOKEN and the same
// outdoors-v12 style as WAGO Drops. Client-only (imported with ssr:false).
import { useEffect, useRef, useState, useCallback } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { V2 } from "../utils/v2Theme";

const STYLE = "mapbox://styles/mapbox/outdoors-v12";
const WORLD = { center: [10, 22], zoom: 1.3 };

export default function CommunityMap({ points, loading, onSelect, fullscreen, onToggleFullscreen, resetKey }) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const pointsRef = useRef(points);
  const userMovedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const [error, setError] = useState(null);
  onSelectRef.current = onSelect;
  pointsRef.current = points;

  const toGeoJSON = useCallback((pts) => ({
    type: "FeatureCollection",
    features: (pts || []).map((p, i) => ({
      type: "Feature",
      id: i,
      properties: { count: p.count, ids: p.ids.join(","), label: p.label },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    })),
  }), []);

  const fit = useCallback((animate) => {
    const map = mapRef.current;
    if (!map) return;
    const pts = pointsRef.current || [];
    if (!pts.length) { map.easeTo({ ...WORLD, duration: animate ? 600 : 0 }); return; }
    if (pts.length === 1) { map.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 6, duration: animate ? 600 : 0 }); return; }
    const b = pts.reduce((acc, p) => acc.extend([p.lng, p.lat]), new (map.__LngLatBounds)([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]));
    map.fitBounds(b, { padding: 56, maxZoom: 8, duration: animate ? 600 : 0 });
  }, []);

  // ── init once ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) { setError({ kind: "token", msg: "The map needs a Mapbox access token. Set NEXT_PUBLIC_MAPBOX_TOKEN in the Vercel project (the same public token WAGO Drops uses) and redeploy." }); return; }
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !wrapRef.current) return;
      if (!mapboxgl.supported()) { setError({ kind: "webgl", msg: "This browser can't display the interactive map (WebGL is unavailable)." }); return; }
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: wrapRef.current, style: STYLE, ...WORLD, minZoom: 1, maxZoom: 14,
        attributionControl: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: false,
      });
      map.__LngLatBounds = mapboxgl.LngLatBounds;
      map.touchZoomRotate.disableRotation();
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") window.__pogMap = map;

      map.on("error", (e) => {
        const status = e?.error?.status;
        if (status === 401 || status === 403) setError({ kind: "auth", msg: `Mapbox rejected the access token (HTTP ${status}). Check that NEXT_PUBLIC_MAPBOX_TOKEN is a valid public token and allows this site's URL.` });
        else if (!readyRef.current) setError({ kind: "load", msg: "The map style couldn't be loaded. Check your connection and try again." });
      });

      map.on("load", () => {
        readyRef.current = true;
        map.addSource("proofs", {
          type: "geojson", data: toGeoJSON(pointsRef.current),
          cluster: true, clusterRadius: 48, clusterMaxZoom: 10,
          clusterProperties: { total: [["+", ["accumulated"], ["get", "total"]], ["get", "count"]] },
        });
        map.addLayer({ id: "clusters", type: "circle", source: "proofs", filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "total"], "#7dc832", 10, "#5ba622", 50, "#3d7a12"],
            "circle-radius": ["step", ["get", "total"], 17, 10, 22, 50, 28],
            "circle-stroke-width": 3, "circle-stroke-color": "#ffffff",
          } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "proofs", filter: ["has", "point_count"],
          layout: { "text-field": ["to-string", ["get", "total"]], "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-size": 13, "text-allow-overlap": true },
          paint: { "text-color": "#ffffff" } });
        map.addLayer({ id: "points", type: "circle", source: "proofs", filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#7dc832",
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 9, 10, 14, 50, 18],
            "circle-stroke-width": 3, "circle-stroke-color": "#ffffff",
          } });
        map.addLayer({ id: "point-count", type: "symbol", source: "proofs", filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
          layout: { "text-field": ["to-string", ["get", "count"]], "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"], "text-size": 12, "text-allow-overlap": true },
          paint: { "text-color": "#0d2a05" } });

        map.on("click", "clusters", (e) => {
          const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          if (!f) return;
          map.getSource("proofs").getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
            if (err) return;
            map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(zoom + 0.5, 14), duration: 500 });
          });
        });
        map.on("click", "points", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties;
          onSelectRef.current?.({ ids: String(p.ids).split(","), count: Number(p.count), label: p.label });
        });
        for (const l of ["clusters", "points"]) {
          map.on("mouseenter", l, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", l, () => { map.getCanvas().style.cursor = ""; });
        }
        map.on("dragstart", () => { userMovedRef.current = true; });
        map.on("zoomstart", (e) => { if (e.originalEvent) userMovedRef.current = true; });
        fit(false);
      });
    }).catch(() => setError({ kind: "load", msg: "The map library failed to load. Refresh to try again." }));

    return () => { cancelled = true; try { mapRef.current?.remove(); } catch {} mapRef.current = null; readyRef.current = false; };
  }, [toGeoJSON, fit]);

  // ── data updates ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource("proofs")?.setData(toGeoJSON(points));
  }, [points, toGeoJSON]);

  // Re-fit when the filter changes, unless the person has moved the map themselves.
  useEffect(() => {
    if (!readyRef.current || loading) return;
    if (!userMovedRef.current) fit(true);
  }, [resetKey, loading, points, fit]);

  // Resize on fullscreen toggle.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const empty = !loading && !error && (!points || points.length === 0);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#dcecf6" }}>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} role="application" aria-label="Map of community proofs. Use the recent proofs list for a keyboard-friendly alternative." />

      <button type="button" onClick={onToggleFullscreen}
        aria-pressed={!!fullscreen} aria-label={fullscreen ? "Exit full screen map" : "Expand map to full screen"}
        title={fullscreen ? "Exit full screen" : "Full screen"}
        style={{ position: "absolute", top: 10, left: 10, zIndex: 3, width: 36, height: 36, borderRadius: 10,
          border: `1px solid ${V2.borderSoft}`, background: "#fff", color: V2.forestGreen, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(26,74,10,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {fullscreen
            ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
        </svg>
      </button>

      {loading && !error && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: V2.forestGreen, boxShadow: "0 2px 12px rgba(26,74,10,0.12)" }}>Loading map…</div>
        </div>
      )}

      {empty && (
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 34, zIndex: 2, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: "12px 18px", maxWidth: 360, textAlign: "center", boxShadow: "0 4px 16px rgba(26,74,10,0.15)" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: V2.forestGreen }}>No mapped proofs for this period yet</div>
            <div style={{ fontSize: 12, color: V2.dimGray, marginTop: 3, fontWeight: 600 }}>Proofs appear here when someone shares a location with their daily proof.</div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ position: "absolute", inset: 0, zIndex: 4, background: "linear-gradient(180deg,#e8f4fd,#f0f8ee)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>🗺️</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: V2.forestGreen, marginBottom: 6 }}>The map couldn't load</div>
            <div style={{ fontSize: 13, color: V2.forestLight, lineHeight: 1.5, fontWeight: 600 }}>{error.msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
