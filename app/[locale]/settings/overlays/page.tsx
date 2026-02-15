"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Info, MonitorPlay } from "lucide-react";
import { APP_URL } from "@/lib/config/urls";
import { OverlaySettings } from "@/components/settings/OverlaySettings";

interface Overlay {
  id: string;
  title: string;
  path: string;
  type: string;
  description: string;
  features: string[];
}

const overlays: Overlay[] = [
  {
    id: "lower-third",
    title: "Lower Third",
    path: "/overlays/lower-third",
    type: "Lower Third",
    description: "Bannières nom/titre pour invités ou sujets avec avatars et animations personnalisables",
    features: [
      "Avatars et logos personnalisés",
      "Positionnement gauche ou droite",
      "Animations configurables (flip, slide, etc.)",
      "Support des thèmes (couleurs, fonts, templates)",
    ],
  },
  {
    id: "countdown",
    title: "Countdown",
    path: "/overlays/countdown",
    type: "Countdown",
    description: "Timers visuels pour pauses, segments ou activités limitées dans le temps",
    features: [
      "3 styles visuels: Bold (center), Corner, Banner (top)",
      "Formats: mm:ss, hh:mm:ss, secondes",
      "Contrôles start/pause/reset",
      "Positionnement et échelle personnalisables",
    ],
  },
  {
    id: "poster",
    title: "Poster",
    path: "/overlays/poster",
    type: "Media",
    description: "Affiches, images ou vidéos positionnées sur le côté de l'écran",
    features: [
      "Support images, vidéos, YouTube embeds",
      "Positionnement gauche/droite avec offset",
      "Transitions: fade, slide, cut, blur-sm",
      "Préservation ratio d'aspect",
    ],
  },
  {
    id: "poster-bigpicture",
    title: "Poster Big Picture",
    path: "/overlays/poster-bigpicture",
    type: "Media",
    description: "Affichage plein écran centré pour images et vidéos (alternative au poster positionné)",
    features: [
      "Support images, vidéos, YouTube embeds",
      "Layout centré plein écran",
      "Effets de transition: fade, slide, cut, blur-sm",
      "Contrôles de lecture vidéo",
    ],
  },
  {
    id: "quiz",
    title: "Quiz",
    path: "/overlays/quiz",
    type: "Quiz",
    description: "Quiz interactif avec 4 modes de jeu et scoreboard live",
    features: [
      "QCM Texte: barres animées avec pourcentages",
      "QCM Image: grille 2×2 avec overlays de votes",
      "Zoom Reveal: dézoom progressif d'image mystère",
      "Question Ouverte: réponses et scoring host",
      "Scoreboard avec avatars joueurs",
      "Timer et annonces de buzzers",
    ],
  },
  {
    id: "composite",
    title: "Composite",
    path: "/overlays/composite",
    type: "Composite",
    description: "Overlay tout-en-un combinant Lower Third, Countdown et Poster en une seule source OBS",
    features: [
      "Une seule source browser pour 3 overlays",
      "Rendu en couches (Poster → Lower Third → Countdown)",
      "Connexions WebSocket indépendantes",
      "Etats de visibilité séparés",
    ],
  },
  {
    id: "test",
    title: "Test",
    path: "/overlays/test",
    type: "Debug",
    description: "Page diagnostic pour vérifier la connectivité OBS browser source",
    features: [
      "Fond gradient coloré (non transparent)",
      "Message de confirmation de chargement",
      "Utile pour troubleshooting OBS",
    ],
  },
];

const typeColors: Record<string, string> = {
  "Lower Third": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Countdown": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Media": "bg-green-500/10 text-green-500 border-green-500/20",
  "Quiz": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Composite": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Debug": "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function OverlaysPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getFullUrl = (path: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.host}${path}`;
    }
    return `${APP_URL}${path}`;
  };

  const copyToClipboard = async (id: string, path: string) => {
    const url = getFullUrl(path);

    try {
      // Try modern clipboard API (requires secure context)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (HTTP on LAN)
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <MonitorPlay className="w-6 h-6" />
          OBS Overlays
        </h1>
        <p className="text-muted-foreground text-sm">
          Browser sources disponibles pour OBS Studio. Copiez les URLs ci-dessous pour configurer vos sources.
        </p>
      </div>

      {/* Overlay Timeout Settings */}
      <OverlaySettings />

      <Separator className="my-6" />

      {/* OBS Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuration OBS Browser Source:</strong> Taille recommandée <code className="px-1 py-0.5 bg-muted rounded text-xs">1920×1080</code>.
          Cochez "Shutdown source when not visible" pour économiser les ressources.
          Les overlays utilisent des fonds transparents (sauf Test).
        </AlertDescription>
      </Alert>

      {/* Overlays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {overlays.map((overlay) => (
          <Card key={overlay.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2 mb-2">
                <CardTitle className="text-lg">{overlay.title}</CardTitle>
                <Badge variant="outline" className={`${typeColors[overlay.type]} border`}>
                  {overlay.type}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {overlay.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3">
              {/* Features */}
              <div className="space-y-1">
                {overlay.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* URL */}
              <div className="mt-auto pt-3 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-muted rounded text-xs truncate">
                    {getFullUrl(overlay.path)}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => copyToClipboard(overlay.id, overlay.path)}
                    title="Copy URL"
                  >
                    <Copy className={`h-3.5 w-3.5 ${copiedId === overlay.id ? "text-green-500" : ""}`} />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(overlay.path, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Open Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-muted-foreground">
        <p>
          Les overlays sont contrôlés depuis le{" "}
          <a href="/dashboard" className="text-primary hover:underline">
            Dashboard
          </a>
          . Assurez-vous que le backend et le WebSocket hub (port 3003) sont actifs.
        </p>
      </div>
    </div>
  );
}
