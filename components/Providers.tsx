'use client';

import { SessionProvider } from "next-auth/react";
import { DialogProvider } from "./ui/Dialogs";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DialogProvider>{children}</DialogProvider>
    </SessionProvider>
  );
}
