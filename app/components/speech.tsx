import { useState, useEffect, useRef } from "react";

export default function TextToSpeech({ text, setLoading }: { text: String, setLoading: Function }) {
  const [audioSrc, setAudioSrc] = useState("");
  const audioRef = useRef(null);

  const generateSpeech = async () => {
    if (!text) return;
    //alert(text);
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy",
      }),
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
    if (audioRef.current)
      // @ts-ignore
      audioRef.current.load();
  }, [audioSrc]); // Only depend on audioSrc

  useEffect(() => {
    generateSpeech();
  }, [text]); // Only call generateSpeech when text changes

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
