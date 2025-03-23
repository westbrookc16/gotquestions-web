"use client";

import { track } from '@vercel/analytics';

import { Button } from '@/components/ui/button';

import { useState } from "react";
import Content from "@/app/components/content";

const RecordButton = ({ permissionRequested, isLoading, recording, startRecording, stopRecording, }: { permissionRequested: boolean, isLoading: boolean, recording: string, startRecording: Function, stopRecording: Function }) => {
  const label = (permissionRequested: boolean, recording: string) => {
    if (!permissionRequested) return "Grant Permission";
    else {

      return (recording === "stopped" || recording === "idle") ? "Start" : "Stop";
    }
  }
  return (<div>
    <Button disabled={isLoading} onClick={(e) => {
      if (recording === "recording") stopRecording(); else { startRecording(); track("audio"); }


    }}><span aria-live="polite">{label(permissionRequested, recording)}</span></Button>


  </div>);
};
export default RecordButton;