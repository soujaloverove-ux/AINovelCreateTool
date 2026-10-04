#!/bin/bash

# QoderNovel 一键停止脚本

echo "🛑 停止 QoderNovel..."

# 停止 Ollama
if [ -f .pids/ollama.pid ]; then
  OLLAMA_PID=$(cat .pids/ollama.pid)
  if kill -0 $OLLAMA_PID 2>/dev/null; then
    echo "停止 Ollama 服务 (PID: $OLLAMA_PID)..."
    kill $OLLAMA_PID
    for i in {1..10}; do
      if ! kill -0 $OLLAMA_PID 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    if kill -0 $OLLAMA_PID 2>/dev/null; then
      echo "强制停止 Ollama 服务..."
      kill -9 $OLLAMA_PID
    fi
  fi
  rm .pids/ollama.pid
else
  echo "Ollama 服务未运行或 PID 文件不存在"
fi

# 停止后端
if [ -f .pids/server.pid ]; then
  SERVER_PID=$(cat .pids/server.pid)
  if kill -0 $SERVER_PID 2>/dev/null; then
    echo "停止后端服务 (PID: $SERVER_PID)..."
    kill $SERVER_PID
    # 等待进程结束
    for i in {1..10}; do
      if ! kill -0 $SERVER_PID 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    # 如果还在运行，强制杀死
    if kill -0 $SERVER_PID 2>/dev/null; then
      echo "强制停止后端服务..."
      kill -9 $SERVER_PID
    fi
  fi
  rm .pids/server.pid
else
  echo "后端服务未运行或 PID 文件不存在"
fi

# 停止前端
if [ -f .pids/web.pid ]; then
  WEB_PID=$(cat .pids/web.pid)
  if kill -0 $WEB_PID 2>/dev/null; then
    echo "停止前端服务 (PID: $WEB_PID)..."
    kill $WEB_PID
    # 等待进程结束
    for i in {1..10}; do
      if ! kill -0 $WEB_PID 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    # 如果还在运行，强制杀死
    if kill -0 $WEB_PID 2>/dev/null; then
      echo "强制停止前端服务..."
      kill -9 $WEB_PID
    fi
  fi
  rm .pids/web.pid
else
  echo "前端服务未运行或 PID 文件不存在"
fi

# 清理可能残留的进程
echo "清理残留进程..."
pkill -f "nest start" 2>/dev/null
pkill -f "vite" 2>/dev/null
# 注意：不自动停止 Ollama 系统服务，只停止我们启动的实例

# 清理 PID 目录
if [ -d .pids ] && [ -z "$(ls -A .pids)" ]; then
  rmdir .pids
fi

echo "✅ QoderNovel 已停止"
