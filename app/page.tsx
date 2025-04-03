"use client";
import { appendChunkWithSmartSpacing } from "./utils/chunk";
import { track } from "@vercel/analytics";

import { useState, useEffect, useRef } from "react";
import Content from "@/app/components/content";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import DictationSettings from "./components/DictationSettings";
import QuestionInput from "./components/QuestionInput";
import { ThemeToggle } from "./components/ThemeToggle";
import { useCallback } from "react";
const formSchema = z.object({
  question: z.string().nonempty("Question must be a string"),
});
interface Message {
  question: string;
  answer: string;
  html: string;
  sources: any[];
  isLoading: boolean;
  isFetchingSources: boolean;
  audioSrc?: string;
  id: string;
}
export default function Home() {
  const [html, setHtml] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [screenReaderLoadingMessage, setScreenReaderLoadingMessage] =
    useState("");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [messages, setMessages] = useState<Array<Message>>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const fetchAndStreamResponse = useCallback(
    async (questionToAsk: string) => {
      if (!questionToAsk) return;

      setIsLoading(true);
      setErrorMsg("");

      setHtml(""); // Reset intermediate display if used

      let response;
      try {
        response = await fetch("/api/ask", {
          // Your Next.js API route
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: questionToAsk }),
        });
      } catch (error) {
        console.error("Fetch initiation failed:", error);
        setErrorMsg("Failed to connect to the server. Please try again.");
        setIsLoading(false);

        return;
      }

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error("Failed to get stream:", response.status, errorText);
        setErrorMsg(`Error from server: ${response.status}. Please try again.`);
        setIsLoading(false);
        setSubmittedQuestion(""); // Clear submitted question on error
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedAnswer = ""; // Use a dedicated variable for the answer text

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Stream finished successfully
            setIsLoading(false);
            // Final update is handled below after the loop completes naturally
            break; // Exit the loop
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process buffer line by line (SSE messages end with \n\n)
          // We might get multiple messages or partial messages in a chunk
          let boundaryIndex;
          while ((boundaryIndex = buffer.indexOf("\n\n")) >= 0) {
            const message = buffer.substring(0, boundaryIndex);
            buffer = buffer.substring(boundaryIndex + 2); // Remove message + \n\n

            // Process the actual data lines within the message
            const lines = message.split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const content = line.substring(5).trim(); // Remove "data:" and trim whitespace

                if (content === "[DONE]") {
                  // Optional: Can treat this as an early signal, but the `done` flag from reader.read() is the definitive end.
                  // console.log("Received [DONE] signal.");
                  continue; // Continue processing buffer in case more data arrived with DONE
                }
                if (content.startsWith("ERROR:")) {
                  const errorContent = content.replace("ERROR:", "").trim();
                  console.error("Stream error:", errorContent);
                  setErrorMsg(errorContent);
                  setIsLoading(false); // Stop overall loading
                  setSubmittedQuestion(""); // Clear submitted question on error
                  await reader.cancel(); // Stop reading the stream
                  return; // Exit the function entirely
                }

                // *** CORE FIX: Simple Concatenation ***
                accumulatedAnswer += content;
                // ************************************
                console.log(`content:${JSON.stringify(content)}`);
                // Update the UI progressively
                setHtml(accumulatedAnswer); // Update intermediate display if needed

                setMessages((prev) => {
                  const newMessages = [...prev];
                  // Find the placeholder message and update it
                  const msgIndex = newMessages.length - 1; // Assuming the last message is the one we want to update
                  if (msgIndex > -1) {
                    newMessages[msgIndex] = {
                      ...newMessages[msgIndex],
                      answer: accumulatedAnswer, // Update with current progress
                      html: accumulatedAnswer, // Assuming html is same as answer for now
                      isLoading: true, // Keep loading true while streaming
                    };
                  }
                  return newMessages;
                });
              }
            }
          } // end while loop processing buffer
        } // end while(true) reading stream

        // ----- Stream has finished successfully -----
        setIsLoading(false); // Ensure overall loading is off

        // Final message update after loop finishes
        let finalAudioSrc: string | undefined = undefined;
        if (audioEnabled && accumulatedAnswer) {
          setIsGeneratingAudio(true);
          try {
            finalAudioSrc = await generateAudio(accumulatedAnswer, voice);
          } catch (audioError) {
            console.error("Audio generation failed:", audioError);
            // Optionally set an error state specific to audio
          } finally {
            setIsGeneratingAudio(false);
          }
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          const msgIndex = newMessages.length - 1;

          if (msgIndex > -1) {
            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              answer: accumulatedAnswer, // Final complete answer
              html: accumulatedAnswer, // Final complete HTML
              isLoading: false, // Set loading to false for this message
              audioSrc: finalAudioSrc, // Add the generated audio source
            };
          }
          return newMessages;
        });
        setSubmittedQuestion(""); // Clear submitted question only on success? Your choice.
      } catch (error) {
        // Catch errors during stream reading/processing
        console.error("Error reading stream:", error);
        setErrorMsg("An error occurred while receiving the response.");
        setIsLoading(false);
        setMessages((prev) => {
          const newMessages = [...prev];
          const msgIndex = newMessages.length - 1;

          if (msgIndex > -1) {
            newMessages[msgIndex].answer = "Error reading response.";
            newMessages[msgIndex].html = "<p>Error reading response.</p>";
            newMessages[msgIndex].isLoading = false;
          }
          return newMessages;
        });
        // Ensure reader is closed if it exists and stream errored
        if (reader) {
          await reader
            .cancel()
            .catch((cancelError) =>
              console.error("Error cancelling reader:", cancelError)
            );
        }
      }
    },
    [
      audioEnabled,
      voice,
      setMessages,
      setIsLoading,
      setErrorMsg,
      setHtml,
      setIsGeneratingAudio,
      setSubmittedQuestion /* Add other dependencies if generateAudio changes */,
    ]
  );

  // You would likely call this function like this:
  // useEffect(() => {
  //   if (submittedQuestion) { // Check if a question has been submitted
  //     fetchAndStreamResponse(submittedQuestion);
  //   }
  // }, [submittedQuestion, fetchAndStreamResponse]); // Run when submittedQuestion changes

  // Now you can remove the `appendChunkWithSmartSpacing` function entirely.
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
      setVoice(localStorage.getItem("selectedVoice") || "alloy");
      //alert(localStorage.getItem("selectedVoice"));
    }
  }, []);

  // Save dictation preferences to localStorage
  useEffect(() => {
    localStorage.setItem(
      "dictationPreferences",
      JSON.stringify({ enabled: audioEnabled })
    );
  }, [audioEnabled]);
  function cleanUpPunctuationSpacing(text: string): string {
    return text
      .replace(/\s+([.,!?;:])/g, "$1") // remove space before punctuation
      .replace(/([.,!?])([^\s])/g, "$1 $2"); // ensure space after punctuation
  }

  const handleEnabledChange = (enabled: boolean) => {
    setAudioEnabled(enabled);
  };

  // Generate audio for a message
  const generateAudio = async (
    answer: string,
    voice: string
  ): Promise<string | undefined> => {
    if (!answer || !audioEnabled) return undefined;

    try {
      const response = await fetch("/api/textToSpeech", {
        body: JSON.stringify({ text: answer, voice }),
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    if (isLoading) return;
    track("text");
    setQuestion(values["question"]);
    setSubmittedQuestion(values["question"]);
  }

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
      setMessages((prev) => [
        ...prev,
        {
          question: submittedQuestion,
          answer: "",
          html: "",
          sources: [],
          isLoading: true,
          isFetchingSources: false,
          id: Date.now() + "-a",
        },
      ]);

      while (attempt < maxAttempts) {
        try {
          await fetchAndStreamResponse(submittedQuestion);
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
  }, [submittedQuestion, fetchAndStreamResponse]);

  const [sources, setSources] = useState([]);
  useEffect(() => {
    async function getData() {
      if (submittedQuestion === "" || errorMsg !== "") return;

      // Update the last message to show sources are loading
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          isFetchingSources: true,
        };
        return newMessages;
      });

      const res = await fetch("/api/getsources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: submittedQuestion }),
      });
      const json = await res.json();
      setSources(json.sources);
      // Update the last message with the sources and mark as not loading
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          sources: json.sources,
          isFetchingSources: false,
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
        setScreenReaderLoadingMessage(
          toggle ? "Still loading, please wait..." : "Generating your answer..."
        );
      }, 10000);
    } else {
      setScreenReaderLoadingMessage("");
      if (intervalId) clearInterval(intervalId);
    }

    return () => {
      setScreenReaderLoadingMessage("");
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                GotQuestions Assistant
              </h1>
              <p className="text-muted-foreground">
                Ask questions and get answers from{" "}
                <a
                  href="https://www.gotquestions.org/"
                  className="text-primary hover:underline"
                >
                  GotQuestions.org
                </a>
              </p>
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
                  isGeneratingAudio={
                    isGeneratingAudio && index === messages.length - 1
                  }
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
          <p className="text-sm text-muted-foreground/60 text-center">
            Please note that this answer is read by an AI voice and not by a
            human.
          </p>
          <p className="text-sm mv-2 text-muted-foreground/60 text-center">
            If you are technical and wish to view the github repository, it is
            located{" "}
            <a
              href="https://github.com/westbrookc16/gotquestions-web"
              className="text-primary hover:underline"
            >
              here
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
