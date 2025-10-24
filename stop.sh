#!/bin/bash

echo "🛑 Parando Jarvis Municipal..."

pkill -f "node server.js"
pkill -f "vite"

echo "✅ Serviços parados!"
