"use client";
import { useRecordVoice } from "@/app/hooks/userecord";
import { useState } from "react";
import Image from "next/image";
import RecordButton from "@/app/components/recordbutton";
import Content from "@/app/components/content";
export default function Home() {
  const { startRecording, stopRecording, recording, text } = useRecordVoice();
  const [isLoading, setIsLoading] = useState(false);
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div>
          To use this chat bot, first grant this page permission to use the microphone. Then click the Start button to start recording and ask a question about Christianity. When you're done click the button again and you will see the text of your question and then the answer. After that you will here the answer read aloud. Please note that this answer is read by an AI voice and not by a human. Seems obvious, but I have to put that disclaimore in to use the voices.<br />
          <RecordButton recording={recording} isLoading={isLoading} startRecording={startRecording} stopRecording={stopRecording} />
          <br />
          <Content text={text} setLoading={setIsLoading} isLoading={isLoading} />
          <br />
          If you are technical and wish to view the github repository, it is located <a href="https://github.com/westbrookc16/gotquestions-web">here.</a>
        </div>
      </main>

    </div>
  );
}
