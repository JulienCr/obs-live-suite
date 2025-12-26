export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
}
