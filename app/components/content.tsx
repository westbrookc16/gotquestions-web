"use client";

import { useEffect, useState } from "react";
//import Speech from "@/app/components/speech";
import TextToSpeech from "@/app/components/speech";
const Content = ({ text, setLoading,isLoading }: { text: string, setLoading: Function,isLoading:boolean }) => {
    const [html, setHtml] = useState("");
    const [answer, setAnswer] = useState("");
    useEffect(() => {
        //get data from api
        async function getData() {
            if (text === "") return;
            setLoading(true);
            const res = await fetch(`https://westbchris--rag-modal-deployment-getdataandanswerquestion.modal.run/?question=${encodeURIComponent(text)}&forceUpload=false`)
            const json = await res.json();
            console.log(json);

            setHtml(json.content + "<br/>" + "Sources:<br/>" + json.sources);
            setAnswer(json.content);
        }

        getData();
    }, [text]);
    return (
        <div>
            {text}<br/>
            <div aria-live="polite" className="text-lg font-semibold">{isLoading ? "Loading..." : ""}</div>
            <div dangerouslySetInnerHTML={{ __html: html }} />

            <TextToSpeech text={answer ? answer : ""} setLoading={setLoading} />
        </div>
    );
}
export default Content;