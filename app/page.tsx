"use client";
import { modalFetch } from "./utils/modal";
import AudioRecording from "@/app/components/audio";
import { track } from '@vercel/analytics';



import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import RecordButton from "@/app/components/recordbutton";
import Content from "@/app/components/content";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingOverlay } from "./components/spinner";



const formSchema = z.object({
  question: z.string().nonempty("Question must be a string"),
});


export default function Home() {


  const [isLoading, setIsLoading] = useState(false);

  const [screenReaderLoadingMessage, setScreenReaderLoadingMessage] = useState("");



  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");



  const updateQuestion = (text: string) => {
    setQuestion(text);
    setSubmittedQuestion(text);
  }

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
    },
  })

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
    if (isLoading) return;
    track("text");
    //setIsLoading(true);
    setQuestion(values["question"]);
    setSubmittedQuestion(values["question"]);
    //values["question"] = "";
    //form.reset();
  }

  const [html, setHtml] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    //get data from api
    async function getData() {
      if (submittedQuestion === "") return;
      setIsLoading(true);
      setErrorMsg("");
      setHtml("");
      let htmlString = "";
      const maxAttempts = 2;
      let attempt = 0;
      let response;

      while (attempt < maxAttempts) {
        try {
          response = await modalFetch("https://westbchris--rag-deepseek-gpu-streamanswer.modal.run", JSON.stringify({ question: submittedQuestion }));

          if (!response.ok) throw new Error(`HTTP error ${response.status}`);


          form.reset();
          // 🔥 Stream the body chunk by chunk
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");

          let buffer = "";

          while (true) {
            //@ts-ignore
            const { done, value } = await reader.read();
            if (done) { setAnswer(htmlString); break; }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Parse SSE-style lines: "data: ...\n\n"
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
                // Do something with `content`, like append it to a chat window
                setHtml((prev) => prev + content);
                htmlString += content;
              }

            }

            // Keep only the incomplete buffer at the end
            buffer = lines[lines.length - 1];
          }
          break; // Success — break out of retry loop
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            console.error("❌ Failed after retries:", err);
            setErrorMsg("The server didn't respond. Please try again.");
            setIsLoading(false);
            setSubmittedQuestion("");
            return;
          }
          // Optional: small delay before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }


      //setHtml(json.content + "<br/>" + "Sources:<brs/>" + json.sources);
      //setAnswer(json.content);
      setIsLoading(false);
      setSubmittedQuestion("");
    }

    getData();
  }, [submittedQuestion]);
  const [sourcesHtml, setSourcesHtml] = useState("");
  useEffect(() => {
    async function getData() {
      if (submittedQuestion === "" || errorMsg !== "") return;
      //@ts-ignore
      const res = await fetch(`https://westbchris--rag-deepseek-gpu-getsources.modal.run?question=${encodeURIComponent(submittedQuestion)}`,{"headers": {"Modal-Key": process.env.NEXT_PUBLIC_MODAL_KEY, "Modal-Secret": process.env.NEXT_PUBLIC_MODAL_SECRET}});
      const json = await res.json();
      setSourcesHtml(json.sources);

    }
    getData();

  }, [submittedQuestion]);
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoading) {
      // Announce immediately
      setScreenReaderLoadingMessage("Answer is loading...");
      let toggle = false;
      intervalId = setInterval(() => {
        toggle = !toggle;
        setScreenReaderLoadingMessage(toggle ? "Still loading, please wait..." : "Generating your answer...");
      }, 10000); // every 10 seconds
    } else {
      setScreenReaderLoadingMessage(""); // clear message

      if (intervalId) clearInterval(intervalId);
    }

    return () => { setScreenReaderLoadingMessage(""); if (intervalId) clearInterval(intervalId); }
  }, [isLoading]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div>
          To use this chat bot, first grant this page permission to use the microphone and start the recording by clicking the start button. When you're done click the button again and you will see the text of your question and then the answer. After that you will here the answer read aloud. Please note that this answer is read by an AI voice and not by a human. Seems obvious, but I have to put that disclaimore in to use the voices.<br />Data pulled from <a href="https://www.gotquestions.org/">GotQuestions.org</a>.<br />
          <AudioRecording isLoading={isLoading} updateQuestion={updateQuestion} setIsLoading={setIsLoading} />
          <br />
          or<br />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="Ask a Question" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
          {isLoading && <LoadingOverlay />}
          <Content text={question} html={html} answer={answer} setLoading={setIsLoading} isLoading={isLoading} sources={errorMsg !== "" ? "" : sourcesHtml} />
          <br />
          <div aria-live="assertive">{errorMsg && <div className="text-red-500">{errorMsg}</div>}</div>
          If you are technical and wish to view the github repository, it is located <a href="https://github.com/westbrookc16/gotquestions-web">here.</a>
        </div>

        <div aria-live="polite" className="sr-only">{screenReaderLoadingMessage}</div>
      </main>

    </div>
  );
}
