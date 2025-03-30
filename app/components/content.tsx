"use client";

import { useEffect, useState } from "react";
//import Speech from "@/app/components/speech";
import TextToSpeech from "@/app/components/speech";
const Content = ({ html, answer, text, setLoading, isLoading, sources }: { sources: string, text: string, answer: string, html: string, setLoading: Function, isLoading: boolean }) => {
    return (
        <div>
            {text}<br />
            <div  className="text-lg font-semibold">{isLoading ? "Loading..." : ""}</div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {!isLoading && (sources != "") && (<div>
                <br />Sources
                <div dangerouslySetInnerHTML={{ __html: sources }} />
            </div>)}<br />
            <TextToSpeech text={answer ? answer : ""} setLoading={setLoading} />
        </div>
    );
}
export default Content;