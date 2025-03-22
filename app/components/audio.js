"use client";
import { useAudioRecorder } from "@/app/hooks/userecord";
import RecordButton from "./recordbutton";
import { useEffect,useState } from "react";
import { sendAudioToWhisper } from "@/app/utils/audio";
export default function AudioRecording({ isLoading, updateQuestion }) {
    const { status,
        audioURL,
        audioBlob,
        startRecording,
        stopRecording,
        resetRecording } = useAudioRecorder();

    const [text, setText] = useState("");
    useEffect(() => {
        if (text != "") { updateQuestion(text); setText(""); }
    }, [text]);
    useEffect(() => {
        async function getData(){
        if (audioBlob) {
            const text=await sendAudioToWhisper(audioBlob);
            setText(text);
        }
    }
    getData();
    }, [audioBlob]);
//})
return (
    <div><RecordButton permissionRequested={true} recording={status} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} /></div>

)
}