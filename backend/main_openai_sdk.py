from fastapi import FastAPI, HTTPException, Depends, Body, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime
import json
from openai import OpenAI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置为前端的实际URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置OpenAI客户端用于DeepSeek调用 - 更新为官方推荐的初始化方式
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"  # 根据官方文档移除"/v1"
)

# DeepSeek可用模型
DEEPSEEK_MODELS = {
    "deepseek-chat": "DeepSeek-V3模型，通用对话模型",
    "deepseek-reasoner": "DeepSeek-R1推理模型，擅长复杂推理"
}

# 数据模型
class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class ChatMessage(BaseModel):
    message: str
    model: Optional[str] = "deepseek-chat"  # 默认使用DeepSeek-V3模型

# 简单的数据存储
tasks = []
task_id_counter = 1

# API路由
@app.get("/")
def read_root():
    return {"message": "欢迎使用时间管理应用"}

@app.get("/models")
def get_models():
    """获取可用的DeepSeek模型列表"""
    return DEEPSEEK_MODELS

@app.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks

@app.post("/tasks", response_model=Task)
def create_task(task: Task):
    global task_id_counter
    task.id = task_id_counter
    tasks.append(task)
    task_id_counter += 1
    return task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task: Task):
    for i, t in enumerate(tasks):
        if t.id == task_id:
            task.id = task_id
            tasks[i] = task
            return task
    raise HTTPException(status_code=404, detail="任务未找到")

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    for i, task in enumerate(tasks):
        if task.id == task_id:
            del tasks[i]
            return {"message": "任务已删除"}
    raise HTTPException(status_code=404, detail="任务未找到")

def get_completion_stream(message: str, model: str = "deepseek-chat"):
    """生成DeepSeek流式响应的生成器函数"""
    try:
        # 验证模型是否存在
        if model not in DEEPSEEK_MODELS:
            yield f"data: {{\"error\": \"无效的模型: {model}, 可用模型: {list(DEEPSEEK_MODELS.keys())}\" }}\n\n"
            return

        # 使用OpenAI SDK调用DeepSeek API获取流式响应
        print(f"发送消息到DeepSeek（流式）: {message}")
        print(f"使用模型: {model}")
        
        # 创建流式响应
        response_stream = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "你是一个时间管理专家助手，请帮助用户管理时间和任务。"},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=True  # 启用流式输出
        )
        
        # 发送模型信息作为第一个事件
        yield f"data: {{\"model\": \"{model}\"}}\n\n"
        
        # 逐个发送响应token
        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # 格式化为SSE事件
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # 发送完成事件
        yield f"data: {{\"done\": true}}\n\n"
            
    except Exception as e:
        error_message = str(e)
        print(f"流式调用DeepSeek API错误: {error_message}")
        yield f"data: {{\"error\": \"{error_message}\" }}\n\n"

@app.post("/chat")
def chat_with_deepseek(chat_message: ChatMessage):
    try:
        # 验证模型是否存在
        if chat_message.model not in DEEPSEEK_MODELS:
            raise HTTPException(status_code=400, detail=f"无效的模型: {chat_message.model}, 可用模型: {list(DEEPSEEK_MODELS.keys())}")
            
        # 使用OpenAI SDK调用DeepSeek API - 按照官方示例更新
        print(f"发送消息到DeepSeek: {chat_message.message}")
        print(f"使用模型: {chat_message.model}")
        
        # 使用官方文档中的格式
        response = client.chat.completions.create(
            model=chat_message.model,  # 使用用户选择的模型
            messages=[
                {"role": "system", "content": "你是一个时间管理专家助手，请帮助用户管理时间和任务。"},
                {"role": "user", "content": chat_message.message}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=True
        )
        
        # 打印完整响应以便调试
        print(f"DeepSeek响应: {response}")
        
        # 返回生成的消息内容
        return {"response": response.choices[0].message.content, "model": chat_message.model}
        
    except Exception as e:
        print(f"调用DeepSeek API错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"与DeepSeek通信错误: {str(e)}")

@app.post("/chat_stream")
async def chat_stream_post(chat_message: ChatMessage):
    """流式聊天接口 - POST方法"""
    return StreamingResponse(
        get_completion_stream(chat_message.message, chat_message.model),
        media_type="text/event-stream"
    )

@app.get("/chat_stream")
async def chat_stream_get(message: str = Query(None), model: str = Query("deepseek-chat")):
    """流式聊天接口 - GET方法"""
    if not message:
        return {"error": "message 参数是必需的"}
    
    return StreamingResponse(
        get_completion_stream(message, model),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 