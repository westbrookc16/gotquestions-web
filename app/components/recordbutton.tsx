"use client";

import { track } from "@vercel/analytics";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Mic, Square } from "lucide-react";

const RecordButton = ({
  permissionRequested,
  isLoading,
  recording,
  startRecording,
  stopRecording,
  errorMessage,
  recordButtonClicked,
}: {
  permissionRequested: boolean;
  recordButtonClicked: boolean;
  isLoading: boolean;
  recording: string;
  startRecording: Function;
  stopRecording: Function;
  errorMessage: string | null;
}) => {
  //const [recordButtonClicked, setRecordButtonClicked] = useState(false);
  const label = (
    permissionRequested: boolean,
    recording: string,
    isLoading: boolean,
    recordButtonClicked: boolean
  ) => {
    if (isLoading && recordButtonClicked) return "Recognising audio...";
    if (!permissionRequested) return "Grant Permission";
    if (recording === "error") return "Start Recording";
    return recording === "stopped" || recording === "idle"
      ? "Start Recording"
      : "Stop Recording";
  };

  return (
    <div className="flex flex-col items-center gap-2 relative">
      <Button
        onClick={(e) => {
          if (isLoading) return;
          if (recording === "recording") {
            stopRecording();
            track("audio");
          } else {
            startRecording();
            //setRecordButtonClicked(true);
          }
        }}
        variant={recording === "recording" ? "destructive" : "default"}
        size="lg"
        className="w-48"
        disabled={isLoading}
      >
        {recording === "recording" ? (
          <Square className="h-4 w-4 mr-2" />
        ) : (
          <Mic className="h-4 w-4 mr-2" />
        )}
        <span aria-live="polite">
          {label(
            permissionRequested,
            recording,
            isLoading,
            recordButtonClicked
          )}
        </span>
      </Button>
      <div className="text-sm text-muted-foreground h-5">
        {recording === "recording" && "Recording in progress..."}
        {errorMessage && (
          <span className="text-destructive">{errorMessage}</span>
        )}
      </div>
    </div>
  );
};

export default RecordButton;
