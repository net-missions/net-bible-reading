import { useState, useEffect } from "react";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("visible"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 3400);
    const completeTimer = setTimeout(() => onComplete(), 4000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-[600ms] ease-in-out ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#f4f4f1" }}
    >
      <div
        className={`relative flex flex-col items-center px-8 max-w-md text-center transition-all duration-[800ms] ease-out ${
          phase === "enter"
            ? "opacity-0 translate-y-4 scale-95"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        {/* Quote */}
        <p
          className="text-xl md:text-2xl leading-relaxed mb-5 italic"
          style={{
            color: "#1C1917",
            fontFamily: "'Google Sans Flex', Georgia, serif",
            fontWeight: 400,
            letterSpacing: "-0.01em",
          }}
        >
          "Thy word is a lamp unto my feet, and a light unto my path."
        </p>

        {/* Scripture reference */}
        <span
          className="text-sm font-bold tracking-[0.15em] uppercase"
          style={{ color: "#A62828" }}
        >
          Psalm 119:105
        </span>

        {/* Subtle progress bar */}
        <div className="mt-8 w-24 h-[2px] bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: "#A62828",
              animation: "splashProgress 3.4s ease-in-out forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
