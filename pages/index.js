import { useState, useRef } from "react";
import UploadBox from "../components/UploadBox";
import ResultCard from "../components/ResultCard";

export default function Home() {
  const [imageSrc, setImageSrc] = useState(null);
  const resultRef = useRef(null);

  const handleImageUpload = (src) => {
    setImageSrc(src);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <main className="min-h-screen bg-[#0d1a0f] text-white flex flex-col items-center px-4 py-16 font-mono">
      {/* Header */}
      <div className="text-center mb-14">
        <span className="text-xs tracking-[0.4em] text-[#4ade80] uppercase mb-3 block">
          Official Certification System
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">
          Proof of Grass
        </h1>
        <p className="mt-4 text-[#6b8f6e] text-sm max-w-sm mx-auto">
          Upload your evidence. Receive your certificate. Touch more grass.
        </p>
        <div className="mt-5 h-px w-24 bg-[#4ade80] mx-auto opacity-40" />
      </div>

      {/* Upload */}
      <UploadBox onUpload={handleImageUpload} />

      {/* Result */}
      {imageSrc && (
        <div ref={resultRef} className="mt-16 w-full max-w-4xl">
          <p className="text-center text-xs tracking-widest text-[#4ade80] uppercase mb-6">
            ✦ Certificate Generated ✦
          </p>
          <ResultCard imageSrc={imageSrc} />
        </div>
      )}

      <footer className="mt-24 text-[#334d35] text-xs text-center">
        © {new Date().getFullYear()} Proof of Grass · All rights reserved
      </footer>
    </main>
  );
}