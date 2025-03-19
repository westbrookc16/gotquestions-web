import { useState, useEffect,useRef } from "react";

export default function TextToSpeech({ text }:{text:String}) {

  const [audioSrc, setAudioSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const audioRef=useRef(null);

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
  useEffect(()=>{
    if (audioRef.current)
    //@ts-ignore
      audioRef.current.load();

  },[audioRef,audioSrc]);
  useEffect(() => {

    generateSpeech();

  }, [text]);
  return (
    <div className="p-4">

      {audioSrc && (
        <audio controls className="mt-4" autoPlay ref={audioRef}>
          <source src={audioSrc} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
