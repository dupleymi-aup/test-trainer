"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, ListChecks, Dumbbell, BarChart3, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";

const ONBOARDING_KEY = "test-trainer-onboarding-done";
const REPLAY_EVENT = "replay-onboarding";

export function Onboarding() {
  const t = useTranslations("onboarding");
  const [_forcedOpen, setForcedOpen] = useState(false);
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  const steps = useMemo(() => [
    {
      icon: <Sparkles className="h-8 w-8 text-emerald-600" />,
      title: t("step1Title"),
      description: t("step1Desc"),
    },
    {
      icon: <ListChecks className="h-8 w-8 text-teal-600" />,
      title: t("step2Title"),
      description: t("step2Desc"),
    },
    {
      icon: <Dumbbell className="h-8 w-8 text-amber-600 dark:text-amber-400" />,
      title: t("step3Title"),
      description: t("step3Desc"),
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: t("step4Title"),
      description: t("step4Desc"),
    },
    {
      icon: <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
      title: t("step5Title"),
      description: t("step5Desc"),
    },
  ], [t]);

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(ONBOARDING_KEY);
      setForcedOpen(true);
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(REPLAY_EVENT, handler);
    return () => window.removeEventListener(REPLAY_EVENT, handler);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setForcedOpen(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DialogHeader>
              <div className="flex justify-center mb-2">{current.icon}</div>
              <DialogTitle className="text-center">{current.title}</DialogTitle>
              <DialogDescription className="text-center text-sm leading-relaxed">
                {current.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-1.5 mt-4 mb-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-6 bg-emerald-500 dark:bg-emerald-400"
                      : i < step
                        ? "w-1.5 bg-emerald-300 dark:bg-emerald-700"
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleSkip}
              >
                {t("skip")}
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleNext}
              >
                {isLast ? t("start") : t("next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
