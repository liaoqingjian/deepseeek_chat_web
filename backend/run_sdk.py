import uvicorn

if __name__ == "__main__":
    print("使用OpenAI SDK调用DeepSeek API启动服务...")
    uvicorn.run("main_openai_sdk:app", host="0.0.0.0", port=8000, reload=True) 