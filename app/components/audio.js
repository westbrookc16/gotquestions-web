"use client";
import { useRecordVoice } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
export default function AudioRecording({ isLoading, setTexts }) {

    const { startRecording, stopRecording, recording, text, recordButtonClicked } = useRecordVoice();
    if (text != "") setTexts(text);
    return (
        <div><RecordButton recording={recording} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} /></div>

    )
}