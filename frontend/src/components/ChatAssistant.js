import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_URL = 'http://localhost:8000';

const ChatAssistant = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: '你好！我是你的时间管理助手。我可以帮你管理任务、安排时间、提供时间管理建议。有什么我可以帮你的吗？', sender: 'assistant' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [isStreamMode, setIsStreamMode] = useState(true); // 默认使用流式输出

  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
    fetchModels();

    return () => {
      // 清理EventSource连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // 清理Fetch请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data);
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const handleStreamResponse = async (userMessage) => {
    try {
      // 先添加用户消息
      setMessages(prev => [...prev, userMessage]);
      
      // 创建一个初始的助手消息（空的）
      const assistantMessageId = Date.now() + 1;
      setMessages(prev => [
        ...prev, 
        { 
          id: assistantMessageId, 
          text: '', 
          sender: 'assistant',
          loading: true
        }
      ]);

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 创建新的中止控制器
      abortControllerRef.current = new AbortController();

      // 使用/chat_stream接口获取流式响应
      const response = await fetch(`${API_URL}/chat_stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: userMessage.text,
          model: selectedModel
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP错误！状态码: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let receivedModel = '';
      let fullContent = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 解码字节流
        const text = decoder.decode(value);
        accumulatedText += text;
        
        // 处理SSE事件
        const events = accumulatedText.split("\n\n");
        accumulatedText = events.pop() || ''; // 最后一个可能不完整
        
        for (const event of events) {
          if (event.trim() === '') continue;
          
          // 解析事件数据
          const dataMatch = event.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          
          try {
            const data = JSON.parse(dataMatch[1]);
            
            // 处理模型信息
            if (data.model && !receivedModel) {
              receivedModel = data.model;
            }
            
            // 处理内容片段
            if (data.content) {
              fullContent += data.content;
              
              // 更新消息内容
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, text: fullContent, model: receivedModel, loading: true } 
                    : msg
                )
              );
            }
            
            // 处理完成事件
            if (data.done) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, loading: false, model: receivedModel } 
                    : msg
                )
              );
              setIsLoading(false);
              break;
            }
            
            // 处理错误
            if (data.error) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, text: `发生错误: ${data.error}`, loading: false } 
                    : msg
                )
              );
              setIsLoading(false);
              break;
            }
            
          } catch (err) {
            console.error('解析事件数据时出错:', err);
          }
        }
        
        // 滚动到底部以显示新消息
        scrollToBottom();
      }
      
    } catch (error) {
      console.error('处理流式响应时出错:', error);
      setMessages(prev => {
        // 找到最后一条消息
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.loading) {
          // 更新错误消息
          return prev.map(msg =>
            msg.id === lastMessage.id
              ? { ...msg, text: `连接错误: ${error.message}`, loading: false }
              : msg
          );
        }
        return prev;
      });
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleNormalResponse = async (userMessage) => {
    // 先添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage.text,
        model: selectedModel
      });

      const assistantMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: 'assistant',
        model: response.data.model
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('聊天请求失败:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: '抱歉，我遇到了一些问题。请稍后再试。' + 
              (error.response?.data?.detail ? `错误: ${error.response.data.detail}` : ''),
        sender: 'assistant'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user'
    };

    setNewMessage('');
    setIsLoading(true);

    if (isStreamMode) {
      await handleStreamResponse(userMessage);
    } else {
      await handleNormalResponse(userMessage);
    }
  };

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const toggleStreamMode = () => {
    setIsStreamMode(!isStreamMode);
  };

  // 渲染消息内容，对助手消息使用Markdown渲染
  const renderMessageContent = (message) => {
    if (message.sender === 'assistant') {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            components={{
              // 为各种元素添加样式
              h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-md font-bold my-1" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-sm font-bold my-1" {...props} />,
              p: ({node, ...props}) => <p className="mb-3" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3" {...props} />,
              table: ({node, ...props}) => <table className="w-full border-collapse mb-3" {...props} />,
              th: ({node, ...props}) => <th className="border border-gray-300 bg-gray-100 font-bold p-2" {...props} />,
              td: ({node, ...props}) => <td className="border border-gray-300 p-2" {...props} />,
              a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.text}
          </ReactMarkdown>
          {message.loading && (
            <span className="loading-cursor"></span>
          )}
        </div>
      );
    }
    return message.text;
  };

  return (
    <div className="chat-container">
      <div className="model-selector">
        <div className="flex justify-between items-center">
          <div>
            <label htmlFor="model-select">选择AI模型: </label>
            <select 
              id="model-select" 
              value={selectedModel} 
              onChange={handleModelChange}
              disabled={isLoading}
              className="mr-4"
            >
              {Object.entries(models).map(([modelId, description]) => (
                <option key={modelId} value={modelId}>
                  {modelId} - {description}
                </option>
              ))}
            </select>
          </div>
          <div className="stream-toggle">
            <label htmlFor="stream-mode" className="mr-2">流式输出: </label>
            <input
              type="checkbox"
              id="stream-mode"
              checked={isStreamMode}
              onChange={toggleStreamMode}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.sender}-message`}
          >
            {renderMessageContent(message)}
            {message.model && message.sender === 'assistant' && !message.loading && (
              <div className="message-model">使用模型: {message.model}</div>
            )}
          </div>
        ))}
        {isLoading && !messages.some(m => m.loading) && (
          <div className="message assistant-message">
            正在思考...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="输入你的问题..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !newMessage.trim()}
        >
          发送
        </button>
      </form>
    </div>
  );
};

export default ChatAssistant; 