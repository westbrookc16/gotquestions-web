import Image from "next/image";
import RecordButton from "@/app/components/recordbutton";
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div>
          To use this chat bot, first grant this page permission to use the microphone. Then click the Start button to start recording and ask a question about Christianity. When you're done click the button again and you will see the text of your question and then the answer. After that you will here the answer read aloud. Please note that this answer is read by an AI voice and not by a human. Seems obvious, but I have to put that disclaimore in to use the voices.<br/>
          <RecordButton/></div>
      </main>
      
    </div>
  );
}
