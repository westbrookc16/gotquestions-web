"use client";

import { useEffect, useState } from "react";
//import Speech from "@/app/components/speech";
import AudioControls from "@/app/components/AudioControls";

interface ContentProps {
  html: string;
  answer: string;
  text: string;
  setLoading: (loading: boolean) => void;
  isLoading: boolean;
  isFetchingSources: boolean;
  sources: any[];
  voice: string;
  audioEnabled: boolean;
  onVoiceChange?: (voice: string) => void;
  audioSrc?: string;
  isGeneratingAudio: boolean;
}

const Content = ({
  html,
  answer,
  text,
  setLoading,
  isLoading,
  isFetchingSources,
  sources,
  voice,
  audioEnabled,
  onVoiceChange,
  audioSrc,
  isGeneratingAudio,
}: ContentProps) => {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {text && (
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
            <h2>
              <p className="text-m">{text}</p>
            </h2>
          </div>
        </div>
      )}

      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
          {isLoading ? (
            <div className="text-m text-muted-foreground">
              Generating answer<span className="animate-ellipsis"></span>
            </div>
          ) : (
            <>
              {html && (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              )}

              {!isLoading &&
                (isFetchingSources ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
                      Sources:
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      Fetching sources<span className="animate-ellipsis"></span>
                    </div>
                  </div>
                ) : (
                  sources.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
                        Sources:
                      </h3>
                      <ul className="space-y-1">
                        {sources.map((source: any, index: any) => (
                          <li key={index} className="text-sm">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {source.question}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}

              {answer && ((audioEnabled && isGeneratingAudio) || audioSrc) && (
                <div className="mt-4 pt-4">
                  <AudioControls
                    enabled={audioEnabled}
                    text={answer}
                    setLoading={setLoading}
                    voice={voice}
                    onVoiceChange={onVoiceChange}
                    audioSrc={audioSrc}
                    isGenerating={isGeneratingAudio}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Content;
