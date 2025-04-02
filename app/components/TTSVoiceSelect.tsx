"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { audioManager } from "@/app/utils/audioManager";

const voices = [
  "Alloy",
  "Ash",
  "Ballad",
  "Coral",
  "Echo",
  "Fable",
  "Onyx",
  "Nova",
  "Sage",
  "Shimmer",
];
const LOCAL_STORAGE_KEY = "selectedVoice";

const getPreviewUrl = (voice: string) => {
  const match = voices.find((v) => v.toLowerCase() === voice);
  return match
    ? `https://cdn.openai.com/tts/voices/preview/${match.toLowerCase()}.mp3`
    : "";
};

export function TTSVoiceSelect({
  onChange,
  value,
}: {
  onChange: (voice: string) => void;
  value: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewVoice, setPreviewVoice] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (value: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, value);
    onChange(value);
    setIsExpanded(false);
  };

  const playPreview = async (voice: string) => {
    if (playing || isLoading) return;
    if (!voice) return;
    setIsLoading(true);
    setPlaying(voice);
    try {
      const res = await fetch(`/api/textToSpeech`, {
        method: "POST",
        body: JSON.stringify({
          text: "Hello, this is a preview of the voice.",
          voice: voice,
        }),
      });
      const audioBlob = await res.blob();
      const audioURL = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioURL);
      audioManager.play(audio);
      setIsLoading(false);
      audio.onended = () => {
        setPlaying(null);
      };
      audio.onerror = () => {
        setPlaying(null);
        setIsLoading(false);
      };
    } catch (error) {
      setPlaying(null);
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          Voice:{" "}
          <span className="font-medium text-foreground">
            {value
              ? voices.find((v) => v.toLowerCase() === value)
              : "Not selected"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
      <Select value={previewVoice} onValueChange={setPreviewVoice}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((v) => (
            <SelectItem
              key={v}
              value={v.toLowerCase()}
              className="flex items-center justify-between"
            >
              <span>{v}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          onClick={() => playPreview(previewVoice)}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Loading..." : "Play Preview"}
        </Button>
        <Button
          onClick={() => handleChange(previewVoice)}
          className="w-full sm:w-auto"
        >
          Select Voice
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
