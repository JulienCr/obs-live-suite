# 🚀 Démarrage de l'application

## Problème actuel: Route 404

La route `/api/obs/status` retourne 404 car Next.js doit être redémarré après les modifications.

## Solution

```bash
# 1. Nettoyer le cache Next.js
Remove-Item -Path ".next" -Recurse -Force

# 2. Démarrer l'environnement complet
pnpm dev
```

## Vérification

Une fois démarré, les 3 serveurs doivent être actifs:

```bash
# Vérifier les ports
netstat -ano | Select-String "3000|3002|3003"
```

Vous devriez voir:
- ✅ Port 3000: Next.js Frontend
- ✅ Port 3003: Backend WebSocket
- ✅ Port 3002: Backend HTTP API

## Test de la route

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/obs/status" -UseBasicParsing

# Ou dans le navigateur
http://localhost:3000/api/obs/status
```

Devrait retourner le statut OBS (pas un 404).

## Architecture

```
Browser → http://localhost:3000/api/obs/status (Next.js)
              ↓ proxy
          http://localhost:3002/api/obs/status (Backend)
              ↓ OBS connection
          ws://localhost:4455 (OBS Studio)
```

## Si toujours 404

1. **Vérifier que le fichier existe:**
   ```
   app/api/obs/status/route.ts
   ```

2. **Vérifier les logs Next.js:**
   Chercher "Compiled /api/obs/status" dans la sortie

3. **Redémarrer complètement:**
   ```bash
   # Tuer tous les processus Node
   Get-Process -Name "node" | Stop-Process -Force
   
   # Nettoyer
   Remove-Item -Path ".next" -Recurse -Force
   
   # Redémarrer
   pnpm dev
   ```

## Variables d'environnement

Assurez-vous que `.env` contient:
```env
BACKEND_URL=http://localhost:3002
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=votre_mot_de_passe
```

