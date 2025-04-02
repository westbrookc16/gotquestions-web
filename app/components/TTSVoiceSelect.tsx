"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

const voices = ["Alloy", "Echo", "Fable", "Onyx", "Nova", "Shimmer"]
const LOCAL_STORAGE_KEY = "selectedVoice"


const getPreviewUrl = (voice: string) => {
  const match = voices.find((v) => v.toLowerCase() === voice)
  return match
    ? `https://cdn.openai.com/tts/voices/preview/${match.toLowerCase()}.mp3`
    : ""
}

export function TTSVoiceSelect({
  onChange,
}: {
  onChange: (voice: string) => void
}) {
  const [voice, setVoice] = useState("")
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      setVoice(saved)
      onChange(saved)
    }
  }, [])

  const handleChange = (value: string) => {
    setVoice(value)
    localStorage.setItem(LOCAL_STORAGE_KEY, value)
    onChange(value)
  }

  const playPreview = async (voice: string) => {
    const audio = new Audio(getPreviewUrl(voice))
    console.log(`voice url: ${getPreviewUrl(voice)}`)
    setPlaying(voice)
    audio.play()
    audio.onended = () => setPlaying(null)
    audio.onerror = () => setPlaying(null)
  }

  return (
    <div><Select value={voice} onValueChange={handleChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select voice" />
      </SelectTrigger>
      <SelectContent>
        {voices.map((v) => (
          <SelectItem
            key={v}
            value={v.toLowerCase()}
            className="flex items-center justify-between"
          >
            <span>{v}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button onClick={async(e)=>{
if (playing) return
if (!voice) return
setPlaying(voice)
const res=await fetch(`/api/textToSpeech`, { method: "POST", body: JSON.stringify({ text: "Hello, this is a preview of the voice.", voice }) })
const audioBlob = await res.blob()
const audioURL = URL.createObjectURL(audioBlob)
const audio = new Audio(audioURL)
audio.play()
setPlaying(voice)
audio.onended = () => setPlaying(null)
audio.onerror = () => setPlaying(null)


    }}>Play Preview</Button>
    </div>
  )
}
