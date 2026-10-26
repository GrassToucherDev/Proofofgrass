// components/wago-drops/trails/TrailMap.js — Mapbox route view for a Trail.
// Numbered markers: done = green check, current/available = highlighted + pulsing, upcoming = muted.
// Marker wrapper elements are never given a transform (Mapbox positions them with one);
// scaling/animation happens on an inner element.
import { useEffect, useRef } from "react";

const COL = { done: "#5ba622", current: "#f5b800", available: "#f5b800", upcoming: "#9fb39a" };

function markerEl(stop, selected) {
  const wrap = document.createElement("div");
  wrap.style.cursor = "pointer";
  const inner = document.createElement("div");
  const hot = stop.state === "current" || stop.state === "available";
  const c = stop.unavailable && stop.state !== "done" ? "#c9c9c9" : COL[stop.state] || COL.upcoming;
  inner.style.cssText = `width:${hot ? 38 : 32}px;height:${hot ? 38 : 32}px;border-radius:50%;background:${c};color:#fff;
    border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
    font:800 ${hot ? 16 : 14}px 'Nunito',sans-serif;opacity:${stop.state === "upcoming" ? 0.8 : 1};
    ${hot ? "animation:wagoTrailPulse 1.6s ease-out infinite;" : ""}${selected ? "outline:3px solid #0d2a05;" : ""}`;
  inner.textContent = stop.state === "done" ? "✓" : String(stop.position);
  wrap.appendChild(inner);
  return wrap;
}

export default function TrailMap({ stops, selectedId, onSelect, onUserPos, height = 380 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mbRef = useRef(null);
  const markersRef = useRef([]);
  const fitted = useRef(false);
  const cbRef = useRef({});
  cbRef.current = { onSelect, onUserPos };

  const pts = (stops || []).filter(s => s.lat != null && s.lng != null);

  // init once
  useEffect(() => {
    let cancelled = false, map;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      mbRef.current = mapboxgl;
      map = new mapboxgl.Map({ container: containerRef.current, style: "mapbox://styles/mapbox/outdoors-v12", center: [-98.5795, 39.8283], zoom: 3 });
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      const geo = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }, trackUserLocation: true, showUserHeading: false });
      geo.on("geolocate", e => cbRef.current.onUserPos?.({ lat: e.coords.latitude, lng: e.coords.longitude }));
      map.addControl(geo, "top-right");
      map.on("load", () => {
        map.addSource("trail-line", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("trail-done", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "trail-line", type: "line", source: "trail-line", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#6b8f5a", "line-width": 4, "line-opacity": 0.65, "line-dasharray": [1.5, 1.5] } });
        map.addLayer({ id: "trail-done", type: "line", source: "trail-done", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#5ba622", "line-width": 6 } });
        mapRef.current = map;
        map.fire("wago-ready");
        setTimeout(() => { try { geo.trigger(); } catch {} }, 300);
      });
    });
    return () => { cancelled = true; map?.remove(); mapRef.current = null; };
  }, []);

  // draw route + markers whenever stops change
  useEffect(() => {
    const draw = () => {
      const map = mapRef.current, mb = mbRef.current;
      if (!map || !mb) return;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = pts.map(s => {
        const el = markerEl(s, s.id === selectedId);
        el.addEventListener("click", ev => { ev.stopPropagation(); cbRef.current.onSelect?.(s); });
        return new mb.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
      });
      const coords = pts.map(s => [s.lng, s.lat]);
      map.getSource("trail-line")?.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords } });
      const doneSegs = [];
      for (let i = 1; i < pts.length; i++) if (pts[i - 1].state === "done" && pts[i].state === "done") doneSegs.push([coords[i - 1], coords[i]]);
      map.getSource("trail-done")?.setData({ type: "Feature", geometry: { type: "MultiLineString", coordinates: doneSegs } });
      if (!fitted.current && coords.length) {
        fitted.current = true;
        const b = new mb.LngLatBounds(coords[0], coords[0]);
        coords.forEach(c => b.extend(c));
        map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 0 });
      }
    };
    if (mapRef.current) draw();
    else {
      const t = setInterval(() => { if (mapRef.current) { clearInterval(t); draw(); } }, 150);
      return () => clearInterval(t);
    }
  }, [stops, selectedId]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`@keyframes wagoTrailPulse{0%{box-shadow:0 0 0 0 rgba(245,184,0,.65),0 2px 8px rgba(0,0,0,.35)}70%{box-shadow:0 0 0 16px rgba(245,184,0,0),0 2px 8px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 0 rgba(245,184,0,0),0 2px 8px rgba(0,0,0,.35)}}`}</style>
      <div ref={containerRef} style={{ width: "100%", height, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(13,42,5,0.12)" }} />
    </>
  );
}
