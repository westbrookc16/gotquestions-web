"use client";
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




  const [question, setQuestion] = useState("");



  const updateQuestion = (text: string) => {
    setQuestion(text);
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
    setIsLoading(true);
    setQuestion(values["question"]);
    //values["question"] = "";
    form.reset();
  }

  const [html, setHtml] = useState("");
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    //get data from api
    async function getData() {
      if (question === "") return;
      //setIsLoading(true);
      setHtml("");
      const res = await fetch(`https://westbchris--rag-deepseek-gpu-streamanswer.modal.run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      if (!res.body) {
        setIsLoading(false);
        throw new Error("No response body");
      }
  
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
  let htmlString:string="";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          
          setIsLoading(false);
          setAnswer(htmlString);
          break;
        }
        const chunk = decoder.decode(value);
        setHtml((prev) => {
          setIsLoading(false);
          return prev + chunk;
        });
        htmlString+=chunk;
      }


      //setHtml(json.content + "<br/>" + "Sources:<br/>" + json.sources);
      //setAnswer(json.content);
    }

    getData();
  }, [question]);
const [sourcesHtml,setSourcesHtml]=useState("");
useEffect(()=>{
async function getData(){
const res=await fetch(`https://westbchris--rag-deepseek-gpu-getsources.modal.run?question=${encodeURIComponent(question)}`);
const json=await res.json();
setSourcesHtml(json.sources);

}
getData();

},[question]);  
return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div>
          To use this chat bot, first grant this page permission to use the microphone and start the recording by clicking the start button. When you're done click the button again and you will see the text of your question and then the answer. After that you will here the answer read aloud. Please note that this answer is read by an AI voice and not by a human. Seems obvious, but I have to put that disclaimore in to use the voices.<br />Data pulled from <a href="https://www.gotquestions.org/">GotQuestions.org</a>.<br />
          <AudioRecording isLoading={isLoading} updateQuestion={setQuestion} setIsLoading={setIsLoading} />
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
          <Content text={question} html={html} answer={answer} setLoading={setIsLoading} isLoading={isLoading} sources={sourcesHtml} />
          <br />
          If you are technical and wish to view the github repository, it is located <a href="https://github.com/westbrookc16/gotquestions-web">here.</a>
        </div>
      </main>

    </div>
  );
}
