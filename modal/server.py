import modal

image = (
    modal.Image.from_registry("python:3.10-slim")
    .apt_install("git")
    .pip_install(
        "torch==2.5.1+cu121",
        extra_options=["--extra-index-url=https://download.pytorch.org/whl/cu121"]
    )
    .pip_install(
        "vllm==0.3.2",
        "transformers",
        "accelerate",
        "uvicorn",
        "fastapi"
    )
)

app = modal.App("vllm-deepseek", image=image)

@app.function(gpu="A100", timeout=3600)
@modal.web_server(port=8000)
def serve():
    import subprocess
    subprocess.run([
        "python3", "-m", "vllm.entrypoints.openai.api_server",
        "--model", "mistralai/Mistral-7B-Instruct-v0.2",
        "--tokenizer", "deepseek-ai/deepseek-llm-7b-chat",
        "--tensor-parallel-size", "1",
        "--port", "8000",
        "--host", "0.0.0.0"
    ])
