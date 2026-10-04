#!/bin/bash

# QoderNovel 一键启动脚本

echo "🚀 启动 QoderNovel..."

mkdir -p logs .pids

# 启动 Ollama（如果使用本地模型）
if ! curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
  echo "🤖 启动 Ollama 服务..."
  /Applications/Ollama.app/Contents/Resources/ollama serve > logs/ollama.log 2>&1 &
  echo $! > .pids/ollama.pid
  sleep 3
else
  echo "✅ Ollama 已在运行"
fi

# 启动后端
if lsof -i :3000 -t >/dev/null 2>&1; then
  echo "✅ 后端已在运行 (端口 3000)"
else
  echo " 启动后端服务 (端口 3000)..."
  cd apps/server
  npm run dev > ../../logs/server.log 2>&1 &
  echo $! > ../../.pids/server.pid
  cd ../..
  sleep 3
fi

# 启动前端
if lsof -i :5173 -t >/dev/null 2>&1; then
  echo "✅ 前端已在运行 (端口 5173)"
else
  echo "🎨 启动前端服务 (端口 5173)..."
  cd apps/web
  npm run dev > ../../logs/web.log 2>&1 &
  echo $! > ../../.pids/web.pid
  cd ../..
fi

echo ""
echo "✅ QoderNovel 已就绪"
echo "   Ollama: http://localhost:11434"
echo "   后端: http://localhost:3000"
echo "   前端: http://localhost:5173"
echo ""
echo "日志文件:"
echo "   Ollama: logs/ollama.log"
echo "   后端: logs/server.log"
echo "   前端: logs/web.log"
echo ""
echo "停止服务: ./stop.sh"
