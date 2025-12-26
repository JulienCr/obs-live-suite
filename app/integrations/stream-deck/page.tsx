"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, Code, Download, ExternalLink, Info, Sparkles, Terminal } from "lucide-react";

const pluginActions = [
  {
    name: "Show Guest Lower Third",
    description: "Affiche le lower third d'un invité avec avatar dynamique",
    features: ["Dropdown dynamique des invités", "Affichage avatar sur le bouton"],
  },
  {
    name: "Custom Lower Third",
    description: "Lower third personnalisé avec titre et sous-titre",
    features: ["Configuration titre/sous-titre", "Choix de position (gauche/droite)"],
  },
  {
    name: "Hide Lower Third",
    description: "Cache le lower third actif",
    features: ["Action simple sans configuration"],
  },
  {
    name: "Start Countdown",
    description: "Démarre un countdown avec affichage live du timer",
    features: ["Configuration durée", "Affichage temps réel sur bouton", "Presets rapides"],
  },
  {
    name: "Control Countdown",
    description: "Pause, reprend ou reset le countdown",
    features: ["3 modes: Pause, Resume, Reset", "Synchronisation état"],
  },
  {
    name: "Add Time to Countdown",
    description: "Ajoute du temps au countdown actif",
    features: ["Incréments configurables", "Feedback visuel"],
  },
  {
    name: "Show Poster",
    description: "Affiche une affiche/image depuis la bibliothèque",
    features: ["Dropdown dynamique des posters", "Support images/vidéos"],
  },
  {
    name: "Control Poster",
    description: "Contrôle l'affichage poster (hide/next/previous)",
    features: ["3 modes de contrôle", "Navigation dans la playlist"],
  },
  {
    name: "OBS Send Action",
    description: "Envoie des commandes WebSocket directes à OBS",
    features: ["Commandes personnalisées", "Intégration OBS avancée"],
  },
  {
    name: "DSK Set Scene",
    description: "Downstream Keyer avec toggle de scène",
    features: ["Toggle état scène", "Feedback visuel état"],
  },
];

const apiEndpoints = [
  {
    category: "Lower Third",
    endpoints: [
      { method: "POST", path: "/api/actions/lower/guest/{id}", description: "Afficher invité par ID" },
      { method: "POST", path: "/api/actions/lower/show", description: "Lower third personnalisé" },
      { method: "POST", path: "/api/actions/lower/hide", description: "Cacher lower third" },
    ],
  },
  {
    category: "Countdown",
    endpoints: [
      { method: "POST", path: "/api/actions/countdown/start", description: "Démarrer countdown" },
      { method: "POST", path: "/api/actions/countdown/pause", description: "Pause countdown" },
      { method: "POST", path: "/api/actions/countdown/reset", description: "Reset countdown" },
    ],
  },
  {
    category: "Poster",
    endpoints: [
      { method: "POST", path: "/api/actions/poster/show/{id}", description: "Afficher poster par ID" },
      { method: "POST", path: "/api/actions/poster/hide", description: "Cacher poster" },
      { method: "POST", path: "/api/actions/poster/next", description: "Poster suivant" },
      { method: "POST", path: "/api/actions/poster/previous", description: "Poster précédent" },
    ],
  },
];

export default function StreamDeckPage() {
  const handleGenerateIds = async () => {
    // Placeholder - could trigger actual script or show instructions
    alert("Run: pnpm streamdeck:ids\n\nCette commande liste tous les IDs d'invités et posters avec leurs URLs prêtes à copier dans Stream Deck.");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='2' y='2' width='20' height='20' rx='2'/%3E%3Cpath d='M8 8h4v4H8zM8 14h4v4H8zM14 8h4v4h-4z'/%3E%3C/svg%3E"
              alt="Stream Deck"
              className="w-6 h-6"
            />
            Stream Deck Integration
          </h1>
          <p className="text-muted-foreground text-sm">
            Contrôlez OBS Live Suite depuis votre Stream Deck avec le plugin natif ou l'API HTTP.
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="plugin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plugin">
              <Sparkles className="w-4 h-4 mr-2" />
              Plugin Natif
            </TabsTrigger>
            <TabsTrigger value="api">
              <Code className="w-4 h-4 mr-2" />
              HTTP API
            </TabsTrigger>
            <TabsTrigger value="docs">
              <BookOpen className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          {/* Plugin Natif Tab */}
          <TabsContent value="plugin" className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Recommandé pour une expérience complète</AlertTitle>
              <AlertDescription>
                Le plugin natif offre des dropdowns dynamiques, affichage temps réel des countdowns, avatars invités, et auto-reconnect WebSocket.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Installation</CardTitle>
                <CardDescription>Installez le plugin depuis le répertoire local</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1">
                  <div>$ cd streamdeck-plugin/obslive-suite</div>
                  <div>$ npm install</div>
                  <div>$ npm run build</div>
                  <div>$ streamdeck link com.julien-cruau.obslive-suite</div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Download .streamDeckPlugin
                    <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("file://streamdeck-plugin/obslive-suite/", "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Plugin Folder
                  </Button>
                </div>

                <Alert variant="default" className="text-xs">
                  <Info className="h-3 w-3" />
                  <AlertDescription>
                    <strong>Requirements:</strong> macOS 12+, Windows 10+, Stream Deck Software 6.5+
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">10 Actions Disponibles</CardTitle>
                <CardDescription>Contrôles complets pour lower third, countdown, poster et OBS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pluginActions.map((action, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-2">
                      <div className="font-semibold text-sm">{action.name}</div>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                      <div className="space-y-1">
                        {action.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-primary">•</span>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HTTP API Tab */}
          <TabsContent value="api" className="space-y-4">
            <Alert>
              <Code className="h-4 w-4" />
              <AlertTitle>Alternative Simple</AlertTitle>
              <AlertDescription>
                Utilisez l'action "Website" de Stream Deck pour déclencher des actions HTTP. Idéal pour setups simples ou tests.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>Ajoutez l'action "Website" dans Stream Deck et configurez les URLs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center">1</Badge>
                    <span>Faites glisser l'action "Website" sur un bouton Stream Deck</span>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center">2</Badge>
                    <span>Collez une URL d'endpoint ci-dessous</span>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center">3</Badge>
                    <span>Utilisez <code className="px-1 bg-muted rounded text-xs">pnpm streamdeck:ids</code> pour obtenir les IDs</span>
                  </li>
                </ol>

                <Button size="sm" variant="outline" onClick={handleGenerateIds}>
                  <Terminal className="w-4 h-4 mr-2" />
                  Generate Stream Deck URLs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Endpoints</CardTitle>
                <CardDescription>Endpoints HTTP disponibles (port 3000)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiEndpoints.map((category, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="font-semibold text-sm">{category.category}</h3>
                    <div className="space-y-1">
                      {category.endpoints.map((endpoint, eIdx) => (
                        <div key={eIdx} className="flex items-center gap-2 text-xs p-2 bg-muted rounded">
                          <Badge variant="secondary" className="text-xs font-mono">{endpoint.method}</Badge>
                          <code className="flex-1">{endpoint.path}</code>
                          <span className="text-muted-foreground">{endpoint.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documentation Complète</CardTitle>
                <CardDescription>Guides détaillés et références techniques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("/docs/STREAM-DECK-PLUGIN.md", "_blank")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Plugin Natif - Documentation complète
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("/docs/STREAM-DECK-SETUP.md", "_blank")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  HTTP API - Guide de setup
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fonctionnalités v1.1.0</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">NEW</Badge>
                  <span>Affichage avatars invités sur boutons Stream Deck</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">NEW</Badge>
                  <span>Fallback vers initiales quand pas d'avatar</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Countdown avec affichage temps réel WebSocket</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Dropdowns dynamiques guests/posters depuis API</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Auto-reconnect WebSocket intelligent</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Troubleshooting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Le plugin n'apparaît pas:</strong> Vérifiez que Stream Deck Software est fermé pendant l'installation.</p>
                <p><strong>Actions ne fonctionnent pas:</strong> Vérifiez que OBS Live Suite backend et WebSocket hub (port 3003) sont actifs.</p>
                <p><strong>Dropdowns vides:</strong> Assurez-vous d'avoir créé des invités/posters dans l'interface Assets.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
