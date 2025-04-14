import React from 'react';
import { FaTrash } from 'react-icons/fa';

const TaskList = ({ tasks, onTaskUpdate, onTaskDelete }) => {
  const handleCheckboxChange = (task) => {
    onTaskUpdate({
      ...task,
      completed: !task.completed
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="task-list-container">
      <h2>我的任务</h2>
      {tasks.length === 0 ? (
        <p>暂无任务，开始添加吧！</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li 
              key={task.id} 
              className={`task-item ${task.completed ? 'task-completed' : ''}`}
            >
              <input 
                type="checkbox" 
                className="task-checkbox"
                checked={task.completed}
                onChange={() => handleCheckboxChange(task)}
              />
              <div className="task-content">
                <div className="task-title">{task.title}</div>
                {task.description && (
                  <div className="task-description">{task.description}</div>
                )}
                {task.due_date && (
                  <div className="task-due-date">截止日期: {formatDate(task.due_date)}</div>
                )}
              </div>
              <div className="task-actions">
                <button 
                  className="delete-btn"
                  onClick={() => onTaskDelete(task.id)}
                  title="删除任务"
                >
                  <FaTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList; 