import time
from langchain_core.messages import AIMessage
from langchain_openai import OpenAIEmbeddings
from langgraph.graph import MessagesState, StateGraph
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

from fastapi import Request, Response

@modal.fastapi_endpoint(method="OPTIONS", docs=True)
async def streamAnswer_options(request: Request):
    print("options hit.")
    
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "https://gotquestions-web.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response
        
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
            print(f"Added {len(new_splits)} new documents to the vectorstore.")
        else:
            print("No new documents to add.")

from fastapi.responses import StreamingResponse
from fastapi import Request

from fastapi.responses import StreamingResponse
from fastapi import Request
import asyncio
from langchain.callbacks.base import AsyncCallbackHandler
from langchain_core.messages import HumanMessage
from langchain_core.messages import SystemMessage




@app.function(
    secrets=[modal.Secret.from_name("openai-secret"), modal.Secret.from_name("langsmith-secret"),modal.Secret.from_name("api-key")],
    
        volumes={"/vectorstore": vectorstore_volume, "/volumes/hf-cache": hf_cache},
    timeout=6000,
    scaledown_window=15*60
)
@modal.fastapi_endpoint(method="POST", docs=True)
async def streamAnswer(request: Request):
    from langgraph.prebuilt import ToolNode
    import os
    os.environ["HF_HOME"] = "/volumes/hf-cache"
    #check for api key
    api_key=os.environ["API_KEY"]
    req_api_key=request.headers.get("x-api-key")
    if api_key!=req_api_key:
        return Response("",media_type="text/plain", status_code=401)
    from langchain_openai import ChatOpenAI
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "https://gotquestions-web.vercel.app"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        return response
    body = await request.json()
    question = body["question"]

    
    #llm = ChatOpenAI(
        #model="mistralai/Mistral-7B-Instruct-v0.3",
        #openai_api_base="https://westbchris--vllm-serve.modal.run/v1",
        #openai_api_key="not-needed",
        #temperature=0.7,
        #streaming=True,
    #)
    llm=ChatOpenAI()
    #import getpass
    import os



    from langchain_openai import OpenAIEmbeddings

    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")        
    
    from langchain_chroma import Chroma

    vector_store = Chroma(
    
        embedding_function=embeddings,
        persist_directory="./vectorstore",  # Where to save data locally, remove if not necessary
    )
    from langchain import hub
    from langchain_community.document_loaders import WebBaseLoader
    from langchain_core.documents import Document
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from typing_extensions import List, TypedDict
    def retrieve_and_generate(state: MessagesState):
        """Retrieve docs, then generate response with context."""
        last_user_msg = next(
            (m for m in reversed(state["messages"]) if m.type == "human"), None
        )
        query = last_user_msg.content if last_user_msg else ""

        # Always retrieve
        vector_store = Chroma(persist_directory="/vectorstore", embedding_function=OpenAIEmbeddings(model="text-embedding-3-large"))
        results = vector_store.similarity_search_with_score(query, k=5)
        retrieved_docs = [doc for doc, score in results if score <= 0.9]
        # 🔥 Fallback if nothing relevant was found
        if not retrieved_docs:
            return {
                "messages": [
                    AIMessage(content="Sorry, I couldn’t find any relevant information to answer your question.")
                ]
            }

        # Otherwise, format context
        # Format context
        context_str = "\n\n".join(f"Source: {doc.metadata}\nContent: {doc.page_content}" for doc in retrieved_docs)
        system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question. "
            "If you don't know the answer, say that you don't know. "
            "Use three sentences maximum and keep the answer concise."
            "\n\n"
            f"{context_str}"
        )

        # Build prompt
        conversation = [
            message for message in state["messages"]
            if message.type in ("human", "system")
        ]
        prompt = [SystemMessage(system_prompt)] + conversation
        
        response = llm.invoke(prompt)
        return {"messages": [response]}


    

    graph_builder = StateGraph(MessagesState)
    # Step 1: Generate an AIMessage that may include a tool-call to be sent.
    
    from langgraph.graph import END
    
    print("question:",question)
    graph_builder.add_node(retrieve_and_generate)
    


    graph_builder.set_entry_point("retrieve_and_generate")
    

    graph_builder.add_edge("retrieve_and_generate", END)
    
    graph = graph_builder.compile()
    from langgraph.checkpoint.memory import MemorySaver

    memory = MemorySaver()
    from langgraph.prebuilt import create_react_agent
    #graph=create_react_agent(llm,[retrieve],checkpointer=memory)
    config = {"configurable": {"thread_id": "abc123"}}
    from fastapi.responses import StreamingResponse
    async def event_generator():
        try:
            print("started generator.")
            for step in graph.stream(
    {
        "messages": [{"role": "user", "content": question}],
        
    },
    stream_mode="values",
    config=config,
):

                print("got step.")
                for msg in step.get("messages", []):
                    if isinstance(msg, AIMessage):
                        yield f"data: {msg.content}\n\n"
        except Exception as e:
            print("Error in stream generator:", e)
            # Yield an SSE-formatted error so frontend can handle it
            yield f"data: ERROR: An internal error occurred. Please try again.\n\n"
    

    # Stream response
    response = StreamingResponse(event_generator(), media_type="text/event-stream")
    response.headers["Access-Control-Allow-Origin"] = "https://gotquestions-web.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response



@app.function(
    secrets=[modal.Secret.from_name("openai-secret"),modal.Secret.from_name("api-key")],
    volumes={"/vectorstore": vectorstore_volume},
    timeout=300,
)
@modal.fastapi_endpoint(docs=True,requires_proxy_auth=False,)
def getSources(request:Request):
    question=request.query_params.get("question")
    #check for api key
    api_key=os.environ["API_KEY"]
    req_api_key=request.headers.get("x-api-key")
    if api_key!=req_api_key:
        return Response("",media_type="text/plain", status_code=401)
    retrieved_docs = query_vectorstore.remote(question)
    if not retrieved_docs:
        return {"sources": "No sources found."}

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
    results=vectorstore.similarity_search_with_score(query, k=5)
    # Filter results based on score threshold
    # Adjust the threshold as needed
# For example, if you want to keep results with score <=    0.9, you can do:
    # results = [doc for doc, score in results if score >= 0.9] 
    #write scores to console
    for doc, score in results:
        print(f"Document: {doc.metadata}, Score: {score}")
    return [doc for doc, score in results if score <= 0.9]








    
@app.local_entrypoint()
def main():
    #preload_deepseek.remote()
    #sanity_check_model.remote()
    loadData.remote("false")

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
