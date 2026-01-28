'use client';

import * as React from 'react';

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface CollapsibleTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

const CollapsibleContext = React.createContext<{
  open: boolean;
  toggle: () => void;
}>({ open: false, toggle: () => {} });

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const toggle = React.useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!open);
    } else {
      setUncontrolledOpen(!open);
    }
  }, [isControlled, open, onOpenChange]);

  return (
    <CollapsibleContext.Provider value={{ open, toggle }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({ asChild, children }: CollapsibleTriggerProps) {
  const { toggle } = React.useContext(CollapsibleContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: toggle,
    });
  }

  return (
    <button type="button" onClick={toggle}>
      {children}
    </button>
  );
}

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open } = React.useContext(CollapsibleContext);

  if (!open) return null;

  return <div className={className}>{children}</div>;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
