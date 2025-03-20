"use client";
import { Button } from "@/components/ui/button"
import { useRecordVoice } from "../hooks/userecord";
import {useState} from "react";
import Content from "@/app/components/content";

const RecordButton = () => {
  const { startRecording, stopRecording, recording, text } = useRecordVoice();
  const [isLoading,setIsLoading]=useState(false);
  return (<div>
    <Button disabled={isLoading} onClick={recording ? stopRecording : startRecording}>{recording ? "Stop" : "Start"}</Button>
    <br />{text}
    <Content text={text} setLoading={setIsLoading} />
  </div>);
};
export default RecordButton;