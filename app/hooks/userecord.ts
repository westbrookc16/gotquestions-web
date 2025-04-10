"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "paused" | "stopped" | "error";

export const useAudioRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        /*Sentry.captureEvent({
          level: 'info',
          message: 'MIME type selected',
          extra: {
            mimeType: type,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          }
        });*/
        return type;
      }
    }

    //Sentry.captureMessage("No supported MIME type found", "warning");
    return '';
  };

  const requestMicrophone = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setErrorMessage(null);
      return stream;
    } catch (err: any) {
      Sentry.captureException("Microphone permission denied or error:" + err);
      setStatus("error");
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Microphone access was denied. Please enable microphone access in your browser settings to use voice recording.");
      } else {
        setErrorMessage("Failed to access microphone. Please check your microphone settings and try again.");
      }
      return null;
    }
  };

  const startRecording = async () => {
    if (status === "recording") return;
    setErrorMessage(null);

    const stream = await requestMicrophone();
    if (!stream) {
      setStatus("error");
      return;
    }
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, { mimeType: mimeType });
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(audioBlob);
      setAudioBlob(audioBlob);
      setAudioURL(url);
      setStatus("stopped");
    };

    recorder.onerror = (err) => {
      Sentry.captureException("Recording error: " + err);
      setStatus("error");
    };

    recorder.start(1000);
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
    setErrorMessage(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  };

  return {
    status,
    audioURL,
    audioBlob,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
