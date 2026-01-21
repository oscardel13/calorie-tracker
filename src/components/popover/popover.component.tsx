type PopoverType = {
  closeTrigger: () => void;
  children: React.ReactNode;
};

const Popover = ({ closeTrigger, children }: PopoverType) => {
  return (
    <div
      className="fixed flex items-center justify-center top-0 left-0 w-full h-screen z-50"
      onClick={closeTrigger} // Trigger close when clicking outside
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative p-10 rounded-lg bg-gray-400 border border-gray-600 shadow-lg"
      >
        {children}
        {/* Close button */}
      </div>
    </div>
  );
};

export default Popover;
