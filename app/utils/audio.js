"use client";
import OpenAI from "openai";
import { modalFetch } from "./modal";
export async function sendAudioToWhisper(audioBlob) {
  console.log("Detected audio type:", audioBlob.type); // e.g. "audio/webm", "audio/wav"

  const response = await fetch("https://westbchris--speech-api-transcribe-audio.modal.run", {
    method: "POST",
    headers: {
      "modal-secret": process.env.NEXT_PUBLIC_MODAL_SECRET, "modal-key": process.env.NEXT_PUBLIC_MODAL_KEY, "Content-Type": audioBlob.type || "application/octet-stream",
    },
    body: audioBlob,
  });

  return await response.text();
}

const blobToBase64 = (blob, callback) => {
  const reader = new FileReader();
  reader.onload = function () {
    const base64data = reader?.result?.split(",")[1];
    callback(base64data);
  };
  reader.readAsDataURL(blob);
};

export { blobToBase64 };

// Function to calculate the peak level from the analyzer data
const getPeakLevel = (analyzer) => {
  // Create a Uint8Array to store the audio data
  const array = new Uint8Array(analyzer.fftSize);

  // Get the time domain data from the analyzer and store it in the array
  analyzer.getByteTimeDomainData(array);

  // Calculate the peak level by finding the maximum absolute deviation from 127
  return (
    array.reduce((max, current) => Math.max(max, Math.abs(current - 127)), 0) /
    128
  );
};

const createMediaStream = (stream, isRecording, callback) => {
  // Create a new AudioContext
  const context = new AudioContext();

  // Create a media stream source node from the input stream
  const source = context.createMediaStreamSource(stream);

  // Create an analyzer node for audio analysis
  const analyzer = context.createAnalyser();

  // Connect the source node to the analyzer node
  source.connect(analyzer);

  // Function to continuously analyze audio data and invoke the callback
  const tick = () => {
    // Calculate the peak level using the getPeakLevel function
    const peak = getPeakLevel(analyzer);

    if (isRecording) {
      callback(peak);

      // Request the next animation frame for continuous analysis
      requestAnimationFrame(tick);
    }
  };

  // Start the continuous analysis loop
  tick();
};

export { createMediaStream };