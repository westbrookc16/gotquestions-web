"use client";
import { useRecordVoice } from "../hooks/userecord";
import Content from "@/app/components/content";

const RecordButton = () => {
  const { startRecording, stopRecording, recording, text } = useRecordVoice();
  return (<div>
    <button onClick={recording ? stopRecording : startRecording}>{recording ? "Stop" : "Start"}</button>
    <br />{text}
    <Content text={text} />
  </div>);
};
export default RecordButton;