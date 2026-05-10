import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: Route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle mint glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.3), transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Compass className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1
            className="text-7xl font-bold tracking-tighter"
            style={{
              fontFamily: '"Major Mono Display", "Space Mono", ui-monospace, monospace',
              color: 'hsl(var(--primary))',
              textShadow: '0 0 24px hsla(153, 100%, 80%, 0.4)',
            }}
          >
            404
          </h1>
          <h2 className="text-xl font-semibold text-foreground">Lost in space</h2>
          <p className="text-sm text-muted-foreground">
            The page you're looking for drifted off into the void.
          </p>
          <p className="text-xs text-muted-foreground/60 font-mono mt-2 break-all">
            {location.pathname}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
