import modal
from fastapi import Request  # add this
from modal import Image, app, fastapi_endpoint

import openai
import os
import io

# Modal setup
image = Image.debian_slim().pip_install("openai","fastapi[standard]")
app = modal.App(name="speech-api", image=image)

from fastapi import Request
from fastapi.responses import StreamingResponse
import openai
import io
import os

@app.function(secrets=[modal.Secret.from_name("openai-secret"),modal.Secret.from_name("api-key")])
@fastapi_endpoint(method="POST",requires_proxy_auth=False,
                                                                   )
async def synthesize_speech(request: Request):
    #check for api key
    api_key=os.environ["API_KEY"]
    req_api_key=request.headers.get("x-api-key")
    if api_key!=req_api_key:
        return StreamingResponse(io.BytesIO(b""), media_type="text/plain", status_code=401)
    data = await request.json()
    text = data.get("text", "")

    if not text:
        return StreamingResponse(io.BytesIO(b""), media_type="text/plain", status_code=400)

    openai.api_key = os.environ["OPENAI_API_KEY"]

    response = openai.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text,
    )

    return StreamingResponse(
        io.BytesIO(response.content),
        media_type="audio/mpeg"
    )



@app.function(secrets=[modal.Secret.from_name("openai-secret"),modal.Secret.from_name("api-key")])
@fastapi_endpoint(method="POST",requires_proxy_auth=False,)
async def transcribe_audio(request:Request) -> str:
    openai.api_key = os.environ["OPENAI_API_KEY"]
    #check for api key
    api_key=os.environ["API_KEY"]
    req_api_key=request.headers.get("x-api-key")
    if api_key!=req_api_key:
        return StreamingResponse(io.BytesIO(b""), media_type="text/plain", status_code=401)
    data = await request.body()  # 🔥 this gets raw bytes
    #audio_file = ("audio.wav", io.BytesIO(data), "audio/wav")
    # Simple heuristic: infer from first few bytes, or just default to webm if mobile
    content_type = request.headers.get("content-type", "audio/webm")
    filename_ext = "webm" if "webm" in content_type else "wav"

    audio_file = (f"audio.{filename_ext}", io.BytesIO(data), content_type)
    print("extension", filename_ext)
    print("content type", content_type)

    transcript = openai.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )

    return transcript.strip().strip('"')  # Remove extra quotes if present
