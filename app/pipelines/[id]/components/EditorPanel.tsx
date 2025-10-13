"use client";

export default function EditorPanel() {
  return (
    <div className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center">
      <div className="text-center text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <p className="text-sm font-medium">No node selected</p>
        <p className="text-xs mt-2">Click on a node to edit details</p>
      </div>
    </div>
  );
}
