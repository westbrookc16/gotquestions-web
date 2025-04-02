"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2, HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { TTSVoiceSelect } from "./TTSVoiceSelect";
import { audioManager } from "@/app/utils/audioManager";

const LOCAL_STORAGE_KEY = "dictationPreferences";

interface DictationPreferences {
    enabled: boolean;
    rememberPreference: boolean;
}

interface AudioControlsProps {
    text: string;
    voice: string;
    enabled: boolean;
    setLoading: (loading: boolean) => void;
    onEnabledChange?: (enabled: boolean) => void;
    onVoiceChange?: (voice: string) => void;
    audioSrc?: string;
    isGenerating: boolean;
}

export default function AudioControls({
    text,
    voice,
    enabled,
    onEnabledChange,
    audioSrc,
    isGenerating
}: AudioControlsProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Handle audio progress
    useEffect(() => {
        if (audioRef.current) {
            const audio = audioRef.current;
            const updateProgress = () => {
                const progress = (audio.currentTime / audio.duration) * 100;
                setProgress(progress);
            };

            audio.addEventListener("timeupdate", updateProgress);
            return () => audio.removeEventListener("timeupdate", updateProgress);
        }
    }, [audioSrc]);

    const toggleDictation = () => {
        onEnabledChange?.(!enabled);
    };

    const handlePlay = () => {
        if (audioRef.current) {
            audioManager.play(audioRef.current);
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    return (
        <div className="space-y-4">
            {isGenerating ? (
                <div className="text-sm p-b-2 text-muted-foreground">
                    Generating audio<span className="animate-ellipsis"></span>
                </div>
            ) : audioSrc && (
                <div className="space-y-2">
                    <audio
                        ref={audioRef}
                        controls
                        className="w-full"
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onEnded={handleEnded}
                        autoPlay
                    >
                        <source src={audioSrc} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
} 