"use client";
import { useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "paused" | "stopped" | "error";

export const useAudioRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        //@ts-ignore
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const requestMicrophone = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error("Microphone permission denied or error:", err);
      setStatus("error");
      return null;
    }
  };

  const startRecording = async () => {
    if (status === "recording") return;

    const stream = await requestMicrophone();
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder });
      const url = URL.createObjectURL(audioBlob);
      setAudioBlob(audioBlob);
      setAudioURL(url);
      setStatus("stopped");
    };

    recorder.onerror = (err) => {
      console.error("Recording error:", err);
      setStatus("error");
    };

    recorder.start();
    setStatus("recording");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    setStatus("idle");
    setAudioURL(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  };

  return {
    status,
    audioURL,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
