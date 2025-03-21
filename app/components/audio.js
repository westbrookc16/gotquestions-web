"use client";
import { useRecordVoice } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
import { useEffect } from "react";
export default function AudioRecording({ isLoading, updateQuestion }) {

    const { startRecording, stopRecording, recording, text, setText} = useRecordVoice();
    useEffect(()=>{
    if (text != ""){ updateQuestion(text);setText("");}
    },[text]);
    return (
        <div><RecordButton recording={recording} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} /></div>

    )
}