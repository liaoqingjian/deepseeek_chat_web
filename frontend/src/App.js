import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import ChatAssistant from './components/ChatAssistant';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    completed: false
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('获取任务失败:', error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        completed: false
      });
      fetchTasks();
    } catch (error) {
      console.error('添加任务失败:', error);
    }
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      await axios.put(`${API_URL}/tasks/${updatedTask.id}`, updatedTask);
      fetchTasks();
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({
      ...newTask,
      [name]: value
    });
  };

  return (
    <div className="app-container">
      <header>
        <h1>时间管理助手</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'tasks' ? 'active' : ''} 
            onClick={() => setActiveTab('tasks')}
          >
            任务管理
          </button>
          <button 
            className={activeTab === 'chat' ? 'active' : ''} 
            onClick={() => setActiveTab('chat')}
          >
            聊天助手
          </button>
        </div>
      </header>

      <main>
        <div style={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
          <div className="tasks-container">
            <form className="task-form" onSubmit={handleAddTask}>
              <input 
                type="text" 
                name="title" 
                placeholder="任务标题" 
                value={newTask.title} 
                onChange={handleInputChange} 
                required 
              />
              <input 
                type="text" 
                name="description" 
                placeholder="任务描述（可选）" 
                value={newTask.description || ''} 
                onChange={handleInputChange} 
              />
              <input 
                type="date" 
                name="due_date" 
                placeholder="截止日期" 
                value={newTask.due_date || ''} 
                onChange={handleInputChange} 
              />
              <button type="submit">添加任务</button>
            </form>

            <TaskList 
              tasks={tasks} 
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        </div>
        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
          <ChatAssistant />
        </div>
      </main>
    </div>
  );
}

export default App; 