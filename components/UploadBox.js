import { useRef, useState, useEffect } from "react";

export default function UploadBox({ onUpload }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    try { setTouch(window.matchMedia("(pointer: coarse)").matches); } catch {}
  }, []);

  const handle = (file) => {
    if (file instanceof Blob && file.type.startsWith("image/")) {
      onUpload(file);
    }
  };

  return (
    <div
      role="button" tabIndex={0}
      aria-label="Add your outdoor photo"
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files[0]);
      }}
      style={{
        border: `1.5px dashed ${dragging ? "#5ba622" : "rgba(91,166,34,0.45)"}`,
        borderRadius: 12,
        padding: "32px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(125,200,50,0.14)" : "rgba(125,200,50,0.06)",
        transition: "all 0.2s",
        userSelect: "none",
      }}
    >
      <img src="/mascot/wago-camera.webp" alt="" width={104} height={104}
        style={{ width: 104, height: 104, objectFit: "contain", display: "block", margin: "0 auto 8px" }} />

      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4a0a", marginBottom: 4 }}>
        {dragging ? "Drop to add your photo" : touch ? "Tap to add your photo" : "Click to add your photo"}
      </div>

      <div style={{ fontSize: 12.5, color: "#4a6b3a", fontWeight: 600, lineHeight: 1.4 }}>
        {touch ? "Take one now or choose from your camera roll" : "or drag and drop it here"}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => handle(e.target.files?.[0])}
      />
    </div>
  );
}
