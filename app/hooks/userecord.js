"use client";
import { useEffect, useState, useRef } from "react";
import { sendAudioToWhisper } from "@/app/utils/audio";

export const useRecordVoice = () => {
  // State to hold the media recorder instance
  const [mediaRecorder, setMediaRecorder] = useState(null);
  // State to track whether recording is currently in progress
  const [recording, setRecording] = useState(false);
  const [recordButtonClicked, setRecordButtonClicked] = useState(false);
  // Ref to store audio chunks during recording
  const chunks = useRef([]);
  const [text, setText] = useState("");
  // Track if media permissions have been requested
  const [permissionRequested, setPermissionRequested] = useState(false);
  // Track if there was an error getting permissions
  const [permissionError, setPermissionError] = useState(null);
  // Track the media stream to ensure it's not garbage collected
  const streamRef = useRef(null);

  // Function to initialize the media recorder with the provided stream
  const initialMediaRecorder = (stream) => {
    // Store the stream reference to prevent garbage collection
    streamRef.current = stream;

    // Use a more widely supported mime type
    const mimeType = getSupportedMimeType();

    // Create the media recorder with options
    const options = { mimeType };
    let recorder;

    try {
      recorder = new MediaRecorder(stream, options);
    } catch (err) {
      console.warn("MediaRecorder with specified options failed, using default:", err);
      recorder = new MediaRecorder(stream);
    }

    // Event handler when recording starts
    recorder.onstart = () => {
      chunks.current = []; // Resetting chunks array
    };

    // Event handler when data becomes available during recording
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.current.push(ev.data); // Storing data chunks
      }
    };

    // Event handler when recording stops
    recorder.onstop = async () => {
      try {
        // Creating a blob from accumulated audio chunks
        const audioBlob = new Blob(chunks.current, { type: mimeType || 'audio/webm' });

        // Process the audio
        const transcribedText = await sendAudioToWhisper(audioBlob);
        setText(transcribedText);
        setRecordButtonClicked(true);
      } catch (error) {
        console.error("Error processing audio:", error);
        setText("Error transcribing audio. Please try again.");
      }
    };

    setMediaRecorder(recorder);
  };

  // Helper function to determine the best supported mime type
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
        console.log("Using mime type:", type);
        return type;
      }
    }

    console.warn("No preferred mime type supported, will use browser default");
    return '';
  };

  // Function to request media permissions
  const requestMediaPermissions = async () => {
    if (permissionRequested) return;

    setPermissionRequested(true);
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      initialMediaRecorder(stream);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setPermissionError(err.message || "Could not access microphone");
    }
  };

  // Function to start the recording
  const startRecording = async () => {
    // Ensure we have permissions before starting
    if (!mediaRecorder) {
      await requestMediaPermissions();
      // If we still don't have a mediaRecorder after requesting permissions, return
      if (!mediaRecorder) return;
    }

    try {
      // Set a smaller timeslice to get more frequent ondataavailable events (better for mobile)
      mediaRecorder.start(1000);
      setRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  // Function to stop the recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
        setRecording(false);
      } catch (err) {
        console.error("Error stopping recording:", err);
      }
    }
  };

  // Initialize media permissions when component mounts
  useEffect(() => {
    // Only initialize if window exists (client-side) and permissions haven't been requested yet
    if (typeof window !== "undefined" && !permissionRequested) {
      // On mobile, wait for explicit user interaction before requesting permissions
      // This is handled by the startRecording function
    }

    // Cleanup function to stop media tracks when component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [permissionRequested]);

  return {
    recording,
    startRecording, stopRecording, text, setText, permissionError,permissionRequested
  };
}