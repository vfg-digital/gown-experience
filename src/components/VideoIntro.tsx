"use client";

import React, { useRef, useEffect, useState } from "react";

interface VideoIntroProps {
  onVideoEnd: () => void;
}

export default function VideoIntro({ onVideoEnd }: VideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => onVideoEnd();
    const handleError = () => {
      setError(true);
      // If video fails to load, skip after 1s
      setTimeout(onVideoEnd, 1000);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [onVideoEnd]);

  if (error) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
        <p className="text-white/50 font-sans text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        webkit-playsinline="true"
        className="w-full h-full object-cover"
      >
        <source src="/video/intro.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
