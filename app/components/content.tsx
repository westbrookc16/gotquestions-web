"use client";

import { useEffect, useState } from "react";
//import Speech from "@/app/components/speech";
import TextToSpeech from "@/app/components/speech";
const Content = ({ html, answer, text, setLoading, isLoading, sources }: { sources: any, text: string, answer: string, html: string, setLoading: Function, isLoading: boolean }) => {
    return (
        <div>
            {text}<br />
            <div className="text-lg font-semibold">{isLoading ? "Loading..." : ""}</div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {!isLoading && (sources.length !== 0) && (<div>
                <br />Sources
                <ul className="list-disc list-inside">
                    {sources.map((source:any, index:any) => (
                        <li key={index}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.question}</a>
                        </li>
                    ))}
            </ul>
            </div>)}<br />
            <TextToSpeech text={answer ? answer : ""} setLoading={setLoading} />
        </div>
    );
}
export default Content;