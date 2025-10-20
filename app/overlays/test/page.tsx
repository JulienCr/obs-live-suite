"use client";

/**
 * Test page to verify overlay is loaded
 */
export default function OverlayTestPage() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white p-8">
        <h1 className="text-4xl font-bold mb-4">✅ Overlay System Working</h1>
        <p className="text-xl mb-2">If you see this, the overlay pages are loading correctly.</p>
        <p className="text-sm opacity-75">Actual overlays are transparent until triggered from dashboard.</p>
      </div>
    </div>
  );
}

