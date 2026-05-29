import { useRef, useState } from "react";

export default function UploadBox({ onUpload }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    if (file instanceof Blob && file.type.startsWith("image/")) {
      onUpload(file);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files[0]);
      }}
      style={{
        border: `1.5px dashed ${dragging ? "#93a85a" : "rgba(147,168,90,0.25)"}`,
        borderRadius: 12,
        padding: "36px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(147,168,90,0.06)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
        userSelect: "none",
      }}
    >
      {/* Upload icon */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px",
        border: "1.5px solid rgba(147,168,90,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(147,168,90,0.6)", fontSize: 20,
        background: "rgba(147,168,90,0.06)",
      }}>
        ↑
      </div>

      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "rgba(240,239,234,0.45)",
        marginBottom: 6,
      }}>
        {dragging ? "Drop to upload" : "Drag & drop image"}
      </div>

      <div style={{ fontSize: 11, color: "rgba(240,239,234,0.22)" }}>
        or click to browse
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