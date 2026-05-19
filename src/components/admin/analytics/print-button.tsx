"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = "Печать отчёта" }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="print:hidden"
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
