#!/bin/bash

set -e

echo "🚀 Avvio stack di tracing locale con Jaeger..."

# Verifica che Docker sia in esecuzione
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker non è in esecuzione. Avvia Docker Desktop e riprova."
    exit 1
fi

# Ferma eventuali container esistenti
echo "🛑 Fermando container esistenti..."
docker-compose -f docker-compose.jaeger.yml down

# Avvia i servizi
echo "▶️ Avvio Jaeger e OpenTelemetry Collector..."
docker-compose -f docker-compose.jaeger.yml up -d

# Attendi che i servizi siano pronti
echo "⏳ Attendo che i servizi siano pronti..."
sleep 5

# Verifica stato
echo "🔍 Stato dei servizi:"
docker-compose -f docker-compose.jaeger.yml ps

echo ""
echo "✅ Stack di tracing pronto!"
echo ""
echo "🌐 Interfacce disponibili:"
echo "   📊 Jaeger UI:           http://localhost:16686"
echo "   📡 OTLP HTTP Collector: http://localhost:4320"
echo "   📡 OTLP gRPC Collector: http://localhost:4319"
echo ""
echo "🔧 Per testare:"
echo "   1. Avvia la tua app Electron"
echo "   2. Fai click su alcuni bottoni"
echo "   3. Vai su http://localhost:16686 per vedere i traces"
echo ""
echo "🛑 Per fermare tutto: docker-compose -f docker-compose.jaeger.yml down" 