"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let modalRoot = document.getElementById("modal-root");

    if (!modalRoot) {
      modalRoot = document.createElement("div");
      modalRoot.id = "modal-root";
      modalRoot.style.position = "fixed";
      modalRoot.style.top = "0";
      modalRoot.style.left = "0";
      modalRoot.style.width = "100%";
      modalRoot.style.height = "100%";
      modalRoot.style.zIndex = "2147483647";

      document.body.appendChild(modalRoot);
    }

    setRoot(modalRoot);
    setMounted(true);
  }, []);

  if (!mounted || !root) return null;

  return createPortal(children, root);
}
