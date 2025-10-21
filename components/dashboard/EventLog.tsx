"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";

interface LogEvent {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
}

/**
 * EventLog - Display recent actions for audit
 */
export function EventLog() {
  // TODO: Load from API and update in real-time
  const [events] = useState<LogEvent[]>([
    {
      id: "1",
      timestamp: new Date("2024-01-01T12:00:00Z"), // Fixed timestamp to prevent hydration mismatch
      action: "Lower Third Shown",
      details: "John Doe - Host",
    },
  ]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Event Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 text-sm border-b pb-2"
                >
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatTime(event.timestamp)}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{event.action}</div>
                    <div className="text-muted-foreground">{event.details}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No events yet
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

