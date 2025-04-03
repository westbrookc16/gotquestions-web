"use client";
import { track } from '@vercel/analytics';

import { useState, useEffect, useRef } from "react";
import Content from "@/app/components/content";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import DictationSettings from "./components/DictationSettings";
import QuestionInput from "./components/QuestionInput";
import { ThemeToggle } from "./components/ThemeToggle";

const formSchema = z.object({
  question: z.string().nonempty("Question must be a string"),
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [screenReaderLoadingMessage, setScreenReaderLoadingMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [messages, setMessages] = useState<Array<{ question: string, answer: string, html: string, sources: any[], isLoading: boolean, isFetchingSources: boolean, audioSrc?: string }>>([]);
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    }
  }, [messages]);

  // Load dictation preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem("dictationPreferences");
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      setAudioEnabled(parsed.enabled);
    }
  }, []);

  // Save dictation preferences to localStorage
  useEffect(() => {
    localStorage.setItem("dictationPreferences", JSON.stringify({ enabled: audioEnabled }));
  }, [audioEnabled]);

  const handleEnabledChange = (enabled: boolean) => {
    setAudioEnabled(enabled);
  };

  // Generate audio for a message
  const generateAudio = async (answer: string, voice: string): Promise<string | undefined> => {
    if (!answer || !audioEnabled) return undefined;

    try {
      const response = await fetch("/api/textToSpeech", {
        body: JSON.stringify({ text: answer, voice }),
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error("Failed to generate audio");

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error("Error generating speech:", error);
      return undefined;
    }
  };

  const updateQuestion = (text: string) => {
    setQuestion(text);
    setSubmittedQuestion(text);
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    if (isLoading) return;
    track("text");
    setQuestion(values["question"]);
    setSubmittedQuestion(values["question"]);
  }

  const [html, setHtml] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  useEffect(() => {
    async function getData() {
      if (submittedQuestion === "") return;
      setIsLoading(true);
      setErrorMsg("");
      setHtml("");
      let htmlString = "";
      const maxAttempts = 2;
      let attempt = 0;
      let response;

      // Add the new message with loading state
      setMessages(prev => [...prev, {
        question: submittedQuestion,
        answer: "",
        html: "",
        sources: [],
        isLoading: true,
        isFetchingSources: false
      }]);

      while (attempt < maxAttempts) {
        try {
          response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: submittedQuestion }) });

          if (!response.ok) throw new Error(`HTTP error ${response.status}`);

          setQuestion("");
          let lastChar = "";
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");

          let buffer = "";

          while (true) {
            //@ts-ignore
            const { done, value } = await reader.read();
            if (done) {
              setAnswer(htmlString);
              // Generate audio if dictation is enabled
              let audioSrc: string | undefined = undefined;
              if (audioEnabled) {
                setIsGeneratingAudio(true);
                audioSrc = await generateAudio(htmlString, voice);
                setIsGeneratingAudio(false);
              }
              // Update the last message with the answer and audio
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  answer: htmlString,
                  html: htmlString,
                  isLoading: false,
                  audioSrc
                };
                return newMessages;
              });
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split("\n\n");

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line.startsWith("data:")) {
                const content = line.replace(/^data:\s*/, "");
                console.log("💬 Incoming chunk:", content);
                if (content.startsWith("ERROR:")) {
                  setErrorMsg(content.replace("ERROR: ", ""));
                  setIsLoading(false);
                  setSubmittedQuestion("");
                  return;
                }

                setIsLoading(false)
                const firstChar = content[0];
                const needsSpace =
                  lastChar &&
                  ![" ", "\n"].includes(lastChar) &&
                  ![" ", ".", ",", "!", "?", "'", "\n"].includes(firstChar);

                const spacedChunk = (needsSpace ? " " : "") + content;
                setHtml((prev) => prev + spacedChunk);
                htmlString += spacedChunk;
                lastChar = content.at(-1) ?? "";

                // Update the last message immediately with each chunk
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    answer: htmlString,
                    html: htmlString,
                    isLoading: false
                  };
                  return newMessages;
                });
              }
            }

            buffer = lines[lines.length - 1];
          }
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            console.error("❌ Failed after retries:", err);
            setErrorMsg("The server didn't respond. Please try again.");
            setIsLoading(false);
            setSubmittedQuestion("");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setIsLoading(false);
      setSubmittedQuestion("");
    }

    getData();
  }, [submittedQuestion]);

  const [sources, setSources] = useState([]);
  useEffect(() => {
    async function getData() {
      if (submittedQuestion === "" || errorMsg !== "") return;

      // Update the last message to show sources are loading
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          isFetchingSources: true
        };
        return newMessages;
      });

      const res = await fetch("/api/getsources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: submittedQuestion }) });
      const json = await res.json();
      setSources(json.sources);
      // Update the last message with the sources and mark as not loading
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          sources: json.sources,
          isFetchingSources: false
        };
        return newMessages;
      });
    }
    getData();
  }, [submittedQuestion]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoading) {
      setScreenReaderLoadingMessage("Answer is loading...");
      let toggle = false;
      intervalId = setInterval(() => {
        toggle = !toggle;
        setScreenReaderLoadingMessage(toggle ? "Still loading, please wait..." : "Generating your answer...");
      }, 10000);
    } else {
      setScreenReaderLoadingMessage("");
      if (intervalId) clearInterval(intervalId);
    }

    return () => { setScreenReaderLoadingMessage(""); if (intervalId) clearInterval(intervalId); }
  }, [isLoading]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">GotQuestions Assistant</h1>
            </div>
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" ref={mainRef}>
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {messages.length > 0 && (
            <div className="space-y-8">
              {messages.map((msg, index) => (
                <Content
                  key={index}
                  text={msg.question}
                  html={msg.html}
                  answer={msg.answer}
                  setLoading={setIsLoading}
                  isLoading={msg.isLoading}
                  isFetchingSources={msg.isFetchingSources}
                  sources={errorMsg !== "" ? [] : msg.sources}
                  voice={voice}
                  audioEnabled={audioEnabled}
                  onVoiceChange={(newVoice) => setVoice(newVoice)}
                  audioSrc={msg.audioSrc}
                  isGeneratingAudio={isGeneratingAudio && index === messages.length - 1}
                />
              ))}
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">
              {errorMsg}
            </div>
          )}

          {!(answer || question) && messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
              <div className="p-6 space-y-6 w-full max-w-2xl">
                <div className="space-y-4">
                  <QuestionInput
                    onSubmit={onSubmit}
                    updateQuestion={updateQuestion}
                    setIsLoading={setIsLoading}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="container mx-auto px-10 py-4 max-w-4xl">
        <div className="space-y-4">
          {(answer || messages.length > 0) && (
            <QuestionInput
              onSubmit={onSubmit}
              updateQuestion={updateQuestion}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          )}

          <div className="space-y-4">
            <DictationSettings
              enabled={audioEnabled}
              voice={voice}
              onEnabledChange={handleEnabledChange}
              onVoiceChange={(newVoice) => setVoice(newVoice)}
            />
          </div>
        </div>
      </div>
      <footer className="sticky bottom-0 bg-background ">
        <div className="container mx-auto px-4 py-2 mb-2 max-w-4xl">
          <p className="text-xs sm:text-sm text-muted-foreground/60 text-center">
            Please note that this answer is read by an AI voice and not by a human.
          </p>
          <p className="text-xs sm:text-sm mv-2 text-muted-foreground/60 text-center">
            If you are technical and wish to view the github repository, it is located <a href="https://github.com/jason-m-hicks/gotquestions-assistant" className="text-primary hover:underline">here</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
