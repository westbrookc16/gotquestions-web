import time
from langchain_openai import OpenAIEmbeddings
from langchain_core.messages import SystemMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import CSVLoader
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFacePipeline
from typing_extensions import List, TypedDict
import modal
import os
from functools import lru_cache

image = modal.Image.debian_slim().pip_install(
    "openai", "langchain", "langchain_community", "langchain_core",
    "langchain_huggingface", "langchain_openai", "langgraph", "langchain_chroma",
    "transformers", "accelerate", "torch"
)

app = modal.App("rag-deepseek-gpu", image=image)

vectorstore_volume = modal.Volume.from_name("gotquestions-storage", create_if_missing=True)
hf_cache = modal.Volume.from_name("hf-cache", create_if_missing=True)
# At the top of your file
LLM_PIPELINE = None  # Global cache for current container
#@app.function(secrets=[modal.Secret.from_name("huggingface-secret")])
def get_pipeline():
    global LLM_PIPELINE
    if LLM_PIPELINE is None:
        from transformers import pipeline
        import torch
        from langchain_huggingface import HuggingFacePipeline

        
class State(TypedDict):
    messages: List[dict]
    context: List[Document]
    llm: any




@app.function(
    volumes={"/vectorstore": vectorstore_volume},
    secrets=[modal.Secret.from_name("openai-secret"), modal.Secret.from_name("langsmith-secret")],
    timeout=6000
)
def loadData(forceUpload):
    vectorstore_path = "/vectorstore"
    csv_path = f"{vectorstore_path}/gotquestions.csv"

    loader = CSVLoader(file_path=csv_path, encoding="utf8", csv_args={"delimiter": ",", "quotechar": '"'}, metadata_columns=["url", "question"])
    docs = loader.load()
    splits = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=500).split_documents(docs)

    if forceUpload == "true":
        Chroma.from_documents(documents=splits, embedding=OpenAIEmbeddings(model="text-embedding-3-large"), persist_directory=vectorstore_path)
    else:
        vectorstore = Chroma(persist_directory=vectorstore_path, embedding_function=OpenAIEmbeddings(model="text-embedding-3-large"))
        existing_urls = {doc["url"] for doc in vectorstore.get()["metadatas"] if "url" in doc}
        new_splits = [doc for doc in splits if doc.metadata.get("url") not in existing_urls]
        if new_splits:
            vectorstore.add_documents(new_splits)

from fastapi.responses import StreamingResponse
from fastapi import Request

from fastapi.responses import StreamingResponse
from fastapi import Request
import asyncio
from langchain.callbacks.base import AsyncCallbackHandler
from langchain_core.messages import HumanMessage

@app.function(
    secrets=[modal.Secret.from_name("openai-secret"), modal.Secret.from_name("langsmith-secret")],
    volumes={"/vectorstore": vectorstore_volume, "/volumes/hf-cache": hf_cache},
    timeout=6000,
    
)
@modal.fastapi_endpoint(method="post", docs=True)
async def streamAnswer(request: Request):
    os.environ["HF_HOME"] = "/volumes/hf-cache"
    from langchain_openai import ChatOpenAI

    body = await request.json()
    question = body["question"]

    # Vector search
    retrieved_docs = query_vectorstore.remote(question)
    context = "\n\n".join(doc.page_content for doc in retrieved_docs)

    # Prompt
    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following context to answer the question. "
        "If you don't know the answer, say so. Keep it concise.\n\n"
        f"{context}"
    )
    prompt = f"{system_prompt}\n\nUser: {question}\nAssistant:"

    # Streaming callback handler
    class TokenStreamer(AsyncCallbackHandler):
        def __init__(self):
            self.queue = asyncio.Queue()

        async def on_llm_new_token(self, token: str, **kwargs):
            await self.queue.put(token)

        async def on_llm_end(self, *args, **kwargs):
            await self.queue.put(None)

        async def generator(self):
            while True:
                token = await self.queue.get()
                if token is None:
                    break
                yield token

    streamer = TokenStreamer()

    # Set up streaming model
    llm = ChatOpenAI(
        model="mistralai/Mistral-7B-Instruct-v0.3",
        openai_api_base="https://westbchris--vllm-serve.modal.run/v1",
        openai_api_key="not-needed",
        temperature=0.7,
        streaming=True,
        callbacks=[streamer],
    )

    # Fire off the generation in the background
    asyncio.create_task(llm.ainvoke(prompt))

    # Stream response
    return StreamingResponse(streamer.generator(), media_type="text/plain")

@app.function(
    secrets=[modal.Secret.from_name("openai-secret"), modal.Secret.from_name("langsmith-secret")],
    volumes={"/vectorstore": vectorstore_volume, "/volumes/hf-cache": hf_cache},
    timeout=6000,
    
)
@modal.fastapi_endpoint(docs=True)
def getDataAndAnswerQuestion(question: str, forceUpload: str):
    try:
        os.environ["HF_HOME"] = "/volumes/hf-cache"

        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
    model="mistralai/Mistral-7B-Instruct-v0.3",
    openai_api_base="https://westbchris--vllm-deepseek-serve.modal.run/v1",
    openai_api_key="not-needed",  # required by LangChain, but vLLM doesn't check
        temperature=0.7
    )

        
        retrieved_docs = query_vectorstore.remote(question)
        #return {"content":"OK","sources":""}
        state: State = {
            "messages": [{"role": "user", "content": question}],
            "context": retrieved_docs,
            "llm": llm
        }

        result = generate(state)

        sources_html = "".join(
            f'<a href="{doc.metadata["url"]}" target="_blank">{doc.metadata["question"]}</a><br>'
            for doc in result["context"]
        )

        return {
            "content": result["messages"][-1],
            "sources": sources_html
        }

    except Exception as e:
        import traceback
        print("Exception during generate():", e)
        traceback.print_exc()
        raise
@app.function(
    secrets=[modal.Secret.from_name("openai-secret")],
    volumes={"/vectorstore": vectorstore_volume},
    timeout=300,
)
@modal.fastapi_endpoint(docs=True)
def getSources(question: str):
    retrieved_docs = query_vectorstore.remote(question)

    seen_urls = set()
    sources_html = ""

    for doc in retrieved_docs:
        url = doc.metadata.get("url")
        question_text = doc.metadata.get("question", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            sources_html += f'<a href="{url}" target="_blank">{question_text}</a><br>'

    return {"sources": sources_html}

@app.function(volumes={"/vectorstore": vectorstore_volume},secrets=[modal.Secret.from_name("openai-secret"), modal.Secret.from_name("langsmith-secret")],timeout=6000)
def query_vectorstore(query: str):
    vectorstore = Chroma(
        persist_directory="/vectorstore",
        embedding_function=OpenAIEmbeddings(model="text-embedding-3-large")
    )
    return vectorstore.similarity_search(query, k=2)

def retrieveInfoForQuery(query: str):
    vectorstore_path = "/vectorstore"
    #the below line is causing hte error I think.
    #vectorStore = Chroma(
        #persist_directory=vectorstore_path,
        #embedding_function=OpenAIEmbeddings(model="text-embedding-3-large")
    #)
    #retrieved_docs = vectorStore.similarity_search(query, k=2)
    retrieved_docs=[]
    serialized = "\n\n".join(
        f"Source: {doc.metadata}\nContent: {doc.page_content}"
        for doc in retrieved_docs
    )
    return serialized, retrieved_docs

def generate(state: State):
    from torch import cuda
    print("CUDA mem alloc:", cuda.memory_allocated() / 1e6, "MB")
    print("CUDA mem reserved:", cuda.memory_reserved() / 1e6, "MB")

    docs_content = "\n\n".join(doc.page_content for doc in state["context"])

    system_message_content = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer the question. "
        "If you don't know the answer, say that you don't know. Keep the answer concise.\n\n"
        f"{docs_content}"
    )

    # Construct a single prompt string instead of using message dicts
    user_message = state["messages"][0]["content"]
    prompt = f"{system_message_content}\n\nUser: {user_message}\nAssistant:"

    response = state["llm"].invoke(prompt)
    print("Response type:", type(response))
    print("Response content:", response)
    text = response.content.strip()

    # Just return what's after the "Assistant:" prefix
    if "Assistant:" in text:
        text = text.split("Assistant:")[-1].strip()

    return {"messages": [text], "context": state["context"]}
@app.local_entrypoint()
def main():
    preload_deepseek.remote()
    sanity_check_model.remote()

@app.function(volumes={"/volumes/hf-cache": hf_cache}, timeout=1200, retries=0)
def preload_deepseek():
    os.environ["HF_HOME"] = "/volumes/hf-cache"
    from transformers import pipeline
    print("Preloading model...")
    _ = pipeline("text-generation", model="deepseek-ai/deepseek-llm-7b-chat", device=0)
    print("Model ready!")
@app.function( timeout=1200, volumes={"/volumes/hf-cache": hf_cache})
def sanity_check_model():
    os.environ["HF_HOME"] = "/volumes/hf-cache"
    from transformers import pipeline
    pipe = pipeline("text-generation", model="deepseek-ai/deepseek-llm-7b-chat", device=0)
    out = pipe("Hello")[0]["generated_text"]
    print("Model output:", out)
