import { useCallback, useState } from "react";

export default function UploadBox({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => onUpload(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      processFile(e.dataTransfer.files[0]);
    },
    []
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleChange = (e) => processFile(e.target.files[0]);

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative flex flex-col items-center justify-center
        w-full max-w-md h-56 cursor-pointer
        border-2 border-dashed rounded-sm transition-all duration-300
        ${dragging
          ? "border-[#4ade80] bg-[#0f2211]"
          : "border-[#1f3d22] bg-[#0f1a10] hover:border-[#2d5e30] hover:bg-[#111f12]"
        }
      `}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />

      {/* Icon */}
      <div className={`text-4xl mb-4 transition-transform duration-300 ${dragging ? "scale-110" : ""}`}>
        🌿
      </div>

      <p className="text-sm text-[#4ade80] tracking-wider">
        {fileName ? fileName : "Drop your grass photo here"}
      </p>
      <p className="text-xs text-[#3a5e3d] mt-1">
        or click to browse
      </p>

      {/* Corner accents */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#4ade80] opacity-60" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#4ade80] opacity-60" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#4ade80] opacity-60" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#4ade80] opacity-60" />
    </label>
  );
}