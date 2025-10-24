#!/bin/bash

echo "🚀 Iniciando Jarvis Municipal..."
echo ""

cd ~/municipal-assistant

# Para processos antigos se existirem
echo "🧹 Limpando processos antigos..."
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Inicia o backend
echo "📡 Iniciando Backend (porta 3011)..."
nohup node server.js > logs-backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend rodando (PID: $BACKEND_PID)"

# Aguarda 2 segundos
sleep 2

# Inicia o frontend
echo "🎨 Iniciando Frontend (porta 3010)..."
nohup npm run dev > logs-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend rodando (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Jarvis Municipal está rodando!"
echo "📊 Backend: http://localhost:3011"
echo "🌐 Frontend: http://10.50.30.168:3010"
echo ""
echo "📋 Para ver logs:"
echo "   Backend: tail -f ~/municipal-assistant/logs-backend.log"
echo "   Frontend: tail -f ~/municipal-assistant/logs-frontend.log"
echo ""
echo "🛑 Para parar: bash ~/municipal-assistant/stop.sh"
