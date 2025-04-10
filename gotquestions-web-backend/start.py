import time
import traceback
from fastapi.responses import JSONResponse
from langchain_core.messages import AIMessage
from langchain_openai import OpenAIEmbeddings

from langchain_core.messages import SystemMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import CSVLoader
#from langchain_chroma import Chroma
from langchain_core.documents import Document


#import modal
import os
#from functools import lru_cache
import weaviate
from weaviate.classes.init import Auth
#import os

# Recommended: save sensitive data as environment variables




#vectorstore_volume = modal.Volume.from_name("gotquestions-storage", create_if_missing=True)
#hf_cache = modal.Volume.from_name("hf-cache", create_if_missing=True)
# At the top of your file
#LLM_PIPELINE = None  # Global cache for current container
#@app.function(secrets=[modal.Secret.from_name("huggingface-secret")])

        
#from fastapi import Request, Response
from fastapi import FastAPI, Request, Response, UploadFile, File, Form, HTTPException
app=FastAPI()        



from speech import router as speech_router
app.include_router(speech_router, prefix="/speech", tags=["speech"])
@app.get("/sources")
    
def getSources(request:Request):
    question=request.query_params.get("question")
    #check for api key
    api_key=os.environ["API_KEY"]
    req_api_key=request.headers.get("x-api-key")
    if api_key!=req_api_key:
        return Response("",media_type="text/plain", status_code=401)
    #retrieved_docs = query_vectorstore.remote(question)
    
    openai_key = os.getenv("OPENAI_API_KEY")
    headers = {
        "X-OpenAI-Api-Key": openai_key,
    }
    weaviate_url = os.getenv("WEAVIATE_URL")
    weaviate_key = os.getenv("WEAVIATE_API_KEY")
    try:
        client = weaviate.connect_to_weaviate_cloud(
            cluster_url=weaviate_url,                       # `weaviate_url`: your Weaviate URL
            auth_credentials=Auth.api_key(weaviate_key),      # `weaviate_key`: your Weaviate API key
            headers=headers
        )

        # Work with Weaviate
        collection=client.collections.get("questions")

        retrieved_docs=collection.query.near_text(query=question,certainty=0.7).objects
        #client.close()

        if not retrieved_docs:
            return {"sources": []}

        returned_docs=[]
        seen_urls = set()
        

        for doc in retrieved_docs:
            url = doc.properties.get("url")
            question_text = doc.properties.get("question")
            if url and url not in seen_urls:
                seen_urls.add(url)
                #sources_html += f'<a href="{url}" target="_blank">{question_text}</a><br>'
                returned_docs.append({"url": url, "question": question_text})

        return {"sources": returned_docs}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        client.close()
@app.post("/ask")
    
async def ask(request: Request):
    import os
    
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage

    # Auth
    api_key = os.environ["API_KEY"]
    req_api_key = request.headers.get("x-api-key")
    if api_key != req_api_key:
        return Response("Unauthorized", status_code=401)

    # Parse question
    body = await request.json()
    question = body.get("question")
    if not question:
        return JSONResponse({"error": "Missing 'question'"}, status_code=400)

    # Retrieve docs
    openai_key = os.getenv("OPENAI_API_KEY")
    headers = {
        "X-OpenAI-Api-Key": openai_key,
    }
    weaviate_url = os.getenv("WEAVIATE_URL")
    weaviate_key = os.getenv("WEAVIATE_API_KEY")
    
    try:
        client = weaviate.connect_to_weaviate_cloud(cluster_url=weaviate_url, auth_credentials=Auth.api_key(weaviate_key), headers=headers)
        collection = client.collections.get("questions")
        retrieved_docs = collection.query.near_text(query=question,certainty=0.7 ).objects

        if not retrieved_docs:
            return JSONResponse({"answer": "Sorry, I couldn’t find any relevant information to answer your question."})

        # Prepare context and prompt
        context_str = "\n\n".join(f"Source: {doc.properties.get('question')}\nContent: {doc.properties.get('answer')}" for doc in retrieved_docs)
        system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question. "
            "If you don't know the answer, say that you don't know. "
            
            "\n\n"
            f"{context_str}"
        )

        prompt = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=question)
        ]

        # Run LLM without streaming
        llm = ChatOpenAI(streaming=False)
        response = llm.invoke(prompt)

        return JSONResponse({"answer": response.content})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        client.close()






    
