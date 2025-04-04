"use client";
import { useAudioRecorder } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
import { useEffect, useState } from "react";
import { sendAudioToWhisper } from "@/app/utils/audio";
export default function AudioRecording({
  isLoading,
  updateQuestion,
  setIsLoading,
}) {
  const {
    status,
    audioURL,
    audioBlob,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();
  const [recordButtonClicked, setRecordButtonClicked] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => {
    if (text != "") {
      const cleanedText = text.replace(/^["']|["']$/g, "");
      updateQuestion(cleanedText);
      setText("");
      setRecordButtonClicked(false);
    }
  }, [text]);
  useEffect(() => {
    async function getData() {
      if (audioBlob) {
        const text = await sendAudioToWhisper(audioBlob);
        setText(text);
      }
    }
    getData();
  }, [audioBlob]);
  //})
  return (
    <div>
      <RecordButton
        permissionRequested={true}
        recording={status}
        isLoading={isLoading}
        startRecording={startRecording}
        stopRecording={() => {
          setIsLoading(true);
          setRecordButtonClicked(true);
          stopRecording();
        }}
        errorMessage={errorMessage}
        recordButtonClicked={recordButtonClicked}
      />
    </div>
  );
}
