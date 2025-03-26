from langchain_openai import OpenAIEmbeddings
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langchain import hub
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import CSVLoader
from langgraph.graph import MessagesState, StateGraph
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableMap
from langchain_core.documents import Document
from langchain_huggingface import ChatHuggingFace
from typing_extensions import List, TypedDict
import modal
import os

# Create image with dependencies
image = modal.Image.debian_slim().pip_install(
    "openai", "langchain", "langchain_community", "langchain_core",
    "langchain_huggingface", "langchain_openai", "langgraph", "langchain_chroma",
    "transformers", "accelerate"
)

app = modal.App("rag-modal-deployment", image=image)

vectorstore_volume = modal.Volume.from_name("gotquestions-storage", create_if_missing=True)

class State(MessagesState):
    context: List[Document] = []

@app.function(
    volumes={"/vectorstore": vectorstore_volume},
    secrets=[
        modal.Secret.from_name("openai-secret"),
        modal.Secret.from_name("langsmith-secret")
    ],
    timeout=6000
)
def loadData(forceUpload):
    from langchain.document_loaders import CSVLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.embeddings import OpenAIEmbeddings

    vectorstore_path = "/vectorstore"
    csv_path = "/vectorstore/gotquestions.csv"

    loader = CSVLoader(
        file_path=csv_path,
        encoding="utf8",
        csv_args={'delimiter': ',', 'quotechar': '"'},
        metadata_columns=["url", "question"]
    )
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=500)
    splits = text_splitter.split_documents(docs)

    if forceUpload == "true":
        print("Force upload: creating new vector store.")
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=OpenAIEmbeddings(model="text-embedding-3-large"),
            persist_directory=vectorstore_path
        )
    else:
        print("Loading existing vector store.")
        vectorstore = Chroma(
            persist_directory=vectorstore_path,
            embedding_function=OpenAIEmbeddings(model="text-embedding-3-large")
        )

        existing_urls = set()
        for doc in vectorstore.get()['metadatas']:
            if "url" in doc:
                existing_urls.add(doc["url"])

        new_splits = [doc for doc in splits if doc.metadata.get("url") not in existing_urls]
        print(f"Found {len(new_splits)} new documents to upload.")

        if new_splits:
            vectorstore.add_documents(new_splits)
        else:
            print("No new documents to add.")
    print("done")

@app.function(
    secrets=[
        modal.Secret.from_name("openai-secret"),
        modal.Secret.from_name("langsmith-secret")
    ],
    volumes={"/vectorstore": vectorstore_volume},
    timeout=6000
)
@modal.fastapi_endpoint(docs=True)
def getDataAndAnswerQuestion(question: str, forceUpload: str):
    from langgraph.graph import END
    from langgraph.prebuilt import ToolNode, tools_condition

    tools = ToolNode([retrieveInfoForQuery])
    graph_builder = StateGraph(State)
    graph_builder.add_node(query_or_respond)
    graph_builder.add_node(tools)
    graph_builder.add_node(generate)

    graph_builder.set_entry_point("query_or_respond")
    graph_builder.add_conditional_edges(
        "query_or_respond", tools_condition, {END: END, "tools": "tools"}
    )
    graph_builder.add_edge("tools", "generate")
    graph_builder.add_edge("generate", END)

    graph = graph_builder.compile()
    finalAnswer = graph.invoke({"messages": [{"role": "user", "content": question}], "context": []})

    sources_html = "".join(
        f'<a href="{doc.metadata["url"]}" target="_blank">{doc.metadata["question"]}</a><br>'
        for doc in finalAnswer["context"]
    )

    return {"content": finalAnswer["messages"][-1].content, "sources": sources_html}

@tool(response_format="content_and_artifact")
def retrieveInfoForQuery(query: str):
    """Retrieve information related to a query."""
    vectorstore_path = "/vectorstore"
    try:
        vectorStore = Chroma(
            persist_directory=vectorstore_path,
            embedding_function=OpenAIEmbeddings(model="text-embedding-3-large")
        )
    except Exception as e:
        print("Error loading vectorstore", e)

    if isinstance(vectorStore, Chroma):
        retrieved_docs = vectorStore.similarity_search(query, k=2)
    else:
        raise ValueError("Vectorstore did not initialize correctly.")

    print(retrieved_docs)

    serialized = "\n\n".join(
        (f"Source: {doc.metadata}\n" f"Content: {doc.page_content}")
        for doc in retrieved_docs
    )
    return serialized, retrieved_docs

def query_or_respond(state: MessagesState):
    """Generate tool call for retrieval or respond."""
    llm = ChatHuggingFace.from_model_id(
        id="deepseek-ai/deepseek-llm-7b-chat",
        task="text-generation",
        model_kwargs={"temperature": 0.7, "max_new_tokens": 512}
    )
    llm_with_tools = llm.bind_tools([retrieveInfoForQuery])
    response = llm_with_tools.invoke(state["messages"])
    print(response)
    return {"messages": [response]}

def generate(state: State):
    """Generate answer."""
    tool_messages = [
        message for message in reversed(state["messages"])
        if message.type == "tool"
    ][::-1]
    print(tool_messages)

    docs_content = "\n\n".join(doc.content for doc in tool_messages)
    system_message_content = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Keep the answer concise.\n\n"
        f"{docs_content}"
    )

    conversation_messages = [
        message for message in state["messages"]
        if message.type in ("human", "system") or (message.type == "ai" and not message.tool_calls)
    ]

    prompt = [SystemMessage(system_message_content)] + conversation_messages

    llm = ChatHuggingFace.from_model_id(
        id="deepseek-ai/deepseek-llm-7b-chat",
        task="text-generation",
        model_kwargs={"temperature": 0.7, "max_new_tokens": 512}
    )
    response = llm.invoke(prompt)

    # Deduplicate by URL
    seen_urls = set()
    unique_context = []
    for tool_message in tool_messages:
        if tool_message.artifact:
            for doc in tool_message.artifact:
                url = doc.metadata.get("url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    unique_context.append(doc)

    return {"messages": [response], "context": unique_context}

@app.local_entrypoint()
def main():
    loadData.remote("false")
