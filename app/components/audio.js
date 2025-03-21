"use client";
import { useRecordVoice } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
export default function AudioRecording({ isLoading, updateQuestion }) {

    const { startRecording, stopRecording, recording, text, setText} = useRecordVoice();
    if (text != ""){ updateQuestion(text);setText("");}
    return (
        <div><RecordButton recording={recording} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} /></div>

    )
}