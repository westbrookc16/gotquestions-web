import { useState, useEffect } from "react";

export default function TextToSpeech({ text }:{text:String}) {

  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSpeech = async () => {
    if (!text) return;
//alert(text);
    setLoading(true);
    try {
      const response = await fetch("/api/textToSpeech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to generate audio");

      const audioBlob = await response.blob();
      const audioURL = URL.createObjectURL(audioBlob);
      setAudioSrc(audioURL);
      console.log("done");
    } catch (error) {
      console.error("Error generating speech:", error);
    }
    setLoading(false);
  };
  useEffect(() => {

    generateSpeech();

  }, [text]);
  return (
    <div className="p-4">

      {audioSrc && (
        <audio controls className="mt-4" autoPlay>
          <source src={audioSrc} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
