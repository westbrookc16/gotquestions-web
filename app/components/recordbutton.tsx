"use client";
import { Button } from "@/components/ui/button"

import {useState} from "react";
import Content from "@/app/components/content";

const RecordButton = ({isLoading,recording,startRecording,stopRecording}:{isLoading:boolean,recording:boolean,startRecording:Function,stopRecording:Function}) => {

  return (<div>
    <Button disabled={isLoading} onClick={(e)=>{
if (recording)stopRecording(); else startRecording();

    }}>{recording ? "Stop" : "Start"}</Button>
    
    
  </div>);
};
export default RecordButton;