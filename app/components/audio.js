"use client";
import { useRecordVoice } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
import { useEffect } from "react";
export default function AudioRecording({ isLoading, updateQuestion }) {

    const { permissionRequested, startRecording, stopRecording, recording, text, setText } = useRecordVoice();
    useEffect(() => {
        if (text != "") { updateQuestion(text); setText(""); }
    }, [text]);
    return (
        <div><RecordButton permissionRequested={permissionRequested} recording={recording} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} /></div>

    )
}