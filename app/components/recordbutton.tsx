"use client";

import { track } from '@vercel/analytics';

import { Button } from '@/components/ui/button';

import { useState } from "react";
import Content from "@/app/components/content";

const RecordButton = ({ permissionRequested, isLoading, recording, startRecording, stopRecording, }: { permissionRequested: boolean, isLoading: boolean, recording: boolean, startRecording: Function, stopRecording: Function }) => {
  const label = (permissionRequested:boolean, recording:boolean) => {
    if (!permissionRequested) return "Grant Permission";
    else {

      return recording ? "Stop" : "Start";
    }
  }
    return (<div>
      <Button disabled={isLoading} onClick={(e) => {
        if (recording) stopRecording(); else { startRecording(); track("audio"); }


      }}>{label(permissionRequested, recording)}</Button>


    </div>);
  };
  export default RecordButton;