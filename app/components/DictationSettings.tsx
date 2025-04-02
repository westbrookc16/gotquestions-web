"use client";

import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { TTSVoiceSelect } from "./TTSVoiceSelect";

interface DictationSettingsProps {
    enabled: boolean;
    voice: string;
    onEnabledChange: (enabled: boolean) => void;
    onVoiceChange?: (voice: string) => void;
}

export default function DictationSettings({
    enabled,
    voice,
    onEnabledChange,
    onVoiceChange
}: DictationSettingsProps) {
    const toggleDictation = () => {
        onEnabledChange(!enabled);
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDictation}
                    aria-label={enabled ? "Disable dictation" : "Enable dictation"}
                    className="relative"
                >
                    {enabled ? (
                        <Volume2 className="h-4 w-4" />
                    ) : (
                        <VolumeX className="h-4 w-4" />
                    )}
                </Button>
                <span className="text-sm text-muted-foreground">
                    {enabled ? "Dictation enabled" : "Dictation disabled"}
                </span>
            </div>

            {enabled && (
                <TTSVoiceSelect value={voice} onChange={(newVoice) => onVoiceChange?.(newVoice)} />
            )}
        </div>
    );
} 