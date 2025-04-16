# DeepSeek驱动的时间管理Web应用

这是一个使用React和Python FastAPI构建的时间管理Web应用，集成了DeepSeek AI功能，帮助用户更好地管理时间和任务。

## 功能

1. 任务管理：添加、查看、完成和删除任务
2. AI助手：提供时间管理建议和帮助
   - 支持多种DeepSeek模型选择
   - DeepSeek-V3 (deepseek-chat): 通用对话模型
   - DeepSeek-R1 (deepseek-reasoner): 专为复杂推理优化的模型
   - 支持Markdown格式渲染，包括代码高亮显示

## 技术栈

- 前端：React, Axios, React Icons, React Markdown
- 后端：Python, FastAPI, DeepSeek API

## 项目结构

```
time-management/
├── backend/
│   ├── main_openai_sdk.py # FastAPI主应用 (使用OpenAI SDK调用)
│   └── run_sdk.py         # 启动脚本 (使用OpenAI SDK)
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── TaskList.js
│       │   └── ChatAssistant.js
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       └── index.css
├── .env          # 环境变量示例文件
└── requirements.txt       # Python依赖
```

## 安装与运行

### 后端

1. 安装Python依赖：
   ```
   pip install -r requirements.txt
   ```

2. 创建`.env`文件并设置DeepSeek API密钥：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```
   - 注意：DeepSeek API密钥通常以`sk-`开头
   - 可以在 https://platform.deepseek.com/api_keys 申请API密钥

3. 选择启动方式：

   使用OpenAI SDK调用API (推荐)：
   ```
   cd backend
   python run_sdk.py
   ```

### 前端

1. 安装Node.js依赖：
   ```
   cd frontend
   npm install
   npm install react-markdown react-syntax-highlighter --save
   ```

2. 启动前端开发服务器：
   ```
   npm start
   npm run build
   npm install -g serve
   serve -s build
   ```

## DeepSeek API调用说明

本项目提供了两种调用DeepSeek API的方式：

1. **使用requests库直接调用**：通过直接发送HTTP请求到DeepSeek API端点
2. **使用OpenAI SDK调用**：利用OpenAI兼容性接口，这是DeepSeek官方推荐的方式

DeepSeek提供了OpenAI兼容的API，因此可以直接使用OpenAI的SDK来调用DeepSeek的服务。如果你遇到直接调用的问题，可以尝试使用OpenAI SDK方式。

### DeepSeek模型

本应用支持以下DeepSeek模型：

1. **DeepSeek-V3** (deepseek-chat): 通用对话模型，适合日常对话和一般问题咨询
2. **DeepSeek-R1** (deepseek-reasoner): 推理优化模型，适合复杂逻辑推理和分析问题

用户可以在聊天界面选择想要使用的模型。不同模型可能在回答风格和擅长的问题类型上有所不同。

### Markdown支持

本应用支持在聊天界面中渲染Markdown格式的内容，包括：

- 标题（H1-H6）
- 列表（有序、无序）
- 链接和图片
- 代码块（带语法高亮）
- 表格
- 引用
- 粗体、斜体等文本格式

这使得AI助手可以提供更加丰富的格式化输出，可以尝试让AI生成带有Markdown格式的回答，例如:

```
请使用Markdown格式提供今日的时间管理计划，包含一个表格和一些代码示例
```

### 常见问题解决

1. 如果遇到API调用错误，请检查：
   - API密钥是否正确（应以`sk-`开头）
   - 是否选择了正确的模型名称（如"deepseek-chat"或"deepseek-reasoner"）
   - 请求参数格式是否正确

2. 如果出现超时错误，可能是网络问题或API响应慢，可以调整timeout参数

3. 如果Markdown渲染有问题：
   - 确保已安装`react-markdown`和`react-syntax-highlighter`依赖
   - 检查AI返回的内容是否符合Markdown语法格式

## 使用方法

1. 访问 http://localhost:3000 打开应用
2. 使用"任务管理"选项卡添加和管理任务
3. 使用"聊天助手"选项卡与AI助手交流获取时间管理建议
   - 可以从下拉菜单选择想要使用的AI模型
   - 不同模型可能会给出不同风格的回答
   - 可以尝试让AI使用Markdown格式返回内容，如表格、代码示例等 